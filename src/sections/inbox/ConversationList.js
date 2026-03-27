import { useMemo, useState, useEffect } from 'react';
import { UserCircleIcon, FunnelIcon, MagnifyingGlassIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { enUS, ptBR, es, fr, de, it } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

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
  showAiDebug,
  onToggleAiDebug
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
    <div className="flex flex-col h-full bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 w-full md:w-[320px] lg:w-[380px]">
      <div className="p-4 border-b border-zinc-100/80 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight">
            {t('Inbox')}
          </h2>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onToggleAiDebug?.(!showAiDebug)}
              className={`p-2 rounded-xl transition-all duration-300 border ${
                showAiDebug 
                  ? 'bg-amber-500 text-white border-amber-600 shadow-glow-amber/40' 
                  : 'bg-white dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700 text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 font-bold'
              }`}
              title="IA Diagnostics"
            >
              <SparklesIcon className="w-5 h-5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-xl transition-all duration-300 border ${
                showFilters || (filterAssignee && filterAssignee !== user?.id && filterAssignee !== 'unassigned') || filterStatus 
                  ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-100 dark:border-brand-500/30 text-brand-600 dark:text-brand-400 shadow-sm' 
                  : 'bg-white dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700 text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700'
              }`}
            >
              <FunnelIcon className="w-5 h-5 transition-transform duration-500" style={{ transform: showFilters ? 'rotate(180)deg' : 'none' }} />
            </motion.button>
          </div>
        </div>

        <div className="flex bg-zinc-100/50 dark:bg-zinc-900/50 p-1.5 rounded-[20px] border border-zinc-200/20 dark:border-zinc-800">
          <button
            onClick={() => setFilterAssignee('')}
            className={`flex-1 text-[10px] font-black uppercase tracking-[0.15em] py-3 rounded-[14px] transition-all duration-300 ${
              !filterAssignee ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-premium border border-zinc-100 dark:border-zinc-600' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
            }`}
          >
            {t('inbox.filter.all')}
          </button>
          <button
            onClick={() => setFilterAssignee(user?.id)}
            disabled={!user?.id}
            className={`flex-1 text-[10px] font-black uppercase tracking-[0.15em] py-3 rounded-[14px] transition-all duration-300 ${
              filterAssignee === user?.id ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-premium border border-zinc-100 dark:border-zinc-600' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
            }`}
          >
            {t('inbox.filter.mine')}
          </button>
          <button
            onClick={() => setFilterAssignee('unassigned')}
            className={`flex-1 text-[10px] font-black uppercase tracking-[0.15em] py-3 rounded-[14px] transition-all duration-300 ${
              filterAssignee === 'unassigned' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-premium border border-zinc-100 dark:border-zinc-600' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'
            }`}
          >
            {t('inbox.filter.unassigned')}
          </button>
        </div>

        <div className="relative group">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-brand-500 transition-all duration-300" />
          <input
            type="text"
            placeholder={t('inbox.search.placeholder')}
            className="w-full pl-9 pr-3 py-2 bg-zinc-100/50 border border-transparent rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-white focus:border-brand-500/30 transition-all placeholder:text-zinc-500"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">Owner</label>
                  <select
                    value={filterAssignee}
                    onChange={(e) => setFilterAssignee(e.target.value)}
                    className="w-full text-xs font-bold uppercase tracking-tight bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl px-4 py-3 focus:ring-brand-500/10 focus:border-brand-500/30 shadow-premium-sm text-zinc-900 dark:text-white"
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
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full text-xs font-bold uppercase tracking-tight bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl px-4 py-3 focus:ring-brand-500/10 focus:border-brand-500/30 shadow-premium-sm text-zinc-900 dark:text-white"
                  >
                    <option value="">{t('inbox.filters.allStatuses')}</option>
                    <option value="OPEN">{t('inbox.status.open')}</option>
                    <option value="RESOLVED">{t('inbox.status.resolved')}</option>
                    <option value="PENDING">{t('inbox.status.pending')}</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center h-48">
            <div className="w-20 h-20 bg-zinc-50 rounded-[32px] flex items-center justify-center mb-6 border border-zinc-100/50">
              <UserCircleIcon className="w-10 h-10 text-zinc-200" />
            </div>
            <p className="text-[15px] font-executive font-bold text-zinc-400 italic tracking-tight">{t('inbox.empty')}</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <AnimatePresence mode="popLayout">
              {conversations.map((conversation) => {
                const isActive = selectedId === conversation.id;
                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.98, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={conversation.id}
                    onClick={() => onSelect(conversation)}
                    className={`group flex flex-col p-3 cursor-pointer transition-colors relative rounded-lg ${
                      isActive 
                        ? 'bg-brand-50/50 dark:bg-brand-500/10 border-brand-100/50 dark:border-brand-500/20' 
                        : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border-transparent'
                    }`}
                  >
                    {isActive && (
                      <motion.div 
                        layoutId="active-indicator"
                        className="absolute left-0 top-2 bottom-2 w-1 bg-brand-500 rounded-r-full z-20" 
                      />
                    )}
                    
                    <div className="flex items-start justify-between mb-4 relative z-10">
                      <div className="flex items-center min-w-0">
                        <div className="relative flex-shrink-0">
                          <div className={`w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center border overflow-hidden ${
                            isActive ? 'border-brand-500' : 'border-zinc-200 group-hover:bg-white'
                          }`}>
                            {conversation.contact?.image ? (
                              <img src={conversation.contact.image} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className={`text-lg font-bold ${isActive ? 'text-brand-600' : 'text-zinc-400'}`}>
                                {conversation.contact?.name?.charAt(0) || '?'}
                              </span>
                            )}
                          </div>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-white rounded-full flex items-center justify-center border border-white z-20`}>
                            {conversation.assignee ? (
                              conversation.assignee.image ? (
                                <img src={conversation.assignee.image} alt="" className="w-full h-full rounded-full" />
                              ) : (
                                <div className="w-full h-full bg-brand-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold">
                                  {conversation.assignee.name?.charAt(0).toUpperCase()}
                                </div>
                              )
                            ) : (
                              <div className="w-2.5 h-2.5 bg-green-500 rounded-full" />
                            )}
                          </div>
                        </div>
                        <div className="ml-3 min-w-0">
                          <h3 className={`text-[15px] font-semibold transition-colors truncate ${
                            isActive ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-800 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white'
                          }`}>
                            {conversation.contact?.name || conversation.externalId || t('common.unknown')}
                          </h3>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none">
                              {conversation.platform}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="text-[11px] font-medium text-zinc-400 whitespace-nowrap pt-1">
                        {conversation.updatedAt && formatDistanceToNow(new Date(conversation.updatedAt), { addSuffix: false, locale: dateFnsLocale })}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between gap-3 pl-1 relative z-10">
                      <p className={`text-[13px] line-clamp-1 leading-relaxed ${
                        isActive ? 'text-zinc-600' : 'text-zinc-500'
                      }`}>
                        {conversation.lastMessage || t('inbox.noMessagesYet')}
                      </p>
                      {conversation.status === 'PENDING' && (
                        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-brand-500" />
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationList;
