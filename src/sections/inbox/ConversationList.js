import { useMemo, useState, useEffect } from 'react';
import { UserCircleIcon, FunnelIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
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

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchText) {
        setSearchText(localSearch);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [localSearch, searchText, setSearchText]);

  return (
    <div className="flex flex-col h-full bg-white/50 backdrop-blur-md border-r border-zinc-200/50 w-full md:w-[420px] lg:w-[480px]">
      <div className="p-8 border-b border-zinc-100 flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-executive font-bold text-zinc-900 tracking-tight">
            {t('Inbox')}
          </h2>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-xl transition-all duration-200 ${
              showFilters || (filterAssignee && filterAssignee !== user?.id && filterAssignee !== 'unassigned') || filterStatus 
                ? 'bg-brand-50 text-brand-600 shadow-sm' 
                : 'text-zinc-400 hover:bg-zinc-100'
            }`}
          >
            <FunnelIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex bg-zinc-100/80 p-1.5 rounded-2xl">
          <button
            onClick={() => setFilterAssignee('')}
            className={`flex-1 text-[11px] font-bold uppercase tracking-wider py-2.5 rounded-xl transition-all ${
              !filterAssignee ? 'bg-white text-zinc-900 shadow-premium' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {t('inbox.filter.all')}
          </button>
          <button
            onClick={() => setFilterAssignee(user?.id)}
            disabled={!user?.id}
            className={`flex-1 text-[11px] font-bold uppercase tracking-wider py-2.5 rounded-xl transition-all ${
              filterAssignee === user?.id ? 'bg-white text-zinc-900 shadow-premium' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {t('inbox.filter.mine')}
          </button>
          <button
            onClick={() => setFilterAssignee('unassigned')}
            className={`flex-1 text-[11px] font-bold uppercase tracking-wider py-2.5 rounded-xl transition-all ${
              filterAssignee === 'unassigned' ? 'bg-white text-zinc-900 shadow-premium' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {t('inbox.filter.unassigned')}
          </button>
        </div>

        <div className="relative group">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-brand-500 transition-colors" />
          <input
            type="text"
            placeholder={t('inbox.search.placeholder')}
            className="w-full pl-11 pr-4 py-3.5 bg-zinc-100/50 border border-transparent rounded-[18px] text-[15px] font-medium focus:outline-none focus:ring-4 focus:ring-brand-500/5 focus:bg-white focus:border-brand-500/30 transition-all placeholder:text-zinc-400"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 gap-3 pt-2 animate-in fade-in slide-in-from-top-3 duration-300">
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="text-xs font-bold uppercase tracking-tight bg-zinc-50 border-zinc-100 rounded-xl px-3 py-2.5 focus:ring-brand-500/20"
            >
              <option value="">{t('inbox.filters.allAssignees')}</option>
              <option value="unassigned">{t('inbox.filter.unassigned')}</option>
              {user?.id && <option value={user.id}>{t('inbox.filters.assignedToMe')}</option>}
              {members.map((m) => (
                m.member && m.member.id !== user?.id ? (
                  <option key={m.id} value={m.member.id}>{m.member.name || m.email}</option>
                ) : null
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs font-bold uppercase tracking-tight bg-zinc-50 border-zinc-100 rounded-xl px-3 py-2.5 focus:ring-brand-500/20"
            >
              <option value="">{t('inbox.filters.allStatuses')}</option>
              <option value="OPEN">{t('inbox.status.open')}</option>
              <option value="RESOLVED">{t('inbox.status.resolved')}</option>
              <option value="PENDING">{t('inbox.status.pending')}</option>
            </select>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 bg-zinc-50 rounded-[28px] flex items-center justify-center mb-4">
              <UserCircleIcon className="w-8 h-8 text-zinc-200" />
            </div>
            <p className="text-[15px] font-executive font-bold text-zinc-400 italic">{t('inbox.empty')}</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-50">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => onSelect(conversation)}
                className={`group flex flex-col p-6 cursor-pointer transition-all duration-300 relative ${
                  selectedId === conversation.id ? 'bg-brand-50/40' : 'hover:bg-zinc-50'
                }`}
              >
                {selectedId === conversation.id && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-brand-500 rounded-r-full shadow-[0_0_15px_rgba(20,184,166,0.5)]" />
                )}
                
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center min-w-0">
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 bg-zinc-100 rounded-2xl flex items-center justify-center border border-white shadow-sm overflow-hidden group-hover:bg-white transition-colors">
                        {conversation.contact?.image ? (
                          <img src={conversation.contact.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl font-executive font-bold text-zinc-400">
                            {conversation.contact?.name?.charAt(0) || '?'}
                          </span>
                        )}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center border-2 border-white shadow-sm ${
                        conversation.assignee ? 'ring-1 ring-zinc-100' : ''
                      }`}>
                        {conversation.assignee ? (
                          conversation.assignee.image ? (
                            <img src={conversation.assignee.image} alt="" className="w-full h-full rounded-full" />
                          ) : (
                            <div className="w-full h-full bg-brand-50 rounded-full flex items-center justify-center text-[8px] text-brand-600 font-bold">
                              {conversation.assignee.name?.charAt(0).toUpperCase()}
                            </div>
                          )
                        ) : (
                          <div className="w-2.5 h-2.5 bg-green-500 rounded-full" />
                        )}
                      </div>
                    </div>
                    <div className="ml-4 min-w-0">
                      <h3 className={`text-[15px] font-executive font-bold transition-colors truncate ${
                        selectedId === conversation.id ? 'text-brand-700' : 'text-zinc-900 group-hover:text-zinc-950'
                      }`}>
                        {conversation.contact?.name || conversation.externalId || t('common.unknown')}
                      </h3>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.15em] mt-0.5 leading-none">
                        {conversation.platform}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-tighter tabular-nums pt-1">
                    {conversation.updatedAt && formatDistanceToNow(new Date(conversation.updatedAt), { addSuffix: false, locale: dateFnsLocale })}
                  </span>
                </div>
                
                <div className="flex items-center justify-between gap-4 pl-1">
                  <p className={`text-sm line-clamp-1 leading-relaxed ${
                    selectedId === conversation.id ? 'text-zinc-600' : 'text-zinc-500'
                  }`}>
                    {conversation.lastMessage || t('inbox.noMessagesYet')}
                  </p>
                  {conversation.status === 'PENDING' && (
                    <div className="flex-shrink-0 w-2 h-2 rounded-full bg-brand-500 animate-pulse shadow-[0_0_8px_rgba(20,184,166,0.6)]" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationList;
