import React, { useState, useEffect, Fragment, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import useSWR, { mutate } from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, Transition, Menu } from '@headlessui/react';
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  SparklesIcon,
  ChevronDownIcon,
  CheckIcon,
  UserCircleIcon,
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import AccountLayout from '@/layouts/AccountLayout';
import Content from '@/components/Content';
import Meta from '@/components/Meta';
import { useTranslation } from 'react-i18next';
import api from '@/lib/common/api';
import classNames from 'classnames';
import ChatWindow from '@/sections/inbox/ChatWindow';
import ConversationList from '@/sections/inbox/ConversationList';
import OnboardingTour from '@/components/Onboarding/OnboardingTour';

const Inbox = () => {
  const router = useRouter();
  const { workspaceSlug } = router.query;
  const { data: session } = useSession();
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState(null);
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [filterStatus, setFilterStatus] = useState('OPEN');
  const [searchText, setSearchText] = useState('');
  const [messageText, setMessageText] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isSummarizingAI, setIsSummarizingAI] = useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState('');
  const [newChatTemplate, setNewChatTemplate] = useState('');
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [aiOverageOptIn, setAiOverageOptIn] = useState(false);
  const [aiObjective, setAiObjective] = useState('qualify');
  const [aiSuggestOnlyEnabled, setAiSuggestOnlyEnabled] = useState(true);
  const [showAiDebug, setShowAiDebug] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [isLoadingDiagnostics, setIsLoadingDiagnostics] = useState(false);
  const [aiDiagnostics, setAiDiagnostics] = useState(null);
  const [isTestingAi, setIsTestingAi] = useState(false);
  const [aiTestResult, setAiTestResult] = useState(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: conversationsData, error: conversationsError, mutate: mutateConversations } = useSWR(
    workspaceSlug ? `/api/workspace/${workspaceSlug}/inbox` : null
  );

  const { data: membersData } = useSWR(
    workspaceSlug ? `/api/workspace/${workspaceSlug}/members` : null
  );

  const { data: workspaceData } = useSWR(
    workspaceSlug ? `/api/workspace/${workspaceSlug}` : null
  );

  const { data: templatesData } = useSWR(
    workspaceSlug ? `/api/workspace/${workspaceSlug}/integrations/whatsapp/templates` : null
  );

  const { data: productsData } = useSWR(
    workspaceSlug ? `/api/workspace/${workspaceSlug}/payment-products` : null
  );

  const conversations = conversationsData?.data?.conversations || [];
  const members = membersData?.data?.members || [];
  const templates = templatesData?.data?.templates || [];
  const paymentProducts = productsData?.data?.products || [];

  const selectedConversation = useMemo(() => 
    conversations.find((c) => c.id === selectedId),
    [conversations, selectedId]
  );

  const handleSendMessage = async (content, type = 'TEXT', metadata = null) => {
    if (!workspaceSlug || !selectedId) return;

    try {
      const res = await api(`/api/workspace/${workspaceSlug}/inbox/${selectedId}/messages`, {
        method: 'POST',
        body: { content, type, metadata },
      });

      if (res.status === 200 || res.status === 201) {
        mutateConversations();
        setMessageText('');
      } else {
        toast.error(res.error?.msg || 'Failed to send message');
      }
    } catch (error) {
      toast.error('Connection error');
    }
  };

  const handleAssign = async (assigneeId) => {
    if (!workspaceSlug || !selectedId) return;

    try {
      const res = await api(`/api/workspace/${workspaceSlug}/inbox/${selectedId}/assign`, {
        method: 'POST',
        body: { assigneeId },
      });

      if (res.status === 200) {
        mutateConversations();
        toast.success(t('common.success'));
      }
    } catch (error) {
      toast.error('Failed to assign');
    }
  };

  const handleFetchDiagnostics = async () => {
    setIsLoadingDiagnostics(true);
    try {
      const res = await api(`/api/workspace/${workspaceSlug}/inbox/ai-diagnostics`);
      if (res.status === 200) {
        setAiDiagnostics(res.data);
      }
    } catch (error) {
      toast.error("Erro ao carregar diagnósticos");
    } finally {
      setIsLoadingDiagnostics(false);
    }
  };

  const handleLiveAiTest = async () => {
    setIsTestingAi(true);
    setAiTestResult(null);
    try {
      const res = await api(`/api/workspace/${workspaceSlug}/inbox/ai-live-test`, {
        method: 'POST'
      });
      if (res.status === 200) {
        setAiTestResult(res.data);
      }
    } catch (error) {
      toast.error("Erro no teste de IA");
    } finally {
      setIsTestingAi(false);
    }
  };

  const handleSimulateInbound = async () => {
    if (!selectedId) return;
    setIsLoadingDiagnostics(true);
    try {
      await api(`/api/workspace/${workspaceSlug}/inbox/${selectedId}/simulate-inbound`, {
        method: 'POST'
      });
      toast.success("Mensagem simulada!");
      mutateConversations();
      setTimeout(handleFetchDiagnostics, 2000);
    } catch (error) {
      toast.error("Falha na simulação");
    } finally {
      setIsLoadingDiagnostics(false);
    }
  };

  const handleSummarizeConversation = async () => {
    if (!selectedId) return;
    setIsSummarizingAI(true);
    try {
      const res = await api(`/api/workspace/${workspaceSlug}/inbox/${selectedId}/summarize`, {
        method: 'POST'
      });
      if (res.status === 200) {
        toast.success("Resumo gerado!");
        mutateConversations();
      }
    } catch (error) {
      toast.error("Erro ao gerar resumo");
    } finally {
      setIsSummarizingAI(false);
    }
  };

  const handleGenerateResponse = async () => {
    if (!selectedId) return;
    setIsGeneratingAI(true);
    try {
      const res = await api(`/api/workspace/${workspaceSlug}/inbox/${selectedId}/generate-response`, {
        method: 'POST'
      });
      if (res.status === 200 && res.data?.suggestion) {
        setMessageText(res.data.suggestion);
      }
    } catch (error) {
      toast.error("Erro ao gerar sugestão de IA");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleChangeAiObjective = async (objective) => {
    setAiObjective(objective);
    // Persist objective to workspace
    try {
      await api(`/api/workspace/${workspaceSlug}/settings/ai`, {
        method: 'POST',
        body: { aiObjective: objective }
      });
    } catch(e) {}
  };

  const handleToggleSuggestOnly = async (enabled) => {
    setAiSuggestOnlyEnabled(enabled);
    try {
      await api(`/api/workspace/${workspaceSlug}/settings/ai`, {
        method: 'POST',
        body: { aiSuggestOnlyEnabled: enabled }
      });
    } catch(e) {}
  };

  const [isTogglingAutopilot, setIsTogglingAutopilot] = useState(false);
  const handleToggleAutopilot = async (enabled) => {
    if (!selectedId) return;
    setIsTogglingAutopilot(true);
    try {
      const res = await api(`/api/workspace/${workspaceSlug}/inbox/${selectedId}/autopilot`, {
        method: 'POST',
        body: { enabled }
      });
      if (res.status === 200) {
        mutateConversations();
        toast.success(enabled ? "Autopilot Ativado" : "Modo Manual Ativado");
      }
    } catch (error) {
      toast.error("Erro ao alterar modo");
    } finally {
      setIsTogglingAutopilot(false);
    }
  };

  const handleStartChat = async (e) => {
    e.preventDefault();
    if (!workspaceSlug || !newChatPhone || !newChatTemplate) return;

    setIsStartingChat(true);
    try {
      const response = await api(`/api/workspace/${workspaceSlug}/inbox/start-chat`, {
        method: 'POST',
        body: {
          phone: newChatPhone,
          templateName: newChatTemplate,
        },
      });

      if (response.status >= 400 || response.error) {
        throw new Error(response.error?.details || response.error?.msg || 'Failed to start chat');
      }

      toast.success(t('inbox.ai.generated') || 'Chat started successfully');
      setIsNewChatModalOpen(false);
      setNewChatPhone('');
      
      if (response.data?.conversationId) {
        setSelectedId(response.data.conversationId);
      }
      
      mutateConversations();
    } catch (error) {
      console.error(error);
      toast.error(error.message);
    } finally {
      setIsStartingChat(false);
    }
  };

  const inboxSteps = [
    {
      element: '#conversation-list',
      popover: {
        title: t('onboarding.tour.inbox.step1.title'),
        description: t('onboarding.tour.inbox.step1.desc'),
        position: 'right',
      }
    },
    {
      element: '#chat-window-container',
      popover: {
        title: t('onboarding.tour.inbox.step2.title'),
        description: t('onboarding.tour.inbox.step2.desc'),
        position: 'left',
      }
    },
    {
      element: '#ai-suggest-btn',
      popover: {
        title: t('onboarding.tour.inbox.step3.title'),
        description: t('onboarding.tour.inbox.step3.desc'),
        position: 'top',
      }
    },
    {
      element: '#ai-summarize-btn',
      popover: {
        title: 'Resumo IA',
        description: 'Clique aqui para gerar um resumo executivo de toda a conversa em segundos.',
        position: 'top',
      }
    }
  ];

  return (
    <AccountLayout full={true} immersive={true}>
      <OnboardingTour tourId="inbox-tour" steps={inboxSteps} />
      <Meta title={t('Inbox')} />
      <Content full={true}>
        <div className="flex flex-col h-full w-full bg-white dark:bg-zinc-950 overflow-hidden relative">
          {(conversationsData === undefined && !conversationsError && !!workspaceSlug) ? (
            <div className="flex-1 flex items-center justify-center bg-white dark:bg-zinc-950">
              <div className="flex flex-col items-center space-y-6 animate-pulse">
                <div className="relative w-24 h-24">
                  <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full" />
                  <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin" />
                  <div className="absolute inset-4 border-4 border-indigo-400/20 rounded-full" />
                  <div className="absolute inset-4 border-4 border-indigo-400 rounded-full border-b-transparent animate-spin-reverse" />
                </div>
                <div className="space-y-2 text-center">
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Loading Intelligence</h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">Personalizing your experience...</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 overflow-hidden">
              {/* Column 1: Shortcuts */}
              <div className="hidden lg:flex flex-col w-24 bg-white dark:bg-zinc-950 border-r border-zinc-100 dark:border-zinc-900/50 items-center py-10 z-20 shrink-0">
                <div className="mb-auto space-y-8">
                   <Link
                    href={`/account/${workspaceSlug}/settings/general`}
                    className="group relative p-4 bg-zinc-50 dark:bg-zinc-900 rounded-[22px] border border-zinc-100 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 hover:text-indigo-600 dark:hover:text-white hover:border-indigo-500/50 hover:shadow-glow-indigo/20 transition-all duration-500"
                    title="Intelligence Settings"
                  >
                    <svg className="w-6 h-6 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </Link>
                </div>
                <div className="mt-auto pb-8">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-white/5 blur-xl group-hover:bg-white/10 transition-all rounded-full" />
                    <div className="relative w-12 h-12 rounded-[18px] bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 font-executive font-black flex items-center justify-center text-zinc-900 dark:text-white shadow-2xl transition-transform group-hover:scale-105">
                      {session?.user?.name?.charAt(0) || 'U'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Column 2: Chat List */}
              <div
                id="conversation-list"
                className={`${selectedId ? 'hidden md:flex' : 'flex'} h-full flex-shrink-0 w-full md:w-[340px] lg:w-[380px] xl:w-[420px] bg-white dark:bg-zinc-950 border-r border-zinc-100 dark:border-zinc-900 shadow-premium-sm z-10 flex-col relative`}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-zinc-50/30 to-transparent pointer-events-none" />
                
                {/* New Conversation Button */}
                <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-900 flex items-center gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsNewChatModalOpen(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 dark:bg-zinc-950 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-glow-indigo transition-all italic"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Nova Conversa
                  </motion.button>
                </div>

                <div className="relative flex-1 flex flex-col">
                  <ConversationList
                    conversations={conversations}
                    selectedId={selectedId}
                    onSelect={(conv) => setSelectedId(conv.id)}
                    filterAssignee={filterAssignee}
                    setFilterAssignee={setFilterAssignee}
                    filterStatus={filterStatus}
                    setFilterStatus={setFilterStatus}
                    searchText={searchText}
                    setSearchText={setSearchText}
                    members={members}
                    user={session?.user}
                    isSuperAdmin={session?.user?.role === 'SUPERADMIN'}
                    showAiDebug={showAiDebug}
                    onToggleAiDebug={setShowAiDebug}
                  />
                </div>
              </div>

              {/* Column 3: Chat Window */}
              <div 
                id="chat-window-container" 
                className={classNames(
                  "flex-1 min-w-0 h-full bg-white dark:bg-zinc-950 overflow-hidden",
                  selectedId ? "fixed inset-0 md:static md:inset-auto z-[60] md:z-auto" : "hidden md:block"
                )}
              >
                <ChatWindow
                  conversation={selectedConversation}
                  messages={selectedConversation?.messages || []}
                  onSendMessage={handleSendMessage}
                  members={members}
                  onAssign={handleAssign}
                  templates={templates}
                  paymentProducts={paymentProducts}
                  workspaceSlug={workspaceSlug}
                  messageText={messageText}
                  onMessageChange={setMessageText}
                  onGenerateResponse={handleGenerateResponse}
                  isGeneratingAI={isGeneratingAI}
                  onSummarizeConversation={handleSummarizeConversation}
                  isSummarizingAI={isSummarizingAI}
                  aiObjective={aiObjective}
                  onAiObjectiveChange={handleChangeAiObjective}
                  aiSuggestOnlyEnabled={aiSuggestOnlyEnabled}
                  onAiSuggestOnlyEnabledChange={handleToggleSuggestOnly}
                  onToggleAutopilot={handleToggleAutopilot}
                />
              </div>
            </div>
          )}
        </div>

        {/* New Conversation Modal */}
        <Transition appear show={isNewChatModalOpen} as={Fragment}>
          <Dialog as="div" className="relative z-[100]" onClose={() => !isStartingChat && setIsNewChatModalOpen(false)}>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm" />
            </Transition.Child>

            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-6 text-center">
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-400"
                  enterFrom="opacity-0 scale-95 translate-y-8"
                  enterTo="opacity-100 scale-100 translate-y-0"
                  leave="ease-in duration-300"
                  leaveFrom="opacity-100 scale-100 translate-y-0"
                  leaveTo="opacity-0 scale-95 translate-y-8"
                >
                  <Dialog.Panel className="w-full max-w-xl transform overflow-hidden rounded-[40px] bg-white dark:bg-zinc-900 p-12 text-left align-middle shadow-premium transition-all border border-zinc-100 dark:border-zinc-800">
                    <div className="mb-10 text-center">
                      <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-[32px] flex items-center justify-center mx-auto mb-6 border border-indigo-100/50 dark:border-indigo-500/20 shadow-glow-indigo/10">
                        <PlusIcon className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <Dialog.Title as="h3" className="text-3xl font-executive font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tighter uppercase italic">
                        Iniciar Nova Conversa
                      </Dialog.Title>
                      <p className="text-zinc-400 dark:text-zinc-500 font-medium mt-2 text-[15px] italic">Envie a primeira mensagem para um número de WhatsApp</p>
                    </div>

                    <form onSubmit={handleStartChat} className="space-y-8">
                      <div className="space-y-2.5">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] pl-1">WhatsApp (Número + DDI)</label>
                        <input
                          required
                          type="text"
                          className="w-full px-6 py-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-[22px] text-[15px] font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-8 focus:ring-indigo-500/5 focus:bg-white dark:focus:bg-zinc-800 focus:border-indigo-500/30 transition-all font-executive italic"
                          value={newChatPhone}
                          onChange={(e) => setNewChatPhone(e.target.value)}
                          placeholder="Ex: 5583988758839"
                        />
                      </div>
                      <div className="space-y-2.5">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] pl-1">Modelo de Mensagem (Template)</label>
                        <select
                          required
                          className="w-full px-6 py-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-[22px] text-[15px] font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-8 focus:ring-indigo-500/5 focus:bg-white dark:focus:bg-zinc-800 focus:border-indigo-500/30 transition-all font-executive italic appearance-none cursor-pointer"
                          value={newChatTemplate}
                          onChange={(e) => setNewChatTemplate(e.target.value)}
                        >
                          <option value="">Selecione um template registrado na Meta</option>
                          {templates.length > 0 ? (
                            templates.map((tpl) => (
                              <option key={tpl.id} value={tpl.name}>
                                {tpl.name}
                              </option>
                            ))
                          ) : (
                            <option value="hello_world">hello_world (Template de Teste)</option>
                          )}
                        </select>
                      </div>

                      <div className="flex items-center gap-4 pt-4">
                        <button
                          type="button"
                          onClick={() => setIsNewChatModalOpen(false)}
                          className="flex-1 px-8 py-5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-[28px] text-[12px] font-black uppercase tracking-[0.2em] hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all italic"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={isStartingChat || !newChatPhone || !newChatTemplate}
                          className="flex-[2] px-8 py-5 premium-gradient text-white rounded-[28px] text-[12px] font-black uppercase tracking-[0.2em] shadow-glow-indigo/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 italic"
                        >
                          {isStartingChat ? 'Enviando...' : 'Enviar Mensagem'}
                        </button>
                      </div>
                    </form>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>
      </Content>
    </AccountLayout>
  );
};

export default Inbox;
