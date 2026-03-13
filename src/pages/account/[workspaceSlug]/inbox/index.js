import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
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
  const [mounted, setMounted] = useState(false);

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

  // Fetch templates
  const { data: templatesData, mutate: mutateTemplates } = useSWR(
    workspaceSlug ? `/api/workspace/${workspaceSlug}/inbox/templates` : null,
    api
  );

  const { data: whatsappAnalytics } = useSWR(
    workspaceSlug ? `/api/workspace/${workspaceSlug}/analytics?scope=whatsapp` : null,
    api
  );

  useEffect(() => setMounted(true), []);

  const conversations = useMemo(() => conversationsData?.data?.conversations || [], [conversationsData]);
  const members = useMemo(() => membersData?.data?.members || [], [membersData]);
  const templates = useMemo(() => templatesData?.data?.templates || [], [templatesData]);

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
    if (selectedId && conversations.length > 0) {
      const conv = conversations.find((c) => c.id === selectedId);
      setSelectedConversation(conv);
    } else {
      setSelectedConversation(null);
    }
  }, [selectedId, conversations]);

  const handleGenerateResponse = async () => {
    if (!selectedConversation) return;

    setIsGeneratingAI(true);
    try {
      const response = await api(`/api/workspace/${workspaceSlug}/inbox/${selectedConversation.id}/suggest-reply`, {
        method: 'POST',
      });

      if (response.data?.suggestion) {
        setMessageText(response.data.suggestion);
        toast.success(t('inbox.ai.generated'));
      }
    } catch (error) {
      console.error(error);
      toast.error(t('inbox.ai.failed'));
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSendMessage = async (content) => {
    if (!selectedConversation) return;

    const previousConversations = [...conversations];

    // Optimistic update
    const newMessage = {
      id: Date.now().toString(),
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

    // Update local state immediately
    mutateConversations({
      data: {
        conversations: conversations.map((c) =>
          c.id === selectedId ? updatedConversation : c
        )
      }
    }, false);

    try {
      await api(`/api/workspace/${workspaceSlug}/inbox/${selectedConversation.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          direction: 'OUTBOUND',
          type: 'TEXT',
        }),
      });
      // Revalidate to get the real message ID and status
      mutateConversations();
    } catch (error) {
      console.error(error);
      toast.error(t('inbox.message.sendFailed'));
      // Rollback
      mutateConversations({ data: { conversations: previousConversations } }, false);
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
    } catch (error) {
      console.error(error);
      toast.error(t('inbox.assignee.assignFailed'));
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
    }
  ];

  return (
    <AccountLayout>
      <OnboardingTour tourId="inbox-tour" steps={inboxSteps} />
      <Meta title={t('Inbox')} />
      <Content>
        <div className="flex flex-col h-[calc(100vh-200px)]">
          <Card className="mb-6">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">{t('analytics.whatsapp.title')}</h3>
                  <p className="text-sm text-gray-500 mt-1">{t('analytics.whatsapp.last30Days')}</p>
                </div>
                <div className="flex space-x-6">
                  <div className="text-right">
                    <div className="text-xs text-gray-500">{t('analytics.whatsapp.inbound')}</div>
                    <div className="text-xl font-semibold text-gray-900">
                      <CountUp value={messageTotals.inbound} enabled={mounted} />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">{t('analytics.whatsapp.outbound')}</div>
                    <div className="text-xl font-semibold text-gray-900">
                      <CountUp value={messageTotals.outbound} enabled={mounted} />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">{t('analytics.whatsapp.total')}</div>
                    <div className="text-xl font-semibold text-gray-900">
                      <CountUp value={messageTotals.total} enabled={mounted} />
                    </div>
                  </div>
                </div>
              </div>

              {mounted ? (
                <div className="h-44 mt-5">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={whatsappTrendChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="inbound" name={t('analytics.whatsapp.inbound')} stackId="a" fill="#16a34a" isAnimationActive animationDuration={900} />
                      <Bar dataKey="outbound" name={t('analytics.whatsapp.outbound')} stackId="a" fill="#2563eb" isAnimationActive animationDuration={900} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : null}
            </div>
          </Card>
          
          {(conversationsData === undefined && !!workspaceSlug) ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-lg shadow-lg border border-gray-200">
               <div className="w-12 h-12 border-4 border-zinc-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
               <p className="text-zinc-500 font-medium tracking-wide italic">Synchronizing communications...</p>
            </div>
          ) : (
            <div className="flex flex-1 overflow-hidden bg-white rounded-lg shadow-lg border border-gray-200">
              <div id="conversation-list" className={`${selectedId ? 'hidden md:block h-full md:flex-shrink-0' : 'block w-full h-full'}`}>
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
              <div id="chat-window" className={`${selectedId ? 'block w-full md:w-auto' : 'hidden md:block'} flex-1 h-full`}>
                <ChatWindow
                  conversation={selectedConversation}
                  messages={selectedConversation?.messages || []}
                  onSendMessage={handleSendMessage}
                  members={members}
                  onAssign={handleAssign}
                  templates={templates}
                  messageText={messageText}
                  onMessageChange={setMessageText}
                  onGenerateResponse={handleGenerateResponse}
                  isGeneratingAI={isGeneratingAI}
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
