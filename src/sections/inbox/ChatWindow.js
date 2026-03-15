import { useState, useRef, useEffect, Fragment } from 'react';
import { PaperAirplaneIcon, UserCircleIcon, ChevronDownIcon, DocumentDuplicateIcon, PlusIcon, SparklesIcon, ArrowLeftIcon, DocumentTextIcon, CreditCardIcon } from '@heroicons/react/24/outline';
import { Menu, Transition, Dialog } from '@headlessui/react';
import MessageBubble from './MessageBubble';
import { useTranslation } from 'react-i18next';
import Paywall from '@/components/Paywall';
import { CopyToClipboard } from 'react-copy-to-clipboard';

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
  onBack
}) => {
  const { t } = useTranslation();
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateContent, setNewTemplateContent] = useState('');
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages]);

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
        <div className="flex items-center">
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
                onClick={onGenerateResponse}
                disabled={isGeneratingAI}
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
    </div>
  );
};

export default ChatWindow;
