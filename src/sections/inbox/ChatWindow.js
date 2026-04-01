import { useState, useRef, useEffect, Fragment } from 'react';
import { 
  PaperAirplaneIcon, 
  UserCircleIcon, 
  ChevronDownIcon, 
  DocumentDuplicateIcon, 
  PlusIcon, 
  SparklesIcon, 
  ArrowLeftIcon, 
  DocumentTextIcon, 
  CreditCardIcon, 
  CalendarDaysIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  CameraIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { Menu, Transition, Dialog } from '@headlessui/react';
import MessageBubble from './MessageBubble';
import { useTranslation } from 'react-i18next';
import Paywall from '@/components/Paywall';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import toast from 'react-hot-toast';
import api from '@/lib/common/api';
import { motion, AnimatePresence } from 'framer-motion';
import Logo from '@/components/Logo';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

const formatMoney = (value, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: String(currency || 'BRL').toUpperCase(),
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const PlatformIcon = ({ platform, className = "w-4 h-4" }) => {
  switch (String(platform).toUpperCase()) {
    case 'WHATSAPP': return <ChatBubbleLeftRightIcon className={`${className} text-green-500`} />;
    case 'EMAIL': return <EnvelopeIcon className={`${className} text-blue-500`} />;
    case 'INSTAGRAM': return <CameraIcon className={`${className} text-pink-500`} />;
    default: return <ChatBubbleLeftRightIcon className={`${className} text-zinc-400`} />;
  }
};

const ChatWindow = ({
  conversation,
  onSendMessage,
  onAssign,
  members = [],
  templates = [],
  paymentProducts = [],
  workspaceSlug,
  onCreateTemplate,
  messageText,
  onMessageChange,
  onGenerateResponse,
  isGeneratingAI,
  onSummarizeConversation,
  isSummarizingAI,
  aiObjective,
  onAiObjectiveChange,
  aiSuggestOnlyEnabled = true,
  onAiSuggestOnlyEnabledChange,
  onToggleAutopilot,
  isTogglingAutopilot = false,
  onBack
}) => {
  const { t } = useTranslation();
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateContent, setNewTemplateContent] = useState('');
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleConfig, setScheduleConfig] = useState({ summary: '', description: '' });
  const [availability, setAvailability] = useState(null);
  const [selectedSlotStart, setSelectedSlotStart] = useState('');
  const [scheduledEvent, setScheduledEvent] = useState(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages]);

  useEffect(() => {
    const contactName = conversation?.contact?.name || conversation?.externalId || '';
    setScheduleConfig({
      summary: contactName ? `Reunião com ${contactName}` : 'Reunião',
      description: '',
    });
    setAvailability(null);
    setSelectedSlotStart('');
    setScheduledEvent(null);
  }, [conversation?.id, conversation?.contact?.name, conversation?.externalId]);

  const handleSend = (e) => {
    e.preventDefault();
    if (messageText.trim()) {
      onSendMessage(messageText, { quotedId: replyingTo?.id });
      onMessageChange('');
      setReplyingTo(null);
    }
  };

  const appendToMessage = (text) => {
    const next = `${messageText || ''}`.trim();
    if (!next) return onMessageChange(text);
    return onMessageChange(`${next}\n${text}`);
  };

  const handleCreateTemplate = (e) => {
    e.preventDefault();
    if (newTemplateName && newTemplateContent) {
      onCreateTemplate(newTemplateName, newTemplateContent);
      setNewTemplateName('');
      setNewTemplateContent('');
      setIsTemplateModalOpen(false);
    }
  };

  const handleSummarize = async () => {
    if (!onSummarizeConversation) return;
    const summary = await onSummarizeConversation();
    if (summary) {
      setSummaryText(summary);
      setIsSummaryModalOpen(true);
    }
  };

  const formatSlot = (iso) => {
    const d = iso ? new Date(String(iso)) : null;
    if (!d || !Number.isFinite(d.getTime())) return String(iso || '');
    return d.toLocaleString();
  };

  const buildSlotsMessage = (slots) => {
    const items = Array.isArray(slots) ? slots : [];
    if (items.length === 0) return '';
    const lines = items.map((s, idx) => `${idx + 1}) ${formatSlot(s.start)}`);
    return `${t('inbox.schedule.step1.prefix')}\n${lines.join('\n')}\n\n${t('inbox.schedule.step1.question')}`;
  };

  const checkAvailability = async () => {
    if (!workspaceSlug) return;
    setIsCheckingAvailability(true);
    setAvailability(null);
    setSelectedSlotStart('');
    try {
      const res = await api(`/api/workspace/${workspaceSlug}/integrations/google_calendar/freebusy`, {
        method: 'POST',
        body: {
          maxSuggestions: 5,
        },
      });
      if (res?.status >= 400) throw new Error(res?.error?.msg || 'Failed');
      setAvailability(res?.data || null);
      const first = res?.data?.suggestions?.[0]?.start || '';
      setSelectedSlotStart(first);
      toast.success(t('inbox.schedule.availability.ok'));
    } catch (error) {
      console.error(error);
      toast.error(t('inbox.schedule.availability.failed'));
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  const createEvent = async () => {
    if (!workspaceSlug) return;
    if (!selectedSlotStart) return;
    const slot = availability?.suggestions?.find((s) => s.start === selectedSlotStart) || null;
    if (!slot?.start || !slot?.end) return;
    setIsScheduling(true);
    try {
      const res = await api(`/api/workspace/${workspaceSlug}/integrations/google_calendar/events`, {
        method: 'POST',
        body: {
          calendarId: availability?.calendarId || undefined,
          start: slot.start,
          end: slot.end,
          summary: scheduleConfig.summary,
          description: scheduleConfig.description,
          conversationId: conversation?.id,
          contactId: conversation?.contact?.id,
        },
      });
      if (res?.status >= 400) throw new Error(res?.error?.msg || 'Failed');
      setScheduledEvent(res?.data?.event || null);
      toast.success(t('inbox.schedule.event.created'));
    } catch (error) {
      console.error(error);
      toast.error(t('inbox.schedule.event.failed'));
    } finally {
      setIsScheduling(false);
    }
  };

  const insertStep1Message = () => {
    const msg = buildSlotsMessage(availability?.suggestions || []);
    if (!msg) return;
    appendToMessage(msg);
    toast.success(t('inbox.schedule.step1.inserted'));
  };

  const insertStep2Message = () => {
    const slot = scheduledEvent?.start || selectedSlotStart;
    if (!slot) return;
    const msg = `${t('inbox.schedule.step2.prefix')} ${formatSlot(slot)}. ${t('inbox.schedule.step2.suffix')}`;
    appendToMessage(msg);
    toast.success(t('inbox.schedule.step2.inserted'));
  };

  const cancelEvent = async () => {
    if (!workspaceSlug) return;
    if (!scheduledEvent?.id) return;
    setIsCanceling(true);
    try {
      const res = await api(`/api/workspace/${workspaceSlug}/integrations/google_calendar/events?eventId=${encodeURIComponent(scheduledEvent.id)}`, {
        method: 'DELETE',
        body: {
          calendarId: availability?.calendarId || undefined,
        },
      });
      if (res?.status >= 400) throw new Error(res?.error?.msg || 'Failed');
      setScheduledEvent(null);
      toast.success(t('inbox.schedule.event.canceled'));
    } catch (error) {
      console.error(error);
      toast.error(t('inbox.schedule.event.cancelFailed'));
    } finally {
      setIsCanceling(false);
    }
  };

  const rescheduleEvent = async () => {
    if (!workspaceSlug) return;
    if (!scheduledEvent?.id) return;
    if (!selectedSlotStart) return;
    const slot = availability?.suggestions?.find((s) => s.start === selectedSlotStart) || null;
    if (!slot?.start || !slot?.end) return;
    setIsRescheduling(true);
    try {
      const res = await api(`/api/workspace/${workspaceSlug}/integrations/google_calendar/events?eventId=${encodeURIComponent(scheduledEvent.id)}`, {
        method: 'PATCH',
        body: {
          calendarId: availability?.calendarId || undefined,
          start: slot.start,
          end: slot.end,
        },
      });
      if (res?.status >= 400) throw new Error(res?.error?.msg || 'Failed');
      setScheduledEvent(res?.data?.event || null);
      toast.success(t('inbox.schedule.event.rescheduled'));
    } catch (error) {
      console.error(error);
      toast.error(t('inbox.schedule.event.rescheduleFailed'));
    } finally {
      setIsRescheduling(false);
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-50/20 dark:bg-black/40 h-full p-20 text-center relative overflow-hidden group/empty">
        <div className="absolute inset-0 bg-grid-zinc-200/50 dark:bg-grid-white/[0.02] [mask-image:radial-gradient(ellipse_at_center,black,transparent)] pointer-events-none" />
        <motion.div 
          initial={{ scale: 0.8, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "circOut" }}
          className="relative w-64 h-64 mb-16"
        >
          <div className="absolute inset-0 bg-indigo-600/10 blur-[100px] animate-pulse" />
          <div className="relative w-full h-full bg-white dark:bg-zinc-900 rounded-[5rem] shadow-premium flex items-center justify-center border border-zinc-100 dark:border-zinc-800 transition-transform duration-1000 group-hover/empty:scale-110 group-hover/empty:rotate-3">
            <PaperAirplaneIcon className="w-20 h-20 text-zinc-100 dark:text-zinc-800 -rotate-12" />
          </div>
        </motion.div>
        
        <div className="relative z-10 max-w-lg">
          <h2 className="text-zinc-950 dark:text-white text-5xl font-executive font-extrabold tracking-tighter mb-6 uppercase italic leading-none">
            {t('inbox.chat.empty.title')}
          </h2>
          <p className="text-zinc-400 dark:text-zinc-500 text-xl font-medium leading-relaxed italic tracking-tight opacity-80 mb-12">
            {t('inbox.chat.empty.subtitle')}
          </p>
          <div className="flex items-center justify-center gap-4 opacity-30 hover:opacity-100 transition-all duration-1000">
            <div className="w-12 h-[1px] bg-zinc-300 dark:bg-zinc-800" />
            <Logo variant="full" className="scale-75 grayscale" />
            <div className="w-12 h-[1px] bg-zinc-300 dark:bg-zinc-800" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-black relative overflow-hidden group/chat">
      {/* Header */}
      <div className="px-4 py-4 sm:px-6 sm:py-5 lg:px-10 lg:py-6 border-b border-zinc-100 dark:border-zinc-800/50 flex justify-between items-center bg-white/80 dark:bg-zinc-950/80 backdrop-blur-3xl sticky top-0 z-30 shrink-0 shadow-premium-sm">
        <div className="flex items-center gap-3 sm:gap-4 lg:gap-6 min-w-0">
          {onBack && (
            <motion.button 
              whileHover={{ x: -3, scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onBack} 
              className="md:hidden p-2.5 sm:p-3 -ml-1 text-zinc-400 hover:text-indigo-600 transition-all shrink-0"
            >
              <ArrowLeftIcon className="w-6 h-6 stroke-[2]" />
            </motion.button>
          )}
          <div className="relative group/profile shrink-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 p-0.5 sm:p-1 bg-zinc-100 dark:bg-zinc-900 rounded-[1.25rem] sm:rounded-[1.75rem] lg:rounded-[2.25rem] border border-zinc-200 dark:border-zinc-800 transition-all duration-700 overflow-hidden relative shadow-premium group-hover/profile:scale-110 group-hover/profile:rotate-3">
              <div className="w-full h-full rounded-[1rem] sm:rounded-[1.5rem] lg:rounded-[1.75rem] overflow-hidden bg-white dark:bg-zinc-950 flex items-center justify-center">
                {conversation.contact?.image ? (
                  <img src={conversation.contact.image} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover/profile:scale-110" />
                ) : (
                  <span className="text-base sm:text-lg lg:text-2xl font-executive font-black italic text-zinc-300 dark:text-zinc-700">
                    {conversation.contact?.name?.charAt(0) || '?'}
                  </span>
                )}
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-white dark:bg-zinc-900 rounded-[12px] flex items-center justify-center shadow-xl border-2 border-white dark:border-zinc-950 z-10 transition-transform group-hover/profile:scale-125">
              <PlatformIcon platform={conversation.platform} className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="min-w-0">
            <h3 className="text-[14px] sm:text-[16px] lg:text-[20px] font-executive font-extrabold text-zinc-950 dark:text-white tracking-tighter leading-none mb-1.5 sm:mb-2.5 uppercase italic truncate">
              {conversation.contact?.name || conversation.externalId || t('common.unknown')}
            </h3>
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-glow-emerald animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 italic">
                  CHANNEL SECURED
                </span>
              </div>
              <div className="w-[1px] h-3 bg-zinc-200 dark:bg-zinc-800" />
              <div className="flex items-center gap-2.5">
                <PlatformIcon platform={conversation.platform} className="w-4 h-4 text-zinc-400" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 italic">
                  {String(conversation.platform)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-6 lg:gap-10 shrink-0">
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => onToggleAutopilot?.(!conversation.autopilotEnabled)}
            disabled={!onToggleAutopilot || isTogglingAutopilot}
            className={classNames(
              'group flex items-center gap-2 sm:gap-4 px-4 py-3 sm:px-6 sm:py-3.5 lg:px-10 lg:py-4 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] rounded-[1.25rem] sm:rounded-[1.75rem] border-2 transition-all duration-700 italic shadow-2xl',
              conversation.autopilotEnabled 
                ? 'bg-zinc-950 border-indigo-500/50 text-white shadow-glow-indigo/20 ring-1 ring-indigo-500/20' 
                : 'bg-white dark:bg-zinc-900/50 border-zinc-100 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 hover:border-indigo-500/30 hover:text-indigo-600'
            )}
          >
            <SparklesIcon className={`w-4 h-4 shrink-0 ${conversation.autopilotEnabled ? 'text-indigo-400 animate-pulse' : 'text-zinc-400 group-hover:text-indigo-500'}`} />
            <span className="hidden lg:inline mr-1 text-indigo-400/70">AGENT MODE:</span>
            <span className="hidden sm:inline">{conversation.autopilotEnabled ? 'AUTOPILOT' : 'MANUAL'}</span>
            <span className="sm:hidden">{conversation.autopilotEnabled ? 'AUTO' : 'MAN'}</span>
          </motion.button>

          <div className="hidden lg:block h-12 w-[1px] bg-zinc-100 dark:bg-zinc-800/80" />

          <Menu as="div" className="hidden sm:block relative inline-block text-left">
            <Menu.Button className="flex items-center group bg-zinc-50/50 dark:bg-zinc-900/40 p-2 pr-6 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 transition-all duration-500 hover:bg-white dark:hover:bg-zinc-900 shadow-sm hover:shadow-premium">
              <div className="w-12 h-12 bg-white dark:bg-zinc-950 rounded-[1.5rem] border border-zinc-100 dark:border-zinc-800 flex items-center justify-center overflow-hidden mr-4 shadow-inner transition-transform group-hover:scale-110">
                {conversation.assignee?.image ? (
                  <img src={conversation.assignee.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <UserCircleIcon className="w-7 h-7 text-zinc-200 dark:text-zinc-800" />
                )}
              </div>
              <div className="flex flex-col items-start mr-4">
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.25em] leading-none mb-2 italic opacity-70">SCOPE OWNER</span>
                <span className="text-[14px] font-executive font-black text-zinc-950 dark:text-zinc-100 leading-none uppercase italic tracking-tight">
                  {conversation.assignee?.name || 'OPERATOR REQUIRED'}
                </span>
              </div>
              <ChevronDownIcon className="w-5 h-5 ml-2 text-zinc-300 group-hover:text-indigo-600 transition-colors duration-500" />
            </Menu.Button>

            <Transition
              as={Fragment}
              enter="transition ease-out duration-300"
              enterFrom="transform opacity-0 scale-95 translate-y-4"
              enterTo="transform opacity-100 scale-100 translate-y-0"
              leave="transition ease-in duration-200"
              leaveFrom="transform opacity-100 scale-100 translate-y-0"
              leaveTo="transform opacity-0 scale-95 translate-y-4"
            >
              <Menu.Items className="absolute right-0 w-80 mt-6 origin-top-right vysify-glass rounded-[2.5rem] shadow-3xl ring-1 ring-zinc-800/50 focus:outline-none z-50 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800/50">
                <div className="px-8 py-5 bg-zinc-50/50 dark:bg-zinc-950/50">
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.3em] italic">DELEGATION PROTOCOL</p>
                </div>
                <div className="py-2">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => onAssign(null)}
                        className={classNames(
                          active ? 'bg-indigo-600 text-white' : 'text-zinc-600 dark:text-zinc-400',
                          'block w-full text-left px-8 py-5 text-[11px] font-black uppercase tracking-[0.2em] italic transition-all'
                        )}
                      >
                        {t('inbox.filter.unassigned')}
                      </button>
                    )}
                  </Menu.Item>
                  {members.map((member) => (
                    <Menu.Item key={member.id}>
                      {({ active }) => (
                        <button
                          onClick={() => onAssign(member.member.id)}
                          className={classNames(
                            active ? 'bg-zinc-50 dark:bg-zinc-900/50' : '',
                            'flex w-full items-center px-8 py-5 transition-all group/agent'
                          )}
                        >
                          <div className="w-12 h-12 rounded-[1.25rem] overflow-hidden border border-zinc-100 dark:border-zinc-800 flex-shrink-0 shadow-premium mr-5 transition-transform group-hover/agent:scale-110">
                            {member.member.image ? (
                              <img src={member.member.image} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <UserCircleIcon className="w-full h-full text-zinc-200 dark:text-zinc-800" />
                            )}
                          </div>
                          <div className="flex flex-col items-start min-w-0">
                            <span className={`text-[13px] font-executive font-black uppercase tracking-tight italic truncate w-full ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-950 dark:text-zinc-200'}`}>
                              {member.member.name || member.member.email}
                            </span>
                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-1 italic">Authorized Agent</span>
                          </div>
                        </button>
                      )}
                    </Menu.Item>
                  ))}
                </div>
              </Menu.Items>
            </Transition>
          </Menu>

          <Logo variant="full" className="hidden xl:block scale-75 origin-right opacity-20 grayscale hover:opacity-100 transition-all duration-1000" />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 bg-zinc-50/50 dark:bg-zinc-950/20 custom-scrollbar relative">
        <div className="absolute inset-0 bg-grid-zinc-200/40 dark:bg-grid-white/[0.01] [mask-image:radial-gradient(ellipse_at_center,black,transparent)] pointer-events-none" />
        <AnimatePresence mode="popLayout">
          {conversation.messages?.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full opacity-10 select-none pb-20"
            >
              <span className="text-[14px] font-black uppercase tracking-[0.5em] text-zinc-400 -rotate-90">V Y S I F Y</span>
            </motion.div>
          ) : (
            <div className="max-w-5xl mx-auto w-full flex flex-col">
              {conversation.messages?.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isMe={message.direction === 'OUTBOUND'}
                  onReply={() => setReplyingTo(message)}
                />
              ))}
            </div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 sm:p-4 lg:p-5 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-3xl border-t border-zinc-100 dark:border-zinc-800/50 shrink-0 z-20 shadow-premium-lg">
        {/* Unified Toolbar */}
        <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-2.5 mb-2.5 sm:mb-3 overflow-x-auto pb-1.5 sm:pb-2 scrollbar-hide no-scrollbar -mx-1 px-1">
          <Paywall
            minPlan="PREMIUM"
            fallback={
              <div className="flex items-center gap-4 shrink-0">
                <button
                  type="button"
                  disabled
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-50/50 text-zinc-300 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] border border-zinc-100 opacity-50 italic shadow-inner-premium"
                >
                  <SparklesIcon className="w-3.5 h-3.5" />
                  INTELLIGENCE
                </button>
              </div>
            }
          >
            <div className="flex items-center gap-2 shrink-0">
              <motion.button
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onGenerateResponse?.({ objective: aiObjective })}
                disabled={isGeneratingAI || !aiSuggestOnlyEnabled}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2 lg:px-5 lg:py-2.5 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.1em] sm:tracking-[0.15em] border transition-all duration-500 shadow-lg italic shrink-0 ${
                  aiSuggestOnlyEnabled 
                    ? 'bg-zinc-950 border-indigo-500/50 text-indigo-400 shadow-glow-indigo/20 ring-1 ring-indigo-500/20' 
                    : 'bg-zinc-50 border-zinc-100 text-zinc-400'
                }`}
              >
                <SparklesIcon className={`w-3.5 h-3.5 shrink-0 ${isGeneratingAI ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isGeneratingAI ? 'SYNTHESIZING...' : 'GENERATE AI RESPONSE'}</span>
                <span className="sm:hidden">{isGeneratingAI ? 'AI...' : 'AI GEN'}</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleSummarize}
                disabled={isSummarizingAI}
                className="flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2 lg:px-5 lg:py-2.5 bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-100 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.1em] sm:tracking-[0.15em] border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/30 hover:text-indigo-600 transition-all duration-500 shadow-sm italic shrink-0"
              >
                <DocumentTextIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">{isSummarizingAI ? 'ANALYZING...' : 'SUMMARIZE STREAM'}</span>
                <span className="sm:hidden">{isSummarizingAI ? '...' : 'SUMA.'}</span>
              </motion.button>
              
              <div className="hidden lg:flex items-center gap-3 ml-1 p-1.5 bg-zinc-100/50 dark:bg-black/40 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-inner-premium">
                <label className="flex items-center gap-2 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.15em] text-zinc-400 select-none cursor-pointer hover:text-indigo-600 transition-all duration-500 italic rounded-xl">
                  <input
                    type="checkbox"
                    checked={Boolean(aiSuggestOnlyEnabled)}
                    onChange={(e) => onAiSuggestOnlyEnabledChange?.(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-indigo-600 focus:ring-indigo-500/20 transition-all cursor-pointer"
                  />
                  AUTOSUGGEST
                </label>
                <div className="h-4 w-[1px] bg-zinc-300 dark:bg-zinc-800" />
                <select
                  value={aiObjective || ''}
                  onChange={(e) => onAiObjectiveChange?.(e.target.value)}
                  className="h-8 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 px-4 text-[9px] font-black uppercase tracking-[0.15em] text-zinc-950 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/30 transition-all italic appearance-none cursor-pointer"
                >
                  <option value="support">{t('inbox.ai.objective.support')}</option>
                  <option value="qualify">{t('inbox.ai.objective.qualify')}</option>
                  <option value="close">{t('inbox.ai.objective.close')}</option>
                  <option value="schedule">{t('inbox.ai.objective.schedule')}</option>
                </select>
              </div>
            </div>
          </Paywall>

          <div className="hidden lg:block h-6 w-[1px] bg-zinc-200 dark:bg-zinc-800 mx-1.5 shrink-0" />

          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={() => setIsScheduleModalOpen(true)}
            disabled={aiObjective !== 'schedule'}
            className="hidden lg:flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-100 rounded-2xl text-[9px] font-black uppercase tracking-[0.15em] border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/30 hover:text-indigo-600 transition-all duration-500 shrink-0 disabled:opacity-30 shadow-sm italic"
          >
            <CalendarDaysIcon className="w-3.5 h-3.5" />
            {t('inbox.schedule.title')}
          </motion.button>

          <Menu as="div" className="relative inline-block text-left shrink-0">
            <Menu.Button className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-100 rounded-2xl text-[9px] font-black uppercase tracking-[0.15em] border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/30 hover:text-indigo-600 transition-all duration-500 shadow-sm italic">
              <DocumentDuplicateIcon className="w-3.5 h-3.5" />
              {t('inbox.templates.title')}
            </Menu.Button>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-300"
              enterFrom="transform opacity-0 scale-95 translate-y-4"
              enterTo="transform opacity-100 scale-100 translate-y-0"
              leave="transition ease-in duration-200"
              leaveFrom="transform opacity-100 scale-100 translate-y-0"
              leaveTo="transform opacity-0 scale-95 translate-y-4"
            >
              <Menu.Items className="absolute bottom-full left-0 mb-8 w-96 origin-bottom-left vysify-glass rounded-[2.5rem] shadow-3xl ring-1 ring-zinc-800/50 focus:outline-none z-50 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800/50">
                <div className="px-10 py-6 bg-zinc-50/50 dark:bg-zinc-950/50 flex justify-between items-center">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] italic">{t('inbox.templates.title')}</p>
                  <button type="button" onClick={() => setIsTemplateModalOpen(true)} className="p-3 bg-zinc-950 text-white rounded-2xl hover:scale-110 transition-all shadow-glow-indigo">
                    <PlusIcon className="w-5 h-5" />
                  </button>
                </div>
                <div className="py-2 max-h-[400px] overflow-y-auto custom-scrollbar no-scrollbar">
                  {templates.length === 0 ? (
                    <div className="px-12 py-20 text-center opacity-40">
                      <p className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em] italic">{t('inbox.templates.empty')}</p>
                    </div>
                  ) : (
                    templates.map((template) => (
                      <Menu.Item key={template.id}>
                        {({ active }) => (
                          <button
                            type="button"
                            onClick={() => onMessageChange(template.content)}
                            className={classNames(
                              active ? 'bg-zinc-50 dark:bg-zinc-900/50' : '',
                              'block w-full text-left px-10 py-6 group transition-all'
                            )}
                          >
                            <p className={`text-[17px] font-executive font-black mb-1.5 transition-colors uppercase italic tracking-tight ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-950 dark:text-white'}`}>{template.name}</p>
                            <p className="text-[12px] font-medium text-zinc-500 dark:text-zinc-500 truncate tracking-tight italic opacity-70">{template.content}</p>
                          </button>
                        )}
                      </Menu.Item>
                    ))
                  )}
                </div>
              </Menu.Items>
            </Transition>
          </Menu>

          <Menu as="div" className="relative inline-block text-left shrink-0">
            <Menu.Button className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-100 rounded-2xl text-[9px] font-black uppercase tracking-[0.15em] border border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/30 hover:text-indigo-600 transition-all duration-500 shadow-sm italic">
              <CreditCardIcon className="w-3.5 h-3.5" />
              INVENTORY
            </Menu.Button>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-300"
              enterFrom="transform opacity-0 scale-95 translate-y-4"
              enterTo="transform opacity-100 scale-100 translate-y-0"
              leave="transition ease-in duration-200"
              leaveFrom="transform opacity-100 scale-100 translate-y-0"
              leaveTo="transform opacity-0 scale-95 translate-y-4"
            >
              <Menu.Items className="absolute bottom-full left-0 mb-8 w-96 origin-bottom-left vysify-glass rounded-[2.5rem] shadow-3xl ring-1 ring-zinc-800/50 focus:outline-none z-50 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800/50">
                <div className="px-10 py-6 bg-zinc-50/50 dark:bg-zinc-950/50">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] italic">COMMERCIAL OFFERS</p>
                </div>
                <div className="py-2 max-h-[400px] overflow-y-auto custom-scrollbar no-scrollbar">
                  {paymentProducts.length === 0 ? (
                    <div className="px-12 py-20 text-center opacity-40">
                      <p className="text-[11px] font-black text-zinc-400 italic uppercase tracking-[0.2em]">Inventory Empty</p>
                    </div>
                  ) : (
                    paymentProducts.map((product) => (
                      <Menu.Item key={product.id}>
                        {({ active }) => (
                          <button
                            type="button"
                            onClick={() => appendToMessage(`${window.location.origin}/p/${workspaceSlug}/${product.slug}`)}
                            className={classNames(
                              active ? 'bg-zinc-50 dark:bg-zinc-900/50' : '',
                              'block w-full text-left px-10 py-7 transition-all group/prod'
                            )}
                          >
                            <div className="flex justify-between items-start gap-6 mb-3">
                              <p className={`text-[17px] font-executive font-extrabold italic uppercase tracking-tight transition-colors ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-950 dark:text-white'}`}>{product.name}</p>
                              <span className="text-[12px] font-black text-white bg-zinc-950 px-4 py-1.5 rounded-2xl shadow-glow-indigo tabular-nums italic">
                                {formatMoney(product.price, product.currency)}
                              </span>
                            </div>
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] italic opacity-50 group-hover/prod:opacity-100 group-hover/prod:text-indigo-500 transition-all">LINK INJECTION PROTOCOL</p>
                          </button>
                        )}
                      </Menu.Item>
                    ))
                  )}
                </div>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>

        <AnimatePresence>
          {replyingTo && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              className="max-w-5xl mx-auto mb-3 relative group"
            >
              <div className="vysify-glass rounded-2xl border border-indigo-500/30 overflow-hidden flex items-stretch">
                <div className="w-1.5 bg-indigo-500" />
                <div className="flex-1 p-3 px-5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 italic">
                      {replyingTo.direction === 'INBOUND' ? conversation?.contact?.name || 'Cliente' : 'Você'}
                    </span>
                    <button 
                      onClick={() => setReplyingTo(null)}
                      className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[13px] text-zinc-500 dark:text-zinc-400 line-clamp-1 italic font-medium">
                    {replyingTo.content}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSend} className="relative flex items-center gap-2 sm:gap-3 max-w-5xl mx-auto">
          <div className="relative flex-1 group/input min-w-0">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/15 to-purple-500/15 rounded-2xl blur-lg opacity-0 group-focus-within/input:opacity-100 transition duration-700" />
            <textarea
              rows={1}
              className="relative w-full px-4 py-2.5 sm:px-5 sm:py-3 lg:px-6 lg:py-3.5 bg-white dark:bg-zinc-900/90 border border-zinc-100 dark:border-zinc-800 rounded-xl sm:rounded-2xl text-[13px] sm:text-[14px] dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all resize-none shadow-sm leading-relaxed max-h-36 sm:max-h-48 font-medium custom-scrollbar italic"
              placeholder={t('inbox.replyPlaceholder')}
              value={messageText || ''}
              onChange={(e) => {
                onMessageChange(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = (e.target.scrollHeight) + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.08, rotate: -3, y: -2 }}
            whileTap={{ scale: 0.92 }}
            type="submit"
            disabled={!messageText?.trim()}
            className="w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 flex items-center justify-center premium-gradient text-white rounded-xl sm:rounded-2xl shadow-lg shadow-indigo-600/30 disabled:opacity-30 disabled:grayscale transition-all shrink-0 group/send"
          >
            <PaperAirplaneIcon className="w-4 h-4 sm:w-5 sm:h-5 -rotate-25 ml-0.5 transition-transform group-hover/send:scale-110" />
          </motion.button>
        </form>
      </div>


      {/* Create Template Modal */}
      <Transition appear show={isTemplateModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsTemplateModalOpen(false)}>
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
                    <div className="w-20 h-20 bg-brand-50 dark:bg-brand-900/20 rounded-[32px] flex items-center justify-center mx-auto mb-6 border border-brand-100/50 dark:border-brand-500/20 shadow-glow-emerald/10">
                      <DocumentDuplicateIcon className="w-10 h-10 text-brand-600 dark:text-brand-400" />
                    </div>
                    <Dialog.Title as="h3" className="text-3xl font-executive font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tighter">
                      {t('inbox.templates.create.title')}
                    </Dialog.Title>
                    <p className="text-zinc-400 dark:text-zinc-500 font-medium mt-2 text-[15px]">{t('inbox.templates.create.subtitle') || 'Create reusable message responses'}</p>
                  </div>

                  <div className="space-y-8">
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] pl-1">{t('inbox.templates.create.name')}</label>
                      <input
                        type="text"
                        className="w-full px-6 py-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-[22px] text-[15px] font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-8 focus:ring-brand-500/5 focus:bg-white dark:focus:bg-zinc-800 focus:border-brand-500/30 transition-all font-executive"
                        value={newTemplateName}
                        onChange={(e) => setNewTemplateName(e.target.value)}
                        placeholder={t('inbox.templates.create.namePlaceholder')}
                      />
                    </div>
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] pl-1">{t('inbox.templates.create.content')}</label>
                      <textarea
                        className="w-full px-6 py-5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-[28px] text-[15px] font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-8 focus:ring-brand-500/5 focus:bg-white dark:focus:bg-zinc-800 focus:border-brand-500/30 transition-all resize-none font-executive leading-relaxed"
                        rows={6}
                        value={newTemplateContent}
                        onChange={(e) => setNewTemplateContent(e.target.value)}
                        placeholder={t('inbox.templates.create.contentPlaceholder')}
                      />
                    </div>
                  </div>

                  <div className="mt-12 flex flex-col sm:flex-row-reverse gap-4">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      className="flex-1 py-4 bg-brand-600 premium-gradient text-white rounded-[22px] text-sm font-black uppercase tracking-widest shadow-glow-emerald disabled:opacity-40"
                      onClick={handleCreateTemplate}
                      disabled={!newTemplateName || !newTemplateContent}
                    >
                      {t('common.action.create')}
                    </motion.button>
                    <button
                      type="button"
                      className="flex-1 py-4 bg-white dark:bg-zinc-800 text-zinc-400 rounded-[22px] text-sm font-black uppercase tracking-widest border border-zinc-100 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all"
                      onClick={() => setIsTemplateModalOpen(false)}
                    >
                      {t('common.action.cancel')}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* AI Summary Modal */}
      <Transition appear show={isSummaryModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsSummaryModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-zinc-950/40 backdrop-blur-md" />
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
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-[40px] bg-white dark:bg-zinc-900 p-12 text-left align-middle shadow-premium transition-all border border-zinc-100 dark:border-zinc-800 relative">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-brand-50/50 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
                  
                  <div className="mb-10 flex items-center gap-6 relative z-10">
                    <div className="w-20 h-20 bg-brand-600 premium-gradient rounded-[32px] flex items-center justify-center border border-brand-500 shadow-glow-emerald/30">
                      <SparklesIcon className="w-10 h-10 text-white animate-pulse" />
                    </div>
                    <div>
                      <Dialog.Title as="h3" className="text-3xl font-executive font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tighter">
                        AI Insights Engine
                      </Dialog.Title>
                      <p className="text-zinc-400 dark:text-zinc-500 font-medium text-[15px] mt-1 italic">Executive conversation analysis</p>
                    </div>
                  </div>

                  <div className="mt-8 relative z-10 bg-zinc-50/50 dark:bg-zinc-950/50 rounded-[32px] border border-zinc-100 dark:border-zinc-800 p-8 shadow-inner overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-500 to-transparent opacity-20" />
                    <pre className="whitespace-pre-wrap text-[15px] font-medium text-zinc-700 dark:text-zinc-300 font-executive leading-[1.8] max-h-[50vh] overflow-auto custom-scrollbar pr-4 italic">
                      {summaryText}
                    </pre>
                  </div>

                  <div className="mt-12 flex flex-col sm:flex-row-reverse gap-4 relative z-10">
                    <CopyToClipboard text={summaryText} onCopy={() => toast.success(t('common.copied'))}>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        className="flex-1 py-4 bg-brand-600 premium-gradient text-white rounded-[22px] text-sm font-black uppercase tracking-widest shadow-glow-emerald disabled:opacity-50"
                        disabled={!summaryText}
                      >
                        {t('common.action.copy')}
                      </motion.button>
                    </CopyToClipboard>
                    <button
                      type="button"
                      className="flex-1 py-4 bg-white dark:bg-zinc-800 text-zinc-400 rounded-[22px] text-sm font-black uppercase tracking-widest border border-zinc-100 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all font-executive"
                      onClick={() => setIsSummaryModalOpen(false)}
                    >
                      {t('common.action.close') || 'Dismiss'}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Schedule Modal */}
      <Transition appear show={isScheduleModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsScheduleModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-zinc-950/40 backdrop-blur-md" />
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
                <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-[40px] bg-white dark:bg-zinc-900 p-12 text-left align-middle shadow-premium transition-all border border-zinc-100 dark:border-zinc-800">
                  <div className="mb-10 flex items-center gap-6">
                    <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-[24px] flex items-center justify-center border border-blue-100 dark:border-blue-500/20 shadow-sm">
                      <CalendarDaysIcon className="w-9 h-9 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <Dialog.Title as="h3" className="text-3xl font-executive font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tighter">
                        Smart Scheduler
                      </Dialog.Title>
                      <p className="text-zinc-400 dark:text-zinc-500 font-medium text-[15px] mt-1">Google Calendar Integration</p>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2.5">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">{t('inbox.schedule.summary')}</label>
                        <input
                          type="text"
                          className="w-full px-6 py-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-[22px] text-[15px] font-bold text-zinc-900 dark:text-white focus:outline-none focus:ring-8 focus:ring-blue-500/5 focus:bg-white dark:focus:bg-zinc-800 focus:border-blue-500/30 transition-all font-executive"
                          value={scheduleConfig.summary || ''}
                          onChange={(e) => setScheduleConfig((p) => ({ ...p, summary: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2.5">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">{t('inbox.schedule.description')}</label>
                        <input
                          type="text"
                          className="w-full px-6 py-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-[22px] text-[15px] font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-8 focus:ring-blue-500/5 focus:bg-white dark:focus:bg-zinc-800 focus:border-blue-500/30 transition-all font-executive"
                          value={scheduleConfig.description || ''}
                          onChange={(e) => setScheduleConfig((p) => ({ ...p, description: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 pt-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={checkAvailability}
                        disabled={isCheckingAvailability}
                        className="flex-1 min-w-[200px] py-4 bg-zinc-900 text-white rounded-[22px] text-sm font-black uppercase tracking-widest shadow-xl disabled:opacity-50"
                      >
                        {isCheckingAvailability ? t('common.loading') : t('inbox.schedule.availability.check')}
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="button"
                        onClick={insertStep1Message}
                        disabled={!availability?.suggestions?.length}
                        className="flex-1 min-w-[200px] py-4 bg-brand-600 premium-gradient text-white rounded-[22px] text-sm font-black uppercase tracking-widest shadow-glow-emerald disabled:opacity-50"
                      >
                        {t('inbox.schedule.step1.insert')}
                      </motion.button>
                    </div>

                    <AnimatePresence>
                      {availability?.suggestions?.length && (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-[32px] border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 p-8 space-y-6"
                        >
                          <div className="text-xs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-glow-indigo" />
                            {t('inbox.schedule.slots')}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {availability.suggestions.map((s) => (
                              <label key={s.start} className={`group flex items-center gap-4 px-6 py-4 bg-white dark:bg-zinc-900 border rounded-[22px] cursor-pointer transition-all duration-300 ${
                                selectedSlotStart === s.start ? 'border-blue-500 dark:border-blue-400 shadow-glow-indigo ring-1 ring-blue-500/20' : 'border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 shadow-premium-sm'
                              }`}>
                                <input
                                  type="radio"
                                  name="slot"
                                  value={s.start}
                                  checked={selectedSlotStart === s.start}
                                  onChange={(e) => setSelectedSlotStart(e.target.value)}
                                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 transition-all border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                                />
                                <div className="flex flex-col">
                                  <span className={`text-[13px] font-black uppercase tracking-tight transition-colors ${selectedSlotStart === s.start ? 'text-blue-700 dark:text-blue-400' : 'text-zinc-600 dark:text-zinc-300'}`}>
                                    {formatSlot(s.start).split(',')[0]}
                                  </span>
                                  <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500">
                                    {formatSlot(s.start).split(',')[1]}
                                  </span>
                                </div>
                              </label>
                            ))}
                          </div>
                          <div className="pt-2">
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              type="button"
                              onClick={createEvent}
                              disabled={!selectedSlotStart || isScheduling}
                              className="w-full py-5 bg-emerald-600 premium-gradient text-white rounded-[24px] text-sm font-black uppercase tracking-widest shadow-glow-emerald disabled:opacity-50"
                            >
                              {isScheduling ? t('common.loading') : t('inbox.schedule.event.create')}
                            </motion.button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {scheduledEvent?.id && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="rounded-[32px] border border-emerald-100 dark:border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-500/10 p-8 relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-xl" />
                        <div className="relative z-10">
                          <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-4 flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-glow-emerald" />
                            {t('inbox.schedule.event.createdTitle')}
                          </div>
                          <div className="flex flex-col gap-2">
                            <div className="text-xl font-executive font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">{scheduledEvent.summary || scheduleConfig.summary}</div>
                            <div className="text-[15px] font-bold text-zinc-500 dark:text-zinc-500 italic">{formatSlot(scheduledEvent.start)}</div>
                            {scheduledEvent.htmlLink && (
                              <a href={scheduledEvent.htmlLink} target="_blank" rel="noreferrer" className="text-sm font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 mt-2 transition-colors">
                                {t('inbox.schedule.event.openLink')}
                              </a>
                            )}
                          </div>

                          <div className="mt-8 flex flex-col sm:flex-row gap-4">
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              type="button"
                              onClick={insertStep2Message}
                              className="flex-1 py-4 bg-brand-600 premium-gradient text-white rounded-[20px] text-[11px] font-black uppercase tracking-widest shadow-glow-emerald"
                            >
                              {t('inbox.schedule.step2.insert')}
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              type="button"
                              onClick={rescheduleEvent}
                              disabled={!selectedSlotStart || isRescheduling}
                              className="flex-1 py-4 bg-zinc-900 text-white rounded-[20px] text-[11px] font-black uppercase tracking-widest shadow-xl disabled:opacity-50"
                            >
                              {isRescheduling ? t('common.loading') : t('inbox.schedule.event.reschedule')}
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              type="button"
                              onClick={cancelEvent}
                              disabled={isCanceling}
                              className="flex-1 py-4 bg-white text-red-600 border border-red-100 rounded-[20px] text-[11px] font-black uppercase tracking-widest hover:bg-red-50 transition-all disabled:opacity-50"
                            >
                              {isCanceling ? t('common.loading') : t('inbox.schedule.event.cancel')}
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <div className="mt-12 flex justify-end relative z-10">
                    <button
                      type="button"
                      className="px-8 py-4 bg-zinc-50 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 rounded-[20px] text-xs font-black uppercase tracking-widest hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-all border border-zinc-100 dark:border-zinc-700"
                      onClick={() => setIsScheduleModalOpen(false)}
                    >
                      {t('common.action.cancel')}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};

export default ChatWindow;
