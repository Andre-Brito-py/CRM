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
  CameraIcon
} from '@heroicons/react/24/outline';
import { Menu, Transition, Dialog } from '@headlessui/react';
import MessageBubble from './MessageBubble';
import { useTranslation } from 'react-i18next';
import Paywall from '@/components/Paywall';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import toast from 'react-hot-toast';
import api from '@/lib/common/api';
import { motion, AnimatePresence } from 'framer-motion';

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
      onSendMessage(messageText);
      onMessageChange('');
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
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-50/20 h-full p-12 text-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-32 h-32 bg-white rounded-[48px] shadow-premium flex items-center justify-center mb-10 border border-zinc-100"
        >
          <PaperAirplaneIcon className="w-12 h-12 text-zinc-200 -rotate-45" />
        </motion.div>
        <h2 className="text-zinc-900 text-3xl font-executive font-extrabold tracking-tighter mb-3">
          {t('inbox.chat.empty.title')}
        </h2>
        <p className="text-zinc-400 text-lg font-executive font-medium max-w-sm mx-auto leading-relaxed">
          {t('inbox.chat.empty.subtitle')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center bg-white/90 backdrop-blur-md sticky top-0 z-30 shrink-0">
        <div className="flex items-center gap-4">
          {onBack && (
            <motion.button 
              whileHover={{ x: -2 }}
              onClick={onBack} 
              className="md:hidden p-2 -ml-2 text-zinc-400 hover:text-zinc-900 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </motion.button>
          )}
          <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center border overflow-hidden relative">
            {conversation.contact?.image ? (
              <img src={conversation.contact.image} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-bold text-zinc-400">
                {conversation.contact?.name?.charAt(0) || '?'}
              </span>
            )}
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-white rounded-full flex items-center justify-center border border-white z-10">
              <PlatformIcon platform={conversation.platform} className="w-2.5 h-2.5" />
            </div>
          </div>
          <div>
            <h3 className="text-[16px] font-semibold text-zinc-900 tracking-tight leading-none mb-1.5">
              {conversation.contact?.name || conversation.externalId || t('common.unknown')}
            </h3>
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[11px] font-medium text-emerald-600">
                  Active
                </span>
              </div>
              <span className="text-[10px] text-zinc-300">•</span>
              <div className="flex items-center gap-1.5">
                <PlatformIcon platform={conversation.platform} className="w-3 h-3 text-zinc-400" />
                <span className="text-[11px] font-medium text-zinc-500 capitalize">
                  {String(conversation.platform).toLowerCase()}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => onToggleAutopilot?.(!conversation.autopilotEnabled)}
            disabled={!onToggleAutopilot || isTogglingAutopilot}
            className={classNames(
              'group flex items-center gap-3 px-6 py-3 text-xs font-black uppercase tracking-widest rounded-[18px] border-2 transition-all duration-500',
              conversation.autopilotEnabled 
                ? 'bg-brand-600 border-brand-500 text-white shadow-glow-indigo/30' 
                : 'bg-white border-zinc-100 text-zinc-500 hover:border-zinc-200 hover:bg-zinc-50 shadow-premium-sm'
            )}
          >
            <SparklesIcon className={`w-4 h-4 ${conversation.autopilotEnabled ? 'animate-pulse' : 'text-zinc-400 group-hover:text-brand-500'}`} />
            <span className="hidden lg:inline">Autopilot:</span> {conversation.autopilotEnabled ? 'ON' : 'OFF'}
          </motion.button>

          <div className="h-10 w-[1px] bg-zinc-100 mx-1" />

          <Menu as="div" className="relative inline-block text-left">
            <Menu.Button className="flex items-center group bg-zinc-50 p-1.5 pr-3 rounded-full border border-zinc-200 hover:bg-zinc-100 transition-colors">
              <div className="w-8 h-8 bg-white rounded-full border border-zinc-200 flex items-center justify-center overflow-hidden mr-2">
                {conversation.assignee?.image ? (
                  <img src={conversation.assignee.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <UserCircleIcon className="w-5 h-5 text-zinc-400" />
                )}
              </div>
              <div className="flex flex-col items-start mr-1">
                <span className="text-[10px] font-medium text-zinc-400 leading-none mb-0.5">Owner</span>
                <span className="text-[12px] font-semibold text-zinc-700 leading-none">
                  {conversation.assignee?.name || t('inbox.filter.unassigned')}
                </span>
              </div>
              <ChevronDownIcon className="w-4 h-4 ml-1 text-zinc-400 group-hover:text-zinc-600 transition-colors" />
            </Menu.Button>

            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 w-64 mt-3 origin-top-right bg-white rounded-2xl shadow-premium ring-1 ring-black ring-opacity-5 focus:outline-none z-20 overflow-hidden divide-y divide-zinc-50">
                <div className="px-4 py-3 bg-zinc-50/50">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Select Agent</p>
                </div>
                <div className="py-2">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => onAssign(null)}
                        className={classNames(
                          active ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-600',
                          'block w-full text-left px-4 py-3 text-[13px] font-bold uppercase tracking-tight'
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
                            active ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-600',
                            'flex w-full items-center px-4 py-3 text-[13px] font-bold uppercase tracking-tight gap-3'
                          )}
                        >
                          <div className="w-8 h-8 rounded-lg overflow-hidden border border-zinc-200/50 flex-shrink-0">
                            {member.member.image ? (
                              <img src={member.member.image} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <UserCircleIcon className="w-full h-full text-zinc-200" />
                            )}
                          </div>
                          {member.member.name || member.member.email}
                        </button>
                      )}
                    </Menu.Item>
                  ))}
                </div>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </div>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#f0f2f5] custom-scrollbar relative">
        <div className="absolute inset-0 bg-grid-zinc-100/50 [mask-image:linear-gradient(to_bottom,white,transparent)] pointer-events-none" />
        <AnimatePresence mode="popLayout">
          {conversation.messages?.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full opacity-30"
            >
              <span className="text-[12px] font-black uppercase tracking-[0.3em] text-zinc-400">No signals received</span>
            </motion.div>
          ) : (
            conversation.messages?.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isMe={message.direction === 'OUTBOUND'}
              />
            ))
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-[#f0f2f5] border-t border-zinc-200 shrink-0 z-20">
        {/* Unified Toolbar */}
        <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
          <Paywall
            minPlan="PREMIUM"
            fallback={
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  disabled
                  className="flex items-center gap-2.5 px-5 py-2.5 bg-zinc-50 text-zinc-300 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-zinc-100 cursor-not-allowed"
                >
                  <SparklesIcon className="w-4 h-4" />
                  {t('inbox.ai.suggest')}
                </button>
                <button
                  type="button"
                  disabled
                  className="flex items-center gap-2.5 px-5 py-2.5 bg-zinc-50 text-zinc-300 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-zinc-100 cursor-not-allowed"
                >
                  <DocumentTextIcon className="w-4 h-4" />
                  {t('inbox.ai.summarize')}
                </button>
              </div>
            }
          >
            <div className="flex items-center gap-3 shrink-0">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onGenerateResponse?.({ objective: aiObjective })}
                disabled={isGeneratingAI || !aiSuggestOnlyEnabled}
                className={`flex items-center gap-2.5 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all duration-300 ${
                  aiSuggestOnlyEnabled 
                    ? 'bg-brand-50 border-brand-100 text-brand-700 hover:bg-brand-100 hover:shadow-glow-emerald/20' 
                    : 'bg-zinc-50 border-zinc-100 text-zinc-300'
                }`}
              >
                <SparklesIcon className={`w-4 h-4 ${isGeneratingAI ? 'animate-spin' : ''}`} />
                {isGeneratingAI ? t('common.loading') : t('inbox.ai.suggest')}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSummarize}
                disabled={isSummarizingAI}
                className="flex items-center gap-2.5 px-6 py-2.5 bg-white text-zinc-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-zinc-200/60 hover:border-zinc-300 hover:text-zinc-900 transition-all shadow-premium-sm"
              >
                <DocumentTextIcon className="w-4 h-4" />
                {isSummarizingAI ? t('common.loading') : t('inbox.ai.summarize')}
              </motion.button>
              
              <div className="flex items-center gap-4 ml-3 p-1 bg-zinc-50/50 rounded-[18px] border border-zinc-100">
                <label className="flex items-center gap-2.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-400 select-none cursor-pointer hover:text-zinc-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={Boolean(aiSuggestOnlyEnabled)}
                    onChange={(e) => onAiSuggestOnlyEnabledChange?.(e.target.checked)}
                    className="h-4 w-4 rounded-lg border-zinc-300 text-brand-600 focus:ring-brand-500/20 transition-all"
                  />
                  Suggest
                </label>
                <select
                  value={aiObjective || ''}
                  onChange={(e) => onAiObjectiveChange?.(e.target.value)}
                  className="h-9 rounded-[14px] bg-white border border-zinc-100 px-3 text-[10px] font-black uppercase tracking-widest text-zinc-600 focus:outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500/30 transition-all font-executive shadow-premium-sm"
                >
                  <option value="support">{t('inbox.ai.objective.support')}</option>
                  <option value="qualify">{t('inbox.ai.objective.qualify')}</option>
                  <option value="close">{t('inbox.ai.objective.close')}</option>
                  <option value="schedule">{t('inbox.ai.objective.schedule')}</option>
                </select>
              </div>
            </div>
          </Paywall>

          <div className="h-6 w-[1px] bg-zinc-100 mx-3 shrink-0" />

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => setIsScheduleModalOpen(true)}
            disabled={aiObjective !== 'schedule'}
            className="flex items-center gap-2.5 px-6 py-2.5 bg-white text-zinc-500 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-zinc-200/60 hover:border-zinc-300 hover:text-zinc-950 transition-all shrink-0 disabled:opacity-30 shadow-premium-sm"
          >
            <CalendarDaysIcon className="w-4 h-4" />
            {t('inbox.schedule.title')}
          </motion.button>

          <Menu as="div" className="relative inline-block text-left shrink-0">
            <Menu.Button className="flex items-center gap-2.5 px-6 py-2.5 bg-white text-zinc-500 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-zinc-200/60 hover:border-zinc-300 hover:text-zinc-950 transition-all shadow-premium-sm">
              <DocumentDuplicateIcon className="w-4 h-4" />
              {t('inbox.templates.title')}
            </Menu.Button>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-200"
              enterFrom="transform opacity-0 scale-95 translate-y-2"
              enterTo="transform opacity-100 scale-100 translate-y-0"
              leave="transition ease-in duration-150"
              leaveFrom="transform opacity-100 scale-100 translate-y-0"
              leaveTo="transform opacity-0 scale-95 translate-y-2"
            >
              <Menu.Items className="absolute bottom-full left-0 mb-4 w-80 origin-bottom-left bg-white rounded-[24px] shadow-premium ring-1 ring-black ring-opacity-5 focus:outline-none z-50 overflow-hidden divide-y divide-zinc-50">
                <div className="px-6 py-4 bg-zinc-50/50 flex justify-between items-center">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('inbox.templates.title')}</p>
                  <button type="button" onClick={() => setIsTemplateModalOpen(true)} className="p-1.5 hover:bg-zinc-200 rounded-lg transition-all">
                    <PlusIcon className="w-3.5 h-3.5 text-zinc-600" />
                  </button>
                </div>
                <div className="py-2 max-h-72 overflow-y-auto custom-scrollbar">
                  {templates.length === 0 ? (
                    <div className="px-8 py-6 text-center">
                      <p className="text-xs font-bold text-zinc-400 italic">{t('inbox.templates.empty')}</p>
                    </div>
                  ) : (
                    templates.map((template) => (
                      <Menu.Item key={template.id}>
                        {({ active }) => (
                          <button
                            type="button"
                            onClick={() => onMessageChange(template.content)}
                            className={classNames(
                              active ? 'bg-zinc-50' : '',
                              'block w-full text-left px-6 py-4 group transition-all duration-300'
                            )}
                          >
                            <p className={`text-[14px] font-extrabold mb-1 transition-colors ${active ? 'text-brand-600' : 'text-zinc-900'}`}>{template.name}</p>
                            <p className="text-[11px] font-medium text-zinc-400 truncate tracking-tight">{template.content}</p>
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
            <Menu.Button className="flex items-center gap-2.5 px-6 py-2.5 bg-white text-zinc-500 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-zinc-200/60 hover:border-zinc-300 hover:text-zinc-950 transition-all shadow-premium-sm">
              <CreditCardIcon className="w-4 h-4" />
              Produtos
            </Menu.Button>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-200"
              enterFrom="transform opacity-0 scale-95 translate-y-2"
              enterTo="transform opacity-100 scale-100 translate-y-0"
              leave="transition ease-in duration-150"
              leaveFrom="transform opacity-100 scale-100 translate-y-0"
              leaveTo="transform opacity-0 scale-95 translate-y-2"
            >
              <Menu.Items className="absolute bottom-full left-0 mb-4 w-80 origin-bottom-left bg-white rounded-[24px] shadow-premium ring-1 ring-black ring-opacity-5 focus:outline-none z-50 overflow-hidden divide-y divide-zinc-50">
                <div className="px-6 py-4 bg-zinc-50/50">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Available Products</p>
                </div>
                <div className="py-2 max-h-72 overflow-y-auto custom-scrollbar">
                  {paymentProducts.length === 0 ? (
                    <div className="px-8 py-6 text-center">
                      <p className="text-xs font-bold text-zinc-400 italic">No active products</p>
                    </div>
                  ) : (
                    paymentProducts.map((product) => (
                      <Menu.Item key={product.id}>
                        {({ active }) => (
                          <button
                            type="button"
                            onClick={() => appendToMessage(`${window.location.origin}/p/${workspaceSlug}/${product.slug}`)}
                            className={classNames(
                              active ? 'bg-zinc-50' : '',
                              'block w-full text-left px-6 py-4 group transition-all duration-300'
                            )}
                          >
                            <div className="flex justify-between items-start gap-4 mb-1.5">
                              <p className={`text-[14px] font-extrabold truncate transition-colors ${active ? 'text-brand-600' : 'text-zinc-900'}`}>{product.name}</p>
                              <span className="text-[12px] font-black text-brand-600 bg-brand-50 px-2 py-0.5 rounded-lg tabular-nums">
                                {formatMoney(product.price, product.currency)}
                              </span>
                            </div>
                            <p className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.2em]">Click to insert link</p>
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

        <form onSubmit={handleSend} className="relative flex items-end gap-3">
          <textarea
            rows={1}
            className="w-full px-4 py-3 bg-white border border-transparent rounded-lg text-[15px] placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500/30 transition-all resize-none shadow-sm leading-relaxed max-h-32"
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
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={!messageText?.trim()}
            className="p-3 bg-brand-600 text-white rounded-lg shadow-sm disabled:opacity-50 disabled:bg-zinc-300 transition-colors shrink-0"
          >
            <PaperAirplaneIcon className="w-5 h-5 -rotate-45" />
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
                <Dialog.Panel className="w-full max-w-xl transform overflow-hidden rounded-[40px] bg-white p-12 text-left align-middle shadow-premium transition-all border border-zinc-100">
                  <div className="mb-10 text-center">
                    <div className="w-20 h-20 bg-brand-50 rounded-[32px] flex items-center justify-center mx-auto mb-6 border border-brand-100/50 shadow-glow-emerald/10">
                      <DocumentDuplicateIcon className="w-10 h-10 text-brand-600" />
                    </div>
                    <Dialog.Title as="h3" className="text-3xl font-executive font-extrabold text-zinc-900 tracking-tighter">
                      {t('inbox.templates.create.title')}
                    </Dialog.Title>
                    <p className="text-zinc-400 font-medium mt-2 text-[15px]">{t('inbox.templates.create.subtitle') || 'Create reusable message responses'}</p>
                  </div>

                  <div className="space-y-8">
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] pl-1">{t('inbox.templates.create.name')}</label>
                      <input
                        type="text"
                        className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-[22px] text-[15px] font-medium focus:outline-none focus:ring-8 focus:ring-brand-500/5 focus:bg-white focus:border-brand-500/30 transition-all font-executive"
                        value={newTemplateName}
                        onChange={(e) => setNewTemplateName(e.target.value)}
                        placeholder={t('inbox.templates.create.namePlaceholder')}
                      />
                    </div>
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] pl-1">{t('inbox.templates.create.content')}</label>
                      <textarea
                        className="w-full px-6 py-5 bg-zinc-50 border border-zinc-100 rounded-[28px] text-[15px] font-medium focus:outline-none focus:ring-8 focus:ring-brand-500/5 focus:bg-white focus:border-brand-500/30 transition-all resize-none font-executive leading-relaxed"
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
                      className="flex-1 py-4 bg-white text-zinc-400 rounded-[22px] text-sm font-black uppercase tracking-widest border border-zinc-100 hover:bg-zinc-50 transition-all"
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
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-[40px] bg-white p-12 text-left align-middle shadow-premium transition-all border border-zinc-100 relative">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-brand-50/50 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
                  
                  <div className="mb-10 flex items-center gap-6 relative z-10">
                    <div className="w-20 h-20 bg-brand-600 premium-gradient rounded-[32px] flex items-center justify-center border border-brand-500 shadow-glow-emerald/30">
                      <SparklesIcon className="w-10 h-10 text-white animate-pulse" />
                    </div>
                    <div>
                      <Dialog.Title as="h3" className="text-3xl font-executive font-extrabold text-zinc-900 tracking-tighter">
                        AI Insights Engine
                      </Dialog.Title>
                      <p className="text-zinc-400 font-medium text-[15px] mt-1 italic">Executive conversation analysis</p>
                    </div>
                  </div>

                  <div className="mt-8 relative z-10 bg-zinc-50/50 rounded-[32px] border border-zinc-100 p-8 shadow-inner overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-500 to-transparent opacity-20" />
                    <pre className="whitespace-pre-wrap text-[15px] font-medium text-zinc-700 font-executive leading-[1.8] max-h-[50vh] overflow-auto custom-scrollbar pr-4 italic">
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
                      className="flex-1 py-4 bg-white text-zinc-400 rounded-[22px] text-sm font-black uppercase tracking-widest border border-zinc-100 hover:bg-zinc-50 transition-all"
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
                <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-[40px] bg-white p-12 text-left align-middle shadow-premium transition-all border border-zinc-100">
                  <div className="mb-10 flex items-center gap-6">
                    <div className="w-16 h-16 bg-blue-50 rounded-[24px] flex items-center justify-center border border-blue-100 shadow-sm">
                      <CalendarDaysIcon className="w-9 h-9 text-blue-600" />
                    </div>
                    <div>
                      <Dialog.Title as="h3" className="text-3xl font-executive font-extrabold text-zinc-900 tracking-tighter">
                        Smart Scheduler
                      </Dialog.Title>
                      <p className="text-zinc-400 font-medium text-[15px] mt-1">Google Calendar Integration</p>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2.5">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">{t('inbox.schedule.summary')}</label>
                        <input
                          type="text"
                          className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-[22px] text-[15px] font-bold focus:outline-none focus:ring-8 focus:ring-blue-500/5 focus:bg-white focus:border-blue-500/30 transition-all font-executive"
                          value={scheduleConfig.summary || ''}
                          onChange={(e) => setScheduleConfig((p) => ({ ...p, summary: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2.5">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">{t('inbox.schedule.description')}</label>
                        <input
                          type="text"
                          className="w-full px-6 py-4 bg-zinc-50 border border-zinc-100 rounded-[22px] text-[15px] font-medium focus:outline-none focus:ring-8 focus:ring-blue-500/5 focus:bg-white focus:border-blue-500/30 transition-all font-executive"
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
                          className="rounded-[32px] border border-zinc-100 bg-zinc-50/50 p-8 space-y-6"
                        >
                          <div className="text-xs font-black text-zinc-400 uppercase tracking-widest flex items-center gap-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-glow-indigo" />
                            {t('inbox.schedule.slots')}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {availability.suggestions.map((s) => (
                              <label key={s.start} className={`group flex items-center gap-4 px-6 py-4 bg-white border rounded-[22px] cursor-pointer transition-all duration-300 ${
                                selectedSlotStart === s.start ? 'border-blue-500 shadow-glow-indigo ring-1 ring-blue-500/20' : 'border-zinc-100 hover:border-zinc-200 shadow-premium-sm'
                              }`}>
                                <input
                                  type="radio"
                                  name="slot"
                                  value={s.start}
                                  checked={selectedSlotStart === s.start}
                                  onChange={(e) => setSelectedSlotStart(e.target.value)}
                                  className="h-5 w-5 text-blue-600 focus:ring-blue-500 transition-all border-zinc-200"
                                />
                                <div className="flex flex-col">
                                  <span className={`text-[13px] font-black uppercase tracking-tight transition-colors ${selectedSlotStart === s.start ? 'text-blue-700' : 'text-zinc-600'}`}>
                                    {formatSlot(s.start).split(',')[0]}
                                  </span>
                                  <span className="text-xs font-bold text-zinc-400">
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
                        className="rounded-[32px] border border-emerald-100 bg-emerald-50/30 p-8 relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-xl" />
                        <div className="relative z-10">
                          <div className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-4 flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-glow-emerald" />
                            {t('inbox.schedule.event.createdTitle')}
                          </div>
                          <div className="flex flex-col gap-2">
                            <div className="text-xl font-executive font-extrabold text-zinc-900 tracking-tight">{scheduledEvent.summary || scheduleConfig.summary}</div>
                            <div className="text-[15px] font-bold text-zinc-500 italic">{formatSlot(scheduledEvent.start)}</div>
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
                      className="px-8 py-4 bg-zinc-50 text-zinc-400 rounded-[20px] text-xs font-black uppercase tracking-widest hover:bg-zinc-100 transition-all border border-zinc-100"
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
