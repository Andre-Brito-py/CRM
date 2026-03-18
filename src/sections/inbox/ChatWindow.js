import { useState, useRef, useEffect, Fragment } from 'react';
import { PaperAirplaneIcon, UserCircleIcon, ChevronDownIcon, DocumentDuplicateIcon, PlusIcon, SparklesIcon, ArrowLeftIcon, DocumentTextIcon, CreditCardIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { Menu, Transition, Dialog } from '@headlessui/react';
import MessageBubble from './MessageBubble';
import { useTranslation } from 'react-i18next';
import Paywall from '@/components/Paywall';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import toast from 'react-hot-toast';
import api from '@/lib/common/api';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

const formatMoney = (value, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: String(currency || 'BRL').toUpperCase(),
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

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
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-50/30 h-full p-12">
        <div className="w-24 h-24 bg-white/80 rounded-[40px] shadow-premium flex items-center justify-center mb-8 border border-zinc-100">
          <PaperAirplaneIcon className="w-10 h-10 text-zinc-200 -rotate-45" />
        </div>
        <p className="text-zinc-400 text-lg font-executive font-semibold tracking-tight">
          {t('inbox.chat.empty.title')}
        </p>
        <p className="text-zinc-300 text-sm mt-2 font-medium">{t('inbox.chat.empty.subtitle')}</p>
      </div>
    );
  } return (
    <div className="flex-1 flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="px-8 py-6 border-b border-zinc-100 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-5">
          {onBack && (
            <button onClick={onBack} className="md:hidden p-2 -ml-2 text-zinc-400 hover:text-zinc-900 transition-colors">
              <ArrowLeftIcon className="w-6 h-6" />
            </button>
          )}
          <div className="w-14 h-14 bg-zinc-100 rounded-2xl flex items-center justify-center border border-zinc-200/50 shadow-sm overflow-hidden bg-gradient-to-br from-white to-zinc-50">
            {conversation.contact?.image ? (
              <img src={conversation.contact.image} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-executive font-bold text-zinc-400">
                {conversation.contact?.name?.charAt(0) || '?'}
              </span>
            )}
          </div>
          <div>
            <h3 className="text-2xl font-executive font-bold text-zinc-900 tracking-tight leading-none mb-2">
              {conversation.contact?.name || conversation.externalId || t('common.unknown')}
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-zinc-100 rounded-full px-2.5 py-0.5 border border-zinc-200/30">
                <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">
                  Online
                </span>
              </div>
              <span className="text-xs font-bold text-zinc-300">/</span>
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.1em] leading-none">
                {conversation.platform}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => onToggleAutopilot?.(!conversation.autopilotEnabled)}
            disabled={!onToggleAutopilot || isTogglingAutopilot}
            className={classNames(
              'group flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-widest rounded-xl border transition-all duration-300',
              conversation.autopilotEnabled 
                ? 'bg-brand-600 border-brand-500 text-white shadow-lg shadow-brand-500/20' 
                : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50'
            )}
          >
            <SparklesIcon className={`w-4 h-4 ${conversation.autopilotEnabled ? 'animate-pulse' : 'text-zinc-400 group-hover:text-brand-500'}`} />
            Autopilot: {conversation.autopilotEnabled ? 'ON' : 'OFF'}
          </button>

          <div className="h-8 w-[1px] bg-zinc-100" />

          <Menu as="div" className="relative inline-block text-left">
            <Menu.Button className="flex items-center group">
              <div className="flex flex-col items-end mr-3">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">Assignee</span>
                <span className="text-xs font-bold text-zinc-900 group-hover:text-brand-600 transition-colors uppercase tracking-tight">
                  {conversation.assignee?.name || t('inbox.filter.unassigned')}
                </span>
              </div>
              <div className="w-10 h-10 bg-zinc-50 rounded-xl border border-zinc-200/50 flex items-center justify-center group-hover:border-zinc-300 transition-all overflow-hidden">
                {conversation.assignee?.image ? (
                  <img src={conversation.assignee.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <UserCircleIcon className="w-6 h-6 text-zinc-300" />
                )}
              </div>
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
      <div className="flex-1 overflow-y-auto p-8 space-y-2 bg-[#f9fafb] custom-scrollbar">
        {conversation.messages?.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-40">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400">No messages yet</span>
          </div>
        ) : (
          conversation.messages?.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isMe={message.direction === 'OUTBOUND'}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-8 bg-white border-t border-zinc-100 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] shrink-0">
        {/* Unified Toolbar */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          <Paywall
            minPlan="PREMIUM"
            fallback={
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-50 text-zinc-300 rounded-xl text-[11px] font-bold uppercase tracking-wider border border-zinc-100 cursor-not-allowed"
                  title={t('paywall.title')}
                >
                  <SparklesIcon className="w-3.5 h-3.5" />
                  {t('inbox.ai.suggest')}
                </button>
                <button
                  type="button"
                  disabled
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-50 text-zinc-300 rounded-xl text-[11px] font-bold uppercase tracking-wider border border-zinc-100 cursor-not-allowed"
                  title={t('paywall.title')}
                >
                  <DocumentTextIcon className="w-3.5 h-3.5" />
                  {t('inbox.ai.summarize')}
                </button>
              </div>
            }
          >
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onGenerateResponse?.({ objective: aiObjective })}
                disabled={isGeneratingAI || !aiSuggestOnlyEnabled}
                className="flex items-center gap-2 px-4 py-2 bg-brand-50 text-brand-700 rounded-xl text-[11px] font-bold uppercase tracking-wider border border-brand-100 hover:bg-brand-100 transition-all group"
              >
                <SparklesIcon className={`w-3.5 h-3.5 ${isGeneratingAI ? 'animate-spin' : 'group-hover:scale-110 transition-transform'}`} />
                {isGeneratingAI ? t('common.loading') : t('inbox.ai.suggest')}
              </button>

              <button
                onClick={handleSummarize}
                disabled={isSummarizingAI}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-50 text-zinc-600 rounded-xl text-[11px] font-bold uppercase tracking-wider border border-zinc-100 hover:bg-zinc-100 transition-all group"
              >
                <DocumentTextIcon className="w-3.5 h-3.5 group-hover:text-zinc-900 transition-colors" />
                {isSummarizingAI ? t('common.loading') : t('inbox.ai.summarize')}
              </button>
              
              <div className="flex items-center gap-3 ml-2">
                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 select-none cursor-pointer hover:text-zinc-600 transition-colors">
                  <input
                    type="checkbox"
                    checked={Boolean(aiSuggestOnlyEnabled)}
                    onChange={(e) => onAiSuggestOnlyEnabledChange?.(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-zinc-300 text-brand-600 focus:ring-brand-500/20"
                  />
                  Suggest Only
                </label>
                <select
                  value={aiObjective || ''}
                  onChange={(e) => onAiObjectiveChange?.(e.target.value)}
                  className="h-8 rounded-lg bg-zinc-50/50 border border-zinc-100 px-2 text-[10px] font-bold uppercase tracking-tight text-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:bg-white transition-all"
                >
                  <option value="support">{t('inbox.ai.objective.support')}</option>
                  <option value="qualify">{t('inbox.ai.objective.qualify')}</option>
                  <option value="close">{t('inbox.ai.objective.close')}</option>
                  <option value="schedule">{t('inbox.ai.objective.schedule')}</option>
                </select>
              </div>
            </div>
          </Paywall>

          <div className="h-4 w-[1px] bg-zinc-100 mx-2 shrink-0" />

          <button
            type="button"
            onClick={() => setIsScheduleModalOpen(true)}
            disabled={aiObjective !== 'schedule'}
            className="flex items-center gap-2 px-4 py-2 bg-white text-zinc-500 rounded-xl text-[11px] font-bold uppercase tracking-wider border border-zinc-100 hover:border-zinc-300 hover:text-zinc-900 transition-all shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <CalendarDaysIcon className="w-3.5 h-3.5" />
            {t('inbox.schedule.title')}
          </button>

          <Menu as="div" className="relative inline-block text-left shrink-0">
            <Menu.Button className="flex items-center gap-2 px-4 py-2 bg-white text-zinc-500 rounded-xl text-[11px] font-bold uppercase tracking-wider border border-zinc-100 hover:border-zinc-300 hover:text-zinc-900 transition-all">
              <DocumentDuplicateIcon className="w-3.5 h-3.5" />
              {t('inbox.templates.title')}
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
              <Menu.Items className="absolute bottom-full left-0 mb-3 w-80 origin-bottom-left bg-white rounded-2xl shadow-premium ring-1 ring-black ring-opacity-5 focus:outline-none z-20 overflow-hidden divide-y divide-zinc-50">
                <div className="px-4 py-3 bg-zinc-50/50 flex justify-between items-center">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{t('inbox.templates.title')}</p>
                  <button type="button" onClick={() => setIsTemplateModalOpen(true)} className="p-1 hover:bg-zinc-200 rounded-md transition-colors">
                    <PlusIcon className="w-3 h-3 text-zinc-600" />
                  </button>
                </div>
                <div className="py-2 max-h-64 overflow-y-auto custom-scrollbar">
                  {templates.length === 0 ? (
                    <div className="px-6 py-4 text-center">
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
                              active ? 'bg-zinc-50 text-zinc-900' : 'text-zinc-600',
                              'block w-full text-left px-4 py-3 group transition-colors'
                            )}
                          >
                            <p className="text-[13px] font-bold text-zinc-900 mb-0.5">{template.name}</p>
                            <p className="text-xs text-zinc-400 truncate font-medium">{template.content}</p>
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
            <Menu.Button className="flex items-center gap-2 px-4 py-2 bg-white text-zinc-500 rounded-xl text-[11px] font-bold uppercase tracking-wider border border-zinc-100 hover:border-zinc-300 hover:text-zinc-900 transition-all">
              <CreditCardIcon className="w-3.5 h-3.5" />
              Produtos
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
              <Menu.Items className="absolute bottom-full left-0 mb-3 w-80 origin-bottom-left bg-white rounded-2xl shadow-premium ring-1 ring-black ring-opacity-5 focus:outline-none z-20 overflow-hidden divide-y divide-zinc-50">
                <div className="px-4 py-3 bg-zinc-50/50">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Available Products</p>
                </div>
                <div className="py-2 max-h-64 overflow-y-auto custom-scrollbar">
                  {paymentProducts.length === 0 ? (
                    <div className="px-6 py-4 text-center">
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
                              active ? 'bg-zinc-50 text-zinc-900' : 'text-zinc-600',
                              'block w-full text-left px-4 py-3 group transition-colors'
                            )}
                          >
                            <div className="flex justify-between items-start gap-3 mb-0.5">
                              <p className="text-[13px] font-bold text-zinc-900 truncate">{product.name}</p>
                              <span className="text-[11px] font-black text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded-md tabular-nums">
                                {formatMoney(product.price, product.currency)}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 font-bold uppercase tracking-widest">Click to insert link</p>
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

        <form onSubmit={handleSend} className="relative group">
          <textarea
            rows={3}
            className="w-full p-6 bg-zinc-50/50 border border-zinc-100 rounded-[24px] text-[15px] font-medium placeholder:text-zinc-300 focus:outline-none focus:ring-4 focus:ring-brand-500/5 focus:bg-white focus:border-brand-500/30 transition-all resize-none shadow-inner"
            placeholder={t('inbox.replyPlaceholder')}
            value={messageText || ''}
            onChange={(e) => onMessageChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
          />
          <div className="absolute bottom-4 right-4 flex items-center gap-3">
            <span className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.2em] hidden sm:block">
              {t('inbox.action.pressEnter')}
            </span>
            <button
              type="submit"
              disabled={!messageText?.trim()}
              className="p-3 bg-brand-600 text-white rounded-2xl shadow-lg shadow-brand-500/20 hover:bg-brand-700 disabled:opacity-30 disabled:shadow-none transition-all hover:scale-105 active:scale-95"
            >
              <PaperAirplaneIcon className="w-5 h-5 -rotate-45" />
            </button>
          </div>
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
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    {t('inbox.templates.create.title')}
                  </Dialog.Title>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('inbox.templates.create.name')}</label>
                      <input
                        type="text"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border px-3 py-2"
                        value={newTemplateName}
                        onChange={(e) => setNewTemplateName(e.target.value)}
                        placeholder={t('inbox.templates.create.namePlaceholder')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('inbox.templates.create.content')}</label>
                      <textarea
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border px-3 py-2"
                        rows={4}
                        value={newTemplateContent}
                        onChange={(e) => setNewTemplateContent(e.target.value)}
                        placeholder={t('inbox.templates.create.contentPlaceholder')}
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                      onClick={() => setIsTemplateModalOpen(false)}
                    >
                      {t('common.action.cancel')}
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:opacity-50"
                      onClick={handleCreateTemplate}
                      disabled={!newTemplateName || !newTemplateContent}
                    >
                      {t('common.action.create')}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

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
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    {t('inbox.ai.summaryTitle')}
                  </Dialog.Title>
                  <div className="mt-4">
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 border border-gray-100 rounded-lg p-4 max-h-[60vh] overflow-auto">
                      {summaryText}
                    </pre>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                      onClick={() => setIsSummaryModalOpen(false)}
                    >
                      {t('common.action.cancel')}
                    </button>
                    <CopyToClipboard text={summaryText}>
                      <button
                        type="button"
                        className="inline-flex justify-center rounded-md border border-transparent bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                        disabled={!summaryText}
                      >
                        {t('common.action.copy')}
                      </button>
                    </CopyToClipboard>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

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
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                    {t('inbox.schedule.title')}
                  </Dialog.Title>

                  <div className="mt-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{t('inbox.schedule.summary')}</label>
                        <input
                          type="text"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border px-3 py-2"
                          value={scheduleConfig.summary || ''}
                          onChange={(e) => setScheduleConfig((p) => ({ ...p, summary: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{t('inbox.schedule.description')}</label>
                        <input
                          type="text"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm border px-3 py-2"
                          value={scheduleConfig.description || ''}
                          onChange={(e) => setScheduleConfig((p) => ({ ...p, description: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={checkAvailability}
                        disabled={isCheckingAvailability}
                        className="inline-flex items-center justify-center rounded-md border border-transparent bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                      >
                        {isCheckingAvailability ? t('common.loading') : t('inbox.schedule.availability.check')}
                      </button>
                      <button
                        type="button"
                        onClick={insertStep1Message}
                        disabled={!availability?.suggestions?.length}
                        className="inline-flex items-center justify-center rounded-md border border-transparent bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                      >
                        {t('inbox.schedule.step1.insert')}
                      </button>
                    </div>

                    {availability?.suggestions?.length ? (
                      <div className="rounded-lg border border-gray-200 bg-white p-4">
                        <div className="text-sm font-medium text-gray-900 mb-2">{t('inbox.schedule.slots')}</div>
                        <div className="space-y-2">
                          {availability.suggestions.map((s) => (
                            <label key={s.start} className="flex items-center gap-2 text-sm text-gray-700">
                              <input
                                type="radio"
                                name="slot"
                                value={s.start}
                                checked={selectedSlotStart === s.start}
                                onChange={(e) => setSelectedSlotStart(e.target.value)}
                              />
                              <span>{formatSlot(s.start)} → {formatSlot(s.end)}</span>
                            </label>
                          ))}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={createEvent}
                            disabled={!selectedSlotStart || isScheduling}
                            className="inline-flex items-center justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            {isScheduling ? t('common.loading') : t('inbox.schedule.event.create')}
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {scheduledEvent?.id ? (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <div className="text-sm font-medium text-gray-900 mb-2">{t('inbox.schedule.event.createdTitle')}</div>
                        <div className="text-sm text-gray-700 space-y-1">
                          <div>{scheduledEvent.summary || scheduleConfig.summary}</div>
                          <div>{formatSlot(scheduledEvent.start)}</div>
                          {scheduledEvent.htmlLink ? (
                            <a href={scheduledEvent.htmlLink} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
                              {t('inbox.schedule.event.openLink')}
                            </a>
                          ) : null}
                        </div>

                        <div className="mt-3 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={insertStep2Message}
                            className="inline-flex items-center justify-center rounded-md border border-transparent bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                          >
                            {t('inbox.schedule.step2.insert')}
                          </button>
                          <button
                            type="button"
                            onClick={rescheduleEvent}
                            disabled={!selectedSlotStart || isRescheduling}
                            className="inline-flex items-center justify-center rounded-md border border-transparent bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                          >
                            {isRescheduling ? t('common.loading') : t('inbox.schedule.event.reschedule')}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEvent}
                            disabled={isCanceling}
                            className="inline-flex items-center justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            {isCanceling ? t('common.loading') : t('inbox.schedule.event.cancel')}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
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
