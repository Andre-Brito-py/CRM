import { useMemo, useState, useEffect } from 'react';
import { UserCircleIcon, UserIcon, FunnelIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { enUS, ptBR, es, fr, de, it } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

const ConversationList = ({
  conversations,
  selectedId,
  onSelect,
  filterAssignee,
  setFilterAssignee,
  filterStatus,
  setFilterStatus,
  searchText,
  setSearchText,
  members = [],
  user,
}) => {
  const { t, i18n } = useTranslation();
  const [localSearch, setLocalSearch] = useState(searchText || '');
  const [showFilters, setShowFilters] = useState(false);

  const dateFnsLocale = useMemo(() => {
    const base = (i18n?.language || 'en').split('-')[0];
    if (base === 'pt') return ptBR;
    if (base === 'es') return es;
    if (base === 'fr') return fr;
    if (base === 'de') return de;
    if (base === 'it') return it;
    return enUS;
  }, [i18n?.language]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchText) {
        setSearchText(localSearch);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [localSearch, searchText, setSearchText]);

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-white w-full md:w-80 border-r border-gray-200">
      <div className="p-4 border-b border-gray-200 space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">{t('Inbox')}</h2>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1.5 rounded-md hover:bg-gray-100 transition-colors ${showFilters || (filterAssignee && filterAssignee !== user?.id && filterAssignee !== 'unassigned') || filterStatus ? 'text-blue-600 bg-blue-50' : 'text-gray-500'}`}
            title={t('inbox.filters.more')}
          >
            <FunnelIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Filters */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setFilterAssignee('')}
            className={`flex-1 text-xs py-1.5 rounded-md transition-all ${!filterAssignee ? 'bg-white shadow-sm font-medium text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t('inbox.filter.all')}
          </button>
          <button
            onClick={() => setFilterAssignee(user?.id)}
            disabled={!user?.id}
            className={`flex-1 text-xs py-1.5 rounded-md transition-all ${filterAssignee === user?.id ? 'bg-white shadow-sm font-medium text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t('inbox.filter.mine')}
          </button>
          <button
            onClick={() => setFilterAssignee('unassigned')}
            className={`flex-1 text-xs py-1.5 rounded-md transition-all ${filterAssignee === 'unassigned' ? 'bg-white shadow-sm font-medium text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t('inbox.filter.unassigned')}
          </button>
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
          </div>
          <input
            type="text"
            placeholder={t('inbox.search.placeholder')}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
        </div>

        {showFilters && (
          <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">{t('inbox.filters.allAssignees')}</option>
              <option value="unassigned">{t('inbox.filter.unassigned')}</option>
              {user?.id && <option value={user.id}>{t('inbox.filters.assignedToMe')}</option>}
              {members.map((m) => (
                m.member && m.member.id !== user?.id ? (
                  <option key={m.id} value={m.member.id}>
                    {m.member.name || m.email}
                  </option>
                ) : null
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">{t('inbox.filters.allStatuses')}</option>
              <option value="OPEN">{t('inbox.status.open')}</option>
              <option value="RESOLVED">{t('inbox.status.resolved')}</option>
              <option value="PENDING">{t('inbox.status.pending')}</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-500 p-4 text-center">
            <p className="text-sm">{t('inbox.empty')}</p>
            {(filterAssignee || filterStatus || searchText) && (
              <button
                onClick={() => {
                  setFilterAssignee('');
                  setFilterStatus('');
                  setLocalSearch('');
                  setSearchText('');
                }}
                className="text-xs text-blue-600 mt-2 hover:underline"
              >
                {t('inbox.filters.clear')}
              </button>
            )}
          </div>
        ) : (
          conversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => onSelect(conversation)}
              className={`flex items-center p-4 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100 ${selectedId === conversation.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'border-l-4 border-l-transparent'
                }`}
            >
              <div className="flex-shrink-0 mr-3 relative">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 overflow-hidden">
                  {conversation.contact?.image ? (
                    <img src={conversation.contact.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <UserCircleIcon className="w-6 h-6" />
                  )}
                </div>
                {conversation.assignee && (
                  <div
                    className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center border border-gray-200"
                    title={t('inbox.assignedToUser', { name: conversation.assignee.name })}
                  >
                    {conversation.assignee.image ? (
                      <img src={conversation.assignee.image} alt={conversation.assignee.name} className="w-4 h-4 rounded-full" />
                    ) : (
                      <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center text-[10px] text-blue-600 font-bold">
                        {conversation.assignee.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {conversation.contact?.name || conversation.externalId || t('common.unknown')}
                  </h3>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                      {conversation.platform || '—'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {conversation.updatedAt &&
                        formatDistanceToNow(new Date(conversation.updatedAt), { addSuffix: false, locale: dateFnsLocale })}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-500 truncate">
                  {conversation.lastMessage || t('inbox.noMessagesYet')}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ConversationList;
