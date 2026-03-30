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
import { motion, AnimatePresence } from 'framer-motion';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

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

import {
  CreditCardIcon,
  CalendarDaysIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  CameraIcon,
  FunnelIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

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
  const [aiObjective, setAiObjective] = useState('qualify');
  const [aiSuggestOnlyEnabled, setAiSuggestOnlyEnabled] = useState(true);
  const [isTogglingAutopilot, setIsTogglingAutopilot] = useState(false);
  const [showAiDebug, setShowAiDebug] = useState(false);
  const [aiDiagnostics, setAiDiagnostics] = useState(null);
  const [isLoadingDiagnostics, setIsLoadingDiagnostics] = useState(false);
  const [aiTestResult, setAiTestResult] = useState(null);
  const [isTestingAi, setIsTestingAi] = useState(false);

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
    const [current] = useState(0);

    useEffect(() => {
      if (!enabled) return;
      const target = Number(value || 0);
      const start = performance.now();
      let raf = 0;

      const tick = (now) => {
        const t = Math.min(1, (now - start) / durationMs);
        const eased = 1 - Math.pow(1 - t, 3);
        // setCurrent(Math.round(eased * target)); // This line was commented out in the original, but it's part of a CountUp component. Keeping it as is.
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

  const handleFetchDiagnostics = async () => {
    if (!workspaceSlug) return;
    setIsLoadingDiagnostics(true);
    try {
      const response = await api(`/api/workspace/${workspaceSlug}/debug/ai`);
      if (response.data?.diagnostics) {
        setAiDiagnostics(response.data.diagnostics);
      } else {
        toast.error('Falha ao carregar diagnósticos');
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro na conexão de diagnóstico');
    } finally {
      setIsLoadingDiagnostics(false);
    }
  };

  const handleSimulateInbound = async () => {
    if (!workspaceSlug || !selectedId) {
      toast.error('Selecione uma conversa para simular');
      return;
    }
    
    setIsLoadingDiagnostics(true);
    try {
      const response = await api(`/api/workspace/${workspaceSlug}/debug/simulate-inbound`, {
        method: 'POST',
        body: { conversationId: selectedId }
      });
      
      if (response.data?.message) {
        toast.success('Mensagem de cliente simulada!');
        mutateConversation(); // Reload the current conversation to show the message
      } else {
        toast.error('Falha ao simular mensagem');
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro na simulação');
    } finally {
      setIsLoadingDiagnostics(false);
    }
  };

  useEffect(() => {
    if (showAiDebug) {
      handleFetchDiagnostics();
    } else {
      setAiTestResult(null);
    }
  }, [showAiDebug]);

  const handleLiveAiTest = async () => {
    if (!workspaceSlug) return;
    setIsTestingAi(true);
    setAiTestResult(null);
    try {
      const response = await api(`/api/workspace/${workspaceSlug}/debug/test-ai`, {
        method: 'POST',
      });
      if (response.data) {
        setAiTestResult(response.data);
      } else {
        setAiTestResult({ overallOk: false, error: response.error?.msg || 'Falha desconhecida' });
      }
    } catch (err) {
      setAiTestResult({ overallOk: false, error: err.message });
    } finally {
      setIsTestingAi(false);
    }
  };


  const handleSendMessage = async (content) => {
    if (!workspaceSlug || !selectedId || !selectedConversation) return;

    const previousConversations = [...conversations];
    const previousDetail = { ...selectedConversation };

    // 1. Prepare optimistic state
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempId,
      direction: 'OUTBOUND',
      type: 'TEXT',
      content: content.trim(),
      createdAt: new Date().toISOString(),
      status: 'SENDING',
    };

    const optimisticConversation = {
      ...selectedConversation,
      messages: [...(selectedConversation.messages || []), optimisticMessage],
      lastMessage: optimisticMessage.content,
      updatedAt: optimisticMessage.createdAt,
    };

    // 2. Optimistic Update
    mutateConversations({
      data: {
        conversations: (conversations || []).map((c) =>
          c.id === selectedId ? optimisticConversation : c
        )
      }
    }, false);
    mutateConversation({ data: { conversation: optimisticConversation } }, false);
    setSelectedConversation(optimisticConversation);
    setMessageText(''); // Clear input optimistically

    try {
      const response = await api(`/api/workspace/${workspaceSlug}/inbox/${selectedId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          direction: 'OUTBOUND',
          type: selectedConversation.platform === 'EMAIL' ? 'EMAIL' : 'TEXT',
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error('Sessão expirada. Recarregando...');
          setTimeout(() => window.location.reload(), 1500);
          throw new Error('Sessão expirada');
        }
        throw new Error(response.error?.msg || 'Failed to send message');
      }

      const serverMessage = response.data?.message;
      if (!serverMessage) throw new Error('No message returned');

      const finalConversation = {
        ...selectedConversation,
        messages: [
          ...(selectedConversation.messages || []).filter(m => m.id !== tempId),
          serverMessage
        ],
        lastMessage: serverMessage.content,
        updatedAt: serverMessage.createdAt,
      };

      // Final cache sync
      mutateConversations({
        data: {
          conversations: (conversations || []).map((c) =>
            c.id === selectedId ? finalConversation : c
          )
        }
      }, false);
      mutateConversation({ data: { conversation: finalConversation } }, false);
      setSelectedConversation(finalConversation);
      
    } catch (error) {
      console.error('Send failed:', error);
      toast.error(t('inbox.message.sendFailed') + ': ' + error.message);
      
      // Rollback
      mutateConversations({ data: { conversations: previousConversations } }, false);
      mutateConversation({ data: { conversation: previousDetail } }, false);
      setSelectedConversation(previousDetail);
      
      // Restore text to input area
      setMessageText(content);
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
        <div className="fixed inset-0 z-[50] flex flex-col h-[100dvh] w-screen bg-white dark:bg-zinc-950 overflow-hidden">


          {(conversationsData === undefined && !!workspaceSlug) ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-zinc-950">
              <div className="w-12 h-12 border-4 border-zinc-200 dark:border-zinc-800 border-t-brand-600 rounded-full animate-spin mb-4"></div>
              <p className="text-zinc-500 dark:text-zinc-400 font-medium tracking-wide italic text-sm">Sincronizando comunicações...</p>
            </div>
          ) : (
            <div className="flex flex-1 overflow-hidden bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 relative">
              {/* Column 1: Global Small Sidebar (WhatsApp Web style) — hidden on mobile */}
              <div className="hidden sm:flex flex-col items-center py-8 w-[85px] bg-zinc-950 dark:bg-black border-r border-zinc-800 shrink-0 z-[70] relative">
                <div className="flex flex-col items-center gap-8 w-full">
                  <Link
                    href={`/account/${workspaceSlug}`}
                    className="group relative p-4 bg-zinc-900 rounded-[22px] border border-zinc-800 text-zinc-500 hover:text-white hover:border-indigo-500/50 hover:shadow-glow-indigo/20 transition-all duration-500"
                    title="Executive Dashboard"
                  >
                    <svg className="w-6 h-6 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
                    <div className="absolute inset-0 bg-indigo-500/10 rounded-[22px] opacity-0 group-hover:opacity-100 blur-xl transition-opacity" />
                  </Link>
                  
                  <div className="relative group">
                    <div className="absolute inset-0 bg-indigo-600 blur-2xl opacity-20 rounded-full" />
                    <button 
                      className="relative p-4 bg-indigo-600 rounded-[22px] text-white shadow-2xl shadow-indigo-600/40 border border-indigo-400/30"
                      title="Active Communications"
                    >
                      <svg className="w-6 h-6 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0l-8 4-8-4"/></svg>
                    </button>
                  </div>

                  <Link
                    href={`/account/${workspaceSlug}/settings`}
                    className="group relative p-4 bg-zinc-900 rounded-[22px] border border-zinc-800 text-zinc-500 hover:text-white hover:border-indigo-500/50 hover:shadow-glow-indigo/20 transition-all duration-500"
                    title="Intelligence Settings"
                  >
                    <svg className="w-6 h-6 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </Link>
                </div>
                <div className="mt-auto pb-8">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-white/5 blur-xl group-hover:bg-white/10 transition-all rounded-full" />
                    <div className="relative w-12 h-12 rounded-[18px] bg-zinc-900 border border-zinc-800 font-executive font-black flex items-center justify-center text-white shadow-2xl transition-transform group-hover:scale-105">
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
                  isTogglingAutopilot={isTogglingAutopilot}
                  onBack={() => setSelectedId(null)}
                />

                {/* AI Debug Panel — Super Admin Only */}
                <AnimatePresence>
                  {showAiDebug && session?.user?.role === 'SUPERADMIN' && (
                    <motion.div
                      initial={{ x: '100%' }}
                      animate={{ x: 0 }}
                      exit={{ x: '100%' }}
                      transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                      className="absolute inset-y-0 right-0 w-[340px] bg-zinc-950 text-white border-l border-amber-500/20 shadow-[0_0_40px_rgba(0,0,0,0.5)] z-50 flex flex-col"
                    >
                      {/* Header */}
                      <div className="p-4 border-b border-amber-500/20 flex justify-between items-center shrink-0 bg-gradient-to-r from-amber-900/30 to-transparent">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-amber-500/20 rounded-lg flex items-center justify-center">
                            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          </div>
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-400">IA Diagnóstico</p>
                            <p className="text-[9px] text-zinc-500 uppercase tracking-widest">Super Admin</p>
                          </div>
                        </div>
                        <button onClick={() => setShowAiDebug(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all">
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
                        {isLoadingDiagnostics ? (
                          <div className="flex flex-col items-center justify-center h-48">
                            <div className="w-10 h-10 border-2 border-zinc-800 border-t-amber-500 rounded-full animate-spin mb-3" />
                            <span className="text-[10px] text-amber-500 font-black uppercase tracking-[0.2em]">Analisando...</span>
                          </div>
                        ) : aiDiagnostics ? (
                          <>
                            {/* AI Provider Status */}
                            <div className="space-y-2">
                              <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] px-0.5">Provedores de IA</p>
                              <div className="grid grid-cols-2 gap-2">
                                <div className={`p-3 rounded-xl border ${
                                  aiDiagnostics.ai.googleKeyPresent
                                    ? 'bg-emerald-950/40 border-emerald-700/40'
                                    : 'bg-red-950/30 border-red-800/30'
                                }`}>
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <div className={`w-1.5 h-1.5 rounded-full ${aiDiagnostics.ai.googleKeyPresent ? 'bg-emerald-400' : 'bg-red-500'} animate-pulse`} />
                                    <p className="text-[8px] font-bold text-zinc-400 uppercase">Google Gemini</p>
                                  </div>
                                  <p className={`text-xs font-black ${aiDiagnostics.ai.googleKeyPresent ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {aiDiagnostics.ai.googleKeyPresent ? '✓ Conectado' : '✗ Ausente'}
                                  </p>
                                </div>
                                <div className={`p-3 rounded-xl border ${
                                  aiDiagnostics.ai.openAiKeyPresent
                                    ? 'bg-emerald-950/40 border-emerald-700/40'
                                    : 'bg-zinc-900 border-zinc-800'
                                }`}>
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <div className={`w-1.5 h-1.5 rounded-full ${aiDiagnostics.ai.openAiKeyPresent ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-700'}`} />
                                    <p className="text-[8px] font-bold text-zinc-400 uppercase">OpenAI GPT</p>
                                  </div>
                                  <p className={`text-xs font-black ${aiDiagnostics.ai.openAiKeyPresent ? 'text-emerald-400' : 'text-zinc-600'}`}>
                                    {aiDiagnostics.ai.openAiKeyPresent ? '✓ Conectado' : '— N/A'}
                                  </p>
                                </div>
                              </div>
                              {!aiDiagnostics.ai.googleKeyPresent && !aiDiagnostics.ai.openAiKeyPresent && (
                                <div className="flex items-start gap-2 p-3 bg-red-950/40 border border-red-800/40 rounded-xl">
                                  <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                                  <p className="text-[10px] text-red-400">Nenhuma chave de IA configurada. Defina <code className="text-red-300">GOOGLE_AI_API_KEY</code> no Vercel.</p>
                                </div>
                              )}
                            </div>

                            {/* Plan & Module */}
                            <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
                              <div className="px-4 py-3 flex justify-between items-center border-b border-zinc-800">
                                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Plano</span>
                                <span className="text-[10px] font-black text-brand-400 uppercase">{aiDiagnostics.ai.plan}</span>
                              </div>
                              <div className="px-4 py-3 flex justify-between items-center">
                                <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Módulo IA</span>
                                <span className={`text-[10px] font-black uppercase ${aiDiagnostics.ai.moduleAllowed ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {aiDiagnostics.ai.moduleAllowed ? '✓ Autorizado' : '✗ Bloqueado'}
                                </span>
                              </div>
                            </div>

                            {/* Conversation Context */}
                            {selectedConversation && (
                              <div className="rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
                                <div className="px-4 py-3 flex justify-between items-center border-b border-zinc-800">
                                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Conversa Ativa</span>
                                  <span className="text-[10px] font-black text-zinc-300 truncate max-w-[120px]">{selectedConversation.contact?.name || 'N/A'}</span>
                                </div>
                                <div className="px-4 py-3 flex justify-between items-center">
                                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Autopilot</span>
                                  <span className={`text-[10px] font-black uppercase ${selectedConversation.autopilotEnabled ? 'text-emerald-400' : 'text-zinc-600'}`}>
                                    {selectedConversation.autopilotEnabled ? '✓ Ligado' : '— Desligado'}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Integrations */}
                            <div className="space-y-2">
                              <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] px-0.5">Integrações</p>
                              {aiDiagnostics.integrations.count === 0 ? (
                                <div className="flex items-center gap-2 p-3 bg-zinc-900 border border-zinc-800 rounded-xl">
                                  <div className="w-2 h-2 rounded-full bg-zinc-700" />
                                  <span className="text-[10px] text-zinc-500">Nenhuma integração ativa</span>
                                </div>
                              ) : (
                                <div className="space-y-1.5">
                                  {aiDiagnostics.integrations.items.map(int => (
                                    <div key={int.id} className="flex justify-between items-center p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                                      <div className="flex items-center gap-2">
                                        <div className={`w-1.5 h-1.5 rounded-full ${int.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-700'}`} />
                                        <span className="text-[10px] font-bold text-zinc-300">{int.provider}</span>
                                      </div>
                                      <span className={`text-[9px] font-black ${int.enabled ? 'text-emerald-500' : 'text-zinc-600'}`}>
                                        {int.enabled ? 'ATIVO' : 'INATIVO'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Test Tools */}
                            <div className="space-y-2">
                              <p className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] px-0.5">Ferramentas de Teste</p>

                              {/* Live AI Test */}
                              <button
                                onClick={handleLiveAiTest}
                                disabled={isTestingAi}
                                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2"
                              >
                                {isTestingAi ? (
                                  <><div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> Testando IA...</>
                                ) : (
                                  <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> Executar Teste de IA</>
                                )}
                              </button>

                              {/* Live Test Result */}
                              {aiTestResult && (
                                <div className={`p-3 rounded-xl border text-[10px] space-y-2 ${aiTestResult.overallOk ? 'bg-emerald-950/40 border-emerald-700/40' : 'bg-red-950/40 border-red-700/40'}`}>
                                  <p className={`font-black uppercase tracking-widest ${aiTestResult.overallOk ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {aiTestResult.overallOk ? '✓ IA Funcionando' : '✗ Falha no Teste'}
                                  </p>
                                  {aiTestResult.google && (
                                    <div className="space-y-0.5">
                                      <p className="text-[8px] text-zinc-500 uppercase font-bold">Google Gemini</p>
                                      {aiTestResult.google.ok ? (
                                        <p className="text-emerald-400">Resposta: &quot;{aiTestResult.google.response}&quot; ({aiTestResult.google.tokensUsed} tokens)</p>
                                      ) : (
                                        <p className="text-red-400 break-words">{aiTestResult.google.error}</p>
                                      )}
                                    </div>
                                  )}
                                  {aiTestResult.openai && (
                                    <div className="space-y-0.5">
                                      <p className="text-[8px] text-zinc-500 uppercase font-bold">OpenAI</p>
                                      {aiTestResult.openai.ok ? (
                                        <p className="text-emerald-400">Resposta: &quot;{aiTestResult.openai.response}&quot;</p>
                                      ) : (
                                        <p className="text-red-400 break-words">{aiTestResult.openai.error}</p>
                                      )}
                                    </div>
                                  )}
                                  {aiTestResult.error && (
                                    <p className="text-red-400 break-words">{aiTestResult.error}</p>
                                  )}
                                </div>
                              )}

                              {/* Simulate Inbound */}
                              <button
                                onClick={handleSimulateInbound}
                                disabled={!selectedId || isLoadingDiagnostics}
                                className="w-full py-3 px-4 bg-white text-zinc-900 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                {selectedConversation?.autopilotEnabled ? 'Simular + Acionar Autopilot' : 'Simular Mensagem'}
                              </button>
                              {!selectedId && (
                                <p className="text-[9px] text-zinc-600 italic text-center">Selecione uma conversa para simular</p>
                              )}
                              {selectedId && !selectedConversation?.autopilotEnabled && (
                                <p className="text-[9px] text-zinc-600 italic text-center">Ligue o Autopilot para ver a IA responder</p>
                              )}
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-48 text-center">
                            <svg className="w-8 h-8 text-zinc-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                            <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">Erro ao carregar</p>
                          </div>
                        )}
                      </div>

                      {/* Footer actions */}
                      <div className="p-4 border-t border-zinc-800 shrink-0 space-y-2">
                        <button
                          onClick={handleFetchDiagnostics}
                          disabled={isLoadingDiagnostics}
                          className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2"
                        >
                          {isLoadingDiagnostics ? (
                            <><div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> Atualizando...</>
                          ) : (
                            <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> Atualizar Diagnóstico</>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      </Content>
    </AccountLayout>
  );
};

export default Inbox;
