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
      <div className="flex flex-col items-center justify-center flex-1 h-full bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700">{t('inbox.chat.empty.title')}</h2>
          <p className="mt-2 text-gray-500">{t('inbox.chat.empty.subtitle')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-full bg-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex items-center flex-1">
          {onBack && (
            <button onClick={onBack} className="mr-3 md:hidden text-gray-500 hover:text-gray-700">
              <ArrowLeftIcon className="w-6 h-6" />
            </button>
          )}
          <div className="w-10 h-10 mr-3 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 overflow-hidden">
            {conversation.contact?.image ? (
              <img src={conversation.contact.image} alt="" className="w-full h-full object-cover" />
            ) : (
              <UserCircleIcon className="w-6 h-6" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              {conversation.contact?.name || conversation.externalId || t('common.unknown')}
            </h2>
            <p className="text-sm text-gray-500">
              {conversation.platform} • {conversation.platform === 'EMAIL' ? (conversation.contact?.email || conversation.externalId) : (conversation.contact?.phone || conversation.externalId)}
            </p>
          </div>
        </div>

        {/* Assignee Selector */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onToggleAutopilot?.(!conversation.autopilotEnabled)}
            disabled={!onToggleAutopilot || isTogglingAutopilot}
            className={classNames(
              'inline-flex items-center px-3 py-2 text-sm font-medium rounded-md border shadow-sm',
              conversation.autopilotEnabled ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50',
              (!onToggleAutopilot || isTogglingAutopilot) ? 'opacity-60 cursor-not-allowed' : ''
            )}
          >
            {t('inbox.autopilot.label')}: {conversation.autopilotEnabled ? t('inbox.autopilot.enabled') : t('inbox.autopilot.disabled')}
          </button>
          <span className="mr-2 text-sm text-gray-500">{t('inbox.assignee.label')}</span>
          <Menu as="div" className="relative inline-block text-left">
            <div>
              <Menu.Button className="inline-flex justify-center w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-blue-500">
                {conversation.assignee ? (
                  <div className="flex items-center">
                    {conversation.assignee.image ? (
                      <img src={conversation.assignee.image} alt="" className="w-5 h-5 mr-2 rounded-full" />
                    ) : (
                      <UserCircleIcon className="w-5 h-5 mr-2 text-gray-400" />
                    )}
                    {conversation.assignee.name}
                  </div>
                ) : (
                  t('inbox.filter.unassigned')
                )}
                <ChevronDownIcon className="w-5 h-5 ml-2 -mr-1" aria-hidden="true" />
              </Menu.Button>
            </div>

            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 w-56 mt-2 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                <div className="py-1">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => onAssign(null)}
                        className={classNames(
                          active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                          'block w-full text-left px-4 py-2 text-sm'
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
                          onClick={() => onAssign(member.member.id)} // Assuming member object structure from API
                          className={classNames(
                            active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                            'block w-full text-left px-4 py-2 text-sm flex items-center'
                          )}
                        >
                          {member.member.image ? (
                            <img src={member.member.image} alt="" className="w-5 h-5 mr-2 rounded-full" />
                          ) : (
                            <UserCircleIcon className="w-5 h-5 mr-2 text-gray-400" />
                          )}
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
      <div className="flex-1 p-6 overflow-y-auto">
        {conversation.messages?.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isMe={message.direction === 'OUTBOUND'}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-200">
        <form onSubmit={handleSend} className="flex space-x-4">
          <Paywall
            minPlan="PREMIUM"
            fallback={
              <div className="flex space-x-2">
                <button
                  type="button"
                  disabled
                  className="p-3 text-gray-400 border border-gray-200 rounded-lg bg-gray-50 cursor-not-allowed"
                  title={t('paywall.title')}
                >
                  <SparklesIcon className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  disabled
                  className="p-3 text-gray-400 border border-gray-200 rounded-lg bg-gray-50 cursor-not-allowed"
                  title={t('paywall.title')}
                >
                  <DocumentTextIcon className="w-5 h-5" />
                </button>
              </div>
            }
          >
            <div className="flex space-x-2">
              <button
                id="ai-suggest-btn"
                type="button"
                onClick={() => onGenerateResponse?.({ objective: aiObjective })}
                disabled={isGeneratingAI || !aiSuggestOnlyEnabled}
                className="p-3 text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                title={t('inbox.ai.generate')}
              >
                <SparklesIcon className={`w-5 h-5 ${isGeneratingAI ? 'text-blue-500 animate-pulse' : ''}`} />
              </button>
              <button
                id="ai-summarize-btn"
                type="button"
                onClick={handleSummarize}
                disabled={isSummarizingAI}
                className="p-3 text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                title={t('inbox.ai.summarize')}
              >
                <DocumentTextIcon className={`w-5 h-5 ${isSummarizingAI ? 'text-blue-500 animate-pulse' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(true)}
                disabled={aiObjective !== 'schedule'}
                className="p-3 text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title={t('inbox.schedule.open')}
              >
                <CalendarDaysIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="ml-3 flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-gray-600 select-none">
                <input
                  type="checkbox"
                  checked={Boolean(aiSuggestOnlyEnabled)}
                  onChange={(e) => onAiSuggestOnlyEnabledChange?.(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                {t('inbox.ai.suggestOnly')}
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">{t('inbox.ai.objective.label')}</span>
                <select
                  value={aiObjective || ''}
                  onChange={(e) => onAiObjectiveChange?.(e.target.value)}
                  className="h-9 rounded-lg border border-gray-300 bg-white px-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="support">{t('inbox.ai.objective.support')}</option>
                  <option value="qualify">{t('inbox.ai.objective.qualify')}</option>
                  <option value="close">{t('inbox.ai.objective.close')}</option>
                  <option value="schedule">{t('inbox.ai.objective.schedule')}</option>
                </select>
              </div>
            </div>
          </Paywall>

          <div className="relative">
            <Menu as="div" className="relative inline-block text-left">
              <div>
                <Menu.Button
                  className="p-3 text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title={t('inbox.templates.title')}
                >
                  <DocumentDuplicateIcon className="w-5 h-5" />
                </Menu.Button>
              </div>
              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute bottom-full left-0 mb-2 w-72 origin-bottom-left bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-20">
                  <div className="py-1">
                    <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                      <span>{t('inbox.templates.title')}</span>
                      <button
                        type="button"
                        onClick={() => setIsTemplateModalOpen(true)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <PlusIcon className="w-4 h-4" />
                      </button>
                    </div>
                    {templates.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-500 text-center">
                        {t('inbox.templates.empty')}
                      </div>
                    ) : (
                      <div className="max-h-60 overflow-y-auto">
                        {templates.map((template) => (
                          <Menu.Item key={template.id}>
                            {({ active }) => (
                              <button
                                type="button"
                                onClick={() => onMessageChange(template.content)}
                                className={classNames(
                                  active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                  'block w-full text-left px-4 py-2 text-sm'
                                )}
                              >
                                <p className="font-medium">{template.name}</p>
                                <p className="text-xs text-gray-500 truncate">{template.content}</p>
                              </button>
                            )}
                          </Menu.Item>
                        ))}
                      </div>
                    )}
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>
          </div>

          <div className="relative">
            <Menu as="div" className="relative inline-block text-left">
              <div>
                <Menu.Button
                  className="p-3 text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title="Produtos"
                >
                  <CreditCardIcon className="w-5 h-5" />
                </Menu.Button>
              </div>
              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute bottom-full left-0 mb-2 w-72 origin-bottom-left bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-20">
                  <div className="py-1">
                    <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-100">
                      Produtos
                    </div>
                    {paymentProducts.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-gray-500 text-center">
                        Nenhum produto ativo
                      </div>
                    ) : (
                      <div className="max-h-60 overflow-y-auto">
                        {paymentProducts.map((product) => (
                          <Menu.Item key={product.id}>
                            {({ active }) => (
                              <button
                                type="button"
                                onClick={() => appendToMessage(`${window.location.origin}/p/${workspaceSlug}/${product.slug}`)}
                                className={classNames(
                                  active ? 'bg-gray-100 text-gray-900' : 'text-gray-700',
                                  'block w-full text-left px-4 py-2 text-sm'
                                )}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <p className="font-medium truncate">{product.name}</p>
                                  <p className="text-xs text-gray-600 whitespace-nowrap">
                                    {formatMoney(product.price, product.currency)}
                                  </p>
                                </div>
                                <p className="text-xs text-gray-500 truncate">Inserir link fixo</p>
                              </button>
                            )}
                          </Menu.Item>
                        ))}
                      </div>
                    )}
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>
          </div>

          <input
            type="text"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t('inbox.message.placeholder')}
            value={messageText || ''}
            onChange={(e) => onMessageChange(e.target.value)}
          />
          <button
            type="submit"
            disabled={!messageText?.trim()}
            className="flex items-center justify-center px-6 py-3 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PaperAirplaneIcon className="w-5 h-5 transform rotate-90" />
          </button>
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
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
                        value={newTemplateName}
                        onChange={(e) => setNewTemplateName(e.target.value)}
                        placeholder={t('inbox.templates.create.namePlaceholder')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('inbox.templates.create.content')}</label>
                      <textarea
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
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
                      className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50"
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
                        className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
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
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
                          value={scheduleConfig.summary || ''}
                          onChange={(e) => setScheduleConfig((p) => ({ ...p, summary: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">{t('inbox.schedule.description')}</label>
                        <input
                          type="text"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border px-3 py-2"
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
                        className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
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
                            <a href={scheduledEvent.htmlLink} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                              {t('inbox.schedule.event.openLink')}
                            </a>
                          ) : null}
                        </div>

                        <div className="mt-3 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={insertStep2Message}
                            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
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
