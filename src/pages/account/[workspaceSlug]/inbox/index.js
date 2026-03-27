import { useMemo, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import AccountLayout from '@/layouts/AccountLayout';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';
import ConversationList from '@/sections/inbox/ConversationList';
import ChatWindow from '@/sections/inbox/ChatWindow';
import OnboardingTour from '@/components/Onboarding/OnboardingTour';
import api from '@/lib/common/api';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const Inbox = () => {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { data: session } = useSession();
  const { workspaceSlug } = router.query;
  const [selectedId, setSelectedId] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchText, setSearchText] = useState('');
  const [messageText, setMessageText] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isSummarizingAI, setIsSummarizingAI] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [aiOverageOptIn, setAiOverageOptIn] = useState(false);
  const [aiObjective, setAiObjective] = useState('');
  const [aiSuggestOnlyEnabled, setAiSuggestOnlyEnabled] = useState(true);
  const [isTogglingAutopilot, setIsTogglingAutopilot] = useState(false);

  const locale = useMemo(() => {
    const base = (i18n?.language || 'en').split('-')[0];
    if (base === 'pt') return 'pt-BR';
    return base;
  }, [i18n?.language]);

  // Fetch conversations
  const { data: conversationsData, mutate: mutateConversations } = useSWR(
    workspaceSlug
      ? `/api/workspace/${workspaceSlug}/inbox?assigneeId=${filterAssignee}&status=${filterStatus}&search=${searchText}`
      : null,
    api
  );

  // Fetch members for assignment
  const { data: membersData } = useSWR(
    workspaceSlug ? `/api/workspace/${workspaceSlug}/members` : null,
    api
  );

  // Fetch individual conversation detail (Full history)
  const { data: conversationData, mutate: mutateConversation } = useSWR(
    workspaceSlug && selectedId
      ? `/api/workspace/${workspaceSlug}/inbox/${selectedId}`
      : null,
    api,
    { refreshInterval: selectedId ? 3000 : 0 }
  );

  // Fetch templates
  const { data: templatesData, mutate: mutateTemplates } = useSWR(
    workspaceSlug ? `/api/workspace/${workspaceSlug}/inbox/templates` : null,
    api
  );

  const { data: paymentProductsData } = useSWR(
    workspaceSlug ? `/api/workspace/${workspaceSlug}/payment-products?active=true` : null,
    api
  );

  const { data: whatsappAnalytics } = useSWR(
    workspaceSlug ? `/api/workspace/${workspaceSlug}/analytics?scope=whatsapp` : null,
    api
  );

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    if (!workspaceSlug) return;
    try {
      const v = localStorage.getItem(`aiOverageOptIn:${workspaceSlug}`);
      setAiOverageOptIn(v === 'true');
    } catch { }
  }, [mounted, workspaceSlug]);

  const conversations = useMemo(() => conversationsData?.data?.conversations || [], [conversationsData]);
  const members = useMemo(() => membersData?.data?.members || [], [membersData]);
  const templates = useMemo(() => templatesData?.data?.templates || [], [templatesData]);
  const paymentProducts = useMemo(() => paymentProductsData?.data?.products || [], [paymentProductsData]);

  const messageTotals = whatsappAnalytics?.messageTotals || { inbound: 0, outbound: 0, total: 0 };

  const whatsappTrendChart = useMemo(() => {
    const format = (iso) => {
      if (!iso) return '';
      const d = new Date(iso);
      return d.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
    };
    const trend = whatsappAnalytics?.messageTrend || [];
    return trend.map((d) => ({
      day: format(d.date),
      inbound: d.inbound || 0,
      outbound: d.outbound || 0,
      total: d.total || 0,
    }));
  }, [locale, whatsappAnalytics?.messageTrend]);

  const CountUp = ({ value, durationMs = 900, className = '', enabled = true }) => {
    const [current, setCurrent] = useState(0);

    useEffect(() => {
      if (!enabled) return;
      const target = Number(value || 0);
      const start = performance.now();
      let raf = 0;

      const tick = (now) => {
        const t = Math.min(1, (now - start) / durationMs);
        const eased = 1 - Math.pow(1 - t, 3);
        setCurrent(Math.round(eased * target));
        if (t < 1) raf = requestAnimationFrame(tick);
      };

      raf = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(raf);
    }, [durationMs, enabled, value]);

    return <span className={className}>{current}</span>;
  };

  useEffect(() => {
    if (selectedId && conversationData?.data?.conversation) {
      setSelectedConversation(conversationData.data.conversation);
    } else if (selectedId && conversations.length > 0) {
      // Fallback to list version while loading detail
      const conv = conversations.find((c) => c.id === selectedId);
      if (conv) setSelectedConversation(conv);
    } else {
      setSelectedConversation(null);
    }
  }, [selectedId, conversationData, conversations]);

  useEffect(() => {
    if (!mounted) return;
    if (!workspaceSlug) return;
    if (!selectedConversation?.id) return;

    const convId = selectedConversation.id;
    const defaultObjective = String(selectedConversation?.platform || '').toUpperCase() === 'EMAIL' ? 'support' : 'qualify';

    try {
      const rawObjective = localStorage.getItem(`aiObjective:${workspaceSlug}:${convId}`);
      setAiObjective(rawObjective || defaultObjective);
    } catch {
      setAiObjective(defaultObjective);
    }

    try {
      const rawMode = localStorage.getItem(`aiSuggestOnly:${workspaceSlug}:${convId}`);
      setAiSuggestOnlyEnabled(rawMode !== 'false');
    } catch {
      setAiSuggestOnlyEnabled(true);
    }
  }, [mounted, selectedConversation?.id, selectedConversation?.platform, workspaceSlug]);

  const handleGenerateResponse = async (opts = {}) => {
    if (!selectedConversation) return;

    setIsGeneratingAI(true);
    try {
      const objectiveToUse = String(opts?.objective || aiObjective || '').trim() || (String(selectedConversation?.platform || '').toUpperCase() === 'EMAIL' ? 'support' : 'qualify');

      const response = await api(`/api/workspace/${workspaceSlug}/inbox/${selectedConversation.id}/suggest-reply`, {
        method: 'POST',
        headers: aiOverageOptIn ? { 'x-ai-overage': 'true' } : undefined,
        body: { objective: objectiveToUse },
      });

      if (response.status >= 400 || response.error) {
        const msg = response?.error?.msg || '';
        const overage = response?.error?.overage;
        if (msg === 'LIMIT_REACHED' && overage?.enabled) {
          const price = overage?.pricePer1M ? Number(overage.pricePer1M) : null;
          const confirmation = window.confirm(
            t('inbox.ai.overagePrompt', { price: price != null ? String(price) : '' })
          );
          if (confirmation) {
            try {
              localStorage.setItem(`aiOverageOptIn:${workspaceSlug}`, 'true');
            } catch { }
            setAiOverageOptIn(true);
            const retry = await api(`/api/workspace/${workspaceSlug}/inbox/${selectedConversation.id}/suggest-reply`, {
              method: 'POST',
              headers: { 'x-ai-overage': 'true' },
              body: { objective: objectiveToUse },
            });
            if (retry.data?.suggestion) {
              setMessageText(retry.data.suggestion);
              if (retry.data?.quota?.tokens?.warn) {
                const r = retry.data?.quota?.tokens?.remaining;
                const l = retry.data?.quota?.tokens?.limit;
                toast(t('inbox.ai.quotaWarning', { remaining: String(r ?? ''), limit: String(l ?? '') }));
              }
              toast.success(t('inbox.ai.generated'));
              return;
            }
          }
        }

        toast.error(response?.error?.details || t('inbox.ai.failed'));
        return;
      }

      if (response.data?.suggestion) {
        setMessageText(response.data.suggestion);
        if (response.data?.quota?.tokens?.warn) {
          const r = response.data?.quota?.tokens?.remaining;
          const l = response.data?.quota?.tokens?.limit;
          toast(t('inbox.ai.quotaWarning', { remaining: String(r ?? ''), limit: String(l ?? '') }));
        }
        toast.success(t('inbox.ai.generated'));
      }
    } catch (error) {
      console.error(error);
      toast.error(t('inbox.ai.failed'));
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleChangeAiObjective = (objective) => {
    if (!workspaceSlug || !selectedConversation?.id) return;
    const v = String(objective || '').trim();
    setAiObjective(v);
    try {
      localStorage.setItem(`aiObjective:${workspaceSlug}:${selectedConversation.id}`, v);
    } catch { }
  };

  const handleToggleSuggestOnly = (enabled) => {
    if (!workspaceSlug || !selectedConversation?.id) return;
    const next = Boolean(enabled);
    setAiSuggestOnlyEnabled(next);
    try {
      localStorage.setItem(`aiSuggestOnly:${workspaceSlug}:${selectedConversation.id}`, String(next));
    } catch { }
  };

  const handleSummarizeConversation = async () => {
    if (!selectedConversation) return null;

    setIsSummarizingAI(true);
    try {
      const response = await api(`/api/workspace/${workspaceSlug}/inbox/${selectedConversation.id}/summarize`, {
        method: 'POST',
        headers: aiOverageOptIn ? { 'x-ai-overage': 'true' } : undefined,
      });

      if (response.status >= 400 || response.error) {
        const msg = response?.error?.msg || '';
        const overage = response?.error?.overage;
        if (msg === 'LIMIT_REACHED' && overage?.enabled) {
          const price = overage?.pricePer1M ? Number(overage.pricePer1M) : null;
          const confirmation = window.confirm(
            t('inbox.ai.overagePrompt', { price: price != null ? String(price) : '' })
          );
          if (confirmation) {
            try {
              localStorage.setItem(`aiOverageOptIn:${workspaceSlug}`, 'true');
            } catch { }
            setAiOverageOptIn(true);
            const retry = await api(`/api/workspace/${workspaceSlug}/inbox/${selectedConversation.id}/summarize`, {
              method: 'POST',
              headers: { 'x-ai-overage': 'true' },
            });
            if (retry.data?.summary) {
              if (retry.data?.quota?.tokens?.warn) {
                const r = retry.data?.quota?.tokens?.remaining;
                const l = retry.data?.quota?.tokens?.limit;
                toast(t('inbox.ai.quotaWarning', { remaining: String(r ?? ''), limit: String(l ?? '') }));
              }
              toast.success(t('inbox.ai.summaryGenerated'));
              return retry.data.summary;
            }
          }
        }

        toast.error(response?.error?.details || t('inbox.ai.summaryFailed'));
        return null;
      }

      if (response.data?.summary) {
        if (response.data?.quota?.tokens?.warn) {
          const r = response.data?.quota?.tokens?.remaining;
          const l = response.data?.quota?.tokens?.limit;
          toast(t('inbox.ai.quotaWarning', { remaining: String(r ?? ''), limit: String(l ?? '') }));
        }
        toast.success(t('inbox.ai.summaryGenerated'));
        return response.data.summary;
      }

      toast.error(t('inbox.ai.summaryFailed'));
      return null;
    } catch (error) {
      console.error(error);
      toast.error(t('inbox.ai.summaryFailed'));
      return null;
    } finally {
      setIsSummarizingAI(false);
    }
  };

  const handleSendMessage = async (content) => {
    if (!selectedConversation) return;

    const previousConversations = [...conversations];
    const previousDetail = detailData ? { ...detailData } : null;

    // Optimistic update
    const newMessage = {
      id: `temp-${Date.now()}`,
      content,
      direction: 'OUTBOUND',
      createdAt: new Date().toISOString(),
      status: 'SENDING',
    };

    const updatedConversation = {
      ...selectedConversation,
      messages: [...(selectedConversation.messages || []), newMessage],
      lastMessage: content,
      updatedAt: new Date().toISOString(),
    };

    // Update List Cache
    mutateConversations({
      data: {
        conversations: (conversations || []).map((c) =>
          c.id === selectedId ? updatedConversation : c
        )
      }
    }, false);

    // Update Detail Cache
    mutateConversation({
      data: {
        conversation: updatedConversation
      }
    }, false);

    // Update local state directly for immediate UI reaction
    setSelectedConversation(updatedConversation);

    try {
      const response = await api(`/api/workspace/${workspaceSlug}/inbox/${selectedConversation.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          direction: 'OUTBOUND',
          type: selectedConversation.platform === 'EMAIL' ? 'EMAIL' : 'TEXT',
        }),
      });

      const serverMessage = response?.data?.message;
      if (serverMessage) {
        // Create final conversation state with the real server message instead of temp one
        const finalConversation = {
          ...selectedConversation,
          messages: [
            ...(selectedConversation.messages || []).filter(m => !m.id.startsWith('temp-')),
            serverMessage
          ],
          lastMessage: content,
          updatedAt: new Date().toISOString(),
        };

        // Update caches with REAL data and no revalidation (to prevent flickering)
        mutateConversations({
          data: {
            conversations: (conversations || []).map((c) =>
              c.id === selectedId ? finalConversation : c
            )
          }
        }, false);

        mutateConversation({
          data: {
            conversation: finalConversation
          }
        }, false);

        setSelectedConversation(finalConversation);
      } else {
        // Fallback revalidate if response was unexpected
        mutateConversations();
        mutateConversation();
      }
    } catch (error) {
      console.error(error);
      toast.error(t('inbox.message.sendFailed'));
      // Rollback both
      mutateConversations({ data: { conversations: previousConversations } }, false);
      if (previousDetail) mutateConversation(previousDetail, false);
    }
  };

  const handleAssign = async (assigneeId) => {
    if (!selectedConversation) return;

    try {
      await api(`/api/workspace/${workspaceSlug}/inbox/${selectedConversation.id}`, {
        method: 'PUT',
        body: { assigneeId },
      });
      toast.success(t('inbox.assignee.assigned'));
      mutateConversations();
      mutateConversation();
    } catch (error) {
      console.error(error);
      toast.error(t('inbox.assignee.assignFailed'));
    }
  };

  const handleToggleAutopilot = async (enabled) => {
    if (!selectedConversation) return;
    if (!workspaceSlug) return;

    const previousConversations = [...conversations];
    setIsTogglingAutopilot(true);

    mutateConversations({
      data: {
        conversations: conversations.map((c) =>
          c.id === selectedId ? { ...c, autopilotEnabled: enabled } : c
        )
      }
    }, false);

    try {
      await api(`/api/workspace/${workspaceSlug}/inbox/${selectedConversation.id}`, {
        method: 'PUT',
        body: { autopilotEnabled: enabled },
      });
      toast.success(t('inbox.autopilot.updated'));
      mutateConversations();
      mutateConversation();
    } catch (error) {
      console.error(error);
      toast.error(t('inbox.autopilot.updateFailed'));
      mutateConversations({ data: { conversations: previousConversations } }, false);
    } finally {
      setIsTogglingAutopilot(false);
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
      element: '#chat-window',
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
        <div className="fixed inset-0 z-[50] flex flex-col h-screen w-screen bg-white dark:bg-zinc-950 overflow-hidden">


          {(conversationsData === undefined && !!workspaceSlug) ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-zinc-950">
              <div className="w-12 h-12 border-4 border-zinc-200 dark:border-zinc-800 border-t-brand-600 rounded-full animate-spin mb-4"></div>
              <p className="text-zinc-500 dark:text-zinc-400 font-medium tracking-wide italic text-sm">Sincronizando comunicações...</p>
            </div>
          ) : (
            <div className="flex flex-1 overflow-hidden bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800">
              {/* Column 1: Global Small Sidebar (WhatsApp Web style) */}
              <div className="hidden sm:flex flex-col items-center py-6 w-[70px] bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-100 dark:border-zinc-800 shrink-0">
                <div className="flex flex-col items-center gap-6 w-full">
                  <Link
                    href={`/account/${workspaceSlug}`}
                    className="p-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-zinc-400 hover:text-brand-600 dark:hover:text-brand-400 hover:scale-105 transition-all shadow-sm"
                    title="Dashboard"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
                  </Link>
                  <button 
                    className="p-3 bg-brand-600/10 rounded-2xl border border-brand-500/20 text-brand-600 dark:text-brand-400 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                    title="Inbox"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0l-8 4-8-4"/></svg>
                  </button>
                  <Link
                    href={`/account/${workspaceSlug}/settings`}
                    className="p-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 text-zinc-400 hover:text-brand-600 dark:hover:text-brand-400 hover:scale-105 transition-all shadow-sm"
                    title="Settings"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </Link>
                </div>
                <div className="mt-auto">
                  <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 font-bold flex items-center justify-center text-zinc-500">
                    {session?.user?.name?.charAt(0) || 'U'}
                  </div>
                </div>
              </div>

              {/* Column 2: Chat List */}
              <div
                id="conversation-list"
                className={`${selectedId ? 'hidden sm:flex' : 'flex'} h-full flex-shrink-0 w-full sm:w-[320px] md:w-[350px] lg:w-[380px] border-r border-zinc-100 dark:border-zinc-800 shadow-sm z-10 flex-col`}
              >
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
                />
              </div>
              <div id="chat-window" className={`${selectedId ? 'block' : 'hidden md:block'} flex-1 min-w-0 h-full`}>
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
                  isTogglingAutopilot={isTogglingAutopilot}
                  onBack={() => setSelectedId(null)}
                />
              </div>
            </div>
          )}
        </div>
      </Content>
    </AccountLayout>
  );
};

export default Inbox;
