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
  isSuperAdmin = false,
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
    <div className="flex flex-col h-full bg-white/70 dark:bg-zinc-950/40 backdrop-blur-3xl border-r border-zinc-100 dark:border-zinc-800/50 w-full md:w-[320px] lg:w-[400px]">
      <div className="p-8 border-b border-zinc-100 dark:border-zinc-800/30 flex flex-col gap-8">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-black text-zinc-900 dark:text-white italic tracking-tighter uppercase">
            {t('Inbox')}
          </h2>
          <div className="flex items-center gap-3">
            {isSuperAdmin && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onToggleAiDebug?.(!showAiDebug)}
                className={`w-10 h-10 flex items-center justify-center rounded-2xl transition-all duration-300 border ${
                  showAiDebug 
                    ? 'bg-amber-500 text-white border-amber-600 shadow-lg shadow-amber-500/30' 
                    : 'bg-zinc-50/50 dark:bg-zinc-800/50 border-zinc-100 dark:border-zinc-700/50 text-zinc-400'
                }`}
                title="IA Diagnostics"
              >
                <SparklesIcon className="w-5 h-5" />
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowFilters(!showFilters)}
              className={`w-10 h-10 flex items-center justify-center rounded-2xl transition-all duration-300 border ${
                showFilters 
                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-lg shadow-indigo-500/30' 
                  : 'bg-zinc-50/50 dark:bg-zinc-800/50 border-zinc-100 dark:border-zinc-700/50 text-zinc-400'
              }`}
            >
              <FunnelIcon className="w-5 h-5 transition-transform duration-500" style={{ transform: showFilters ? 'rotate(180deg)' : 'none' }} />
            </motion.button>
          </div>
        </div>

        <div className="flex bg-zinc-100/50 dark:bg-zinc-900/50 p-1.5 rounded-[1.5rem] border border-zinc-100 dark:border-zinc-800/50">
          <button
            onClick={() => setFilterAssignee('')}
            className={`flex-1 text-[9px] font-black uppercase tracking-[0.2em] py-2.5 rounded-xl transition-all duration-300 italic ${
              !filterAssignee ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xl border border-zinc-100 dark:border-zinc-700' : 'text-zinc-500 dark:text-zinc-400 hover:text-indigo-600'
            }`}
          >
            {t('inbox.filter.all')}
          </button>
          <button
            onClick={() => setFilterAssignee(user?.id)}
            disabled={!user?.id}
            className={`flex-1 text-[9px] font-black uppercase tracking-[0.2em] py-2.5 rounded-xl transition-all duration-300 italic ${
              filterAssignee === user?.id ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xl border border-zinc-100 dark:border-zinc-700' : 'text-zinc-500 dark:text-zinc-400 hover:text-indigo-600'
            }`}
          >
            {t('inbox.filter.mine')}
          </button>
          <button
            onClick={() => setFilterAssignee('unassigned')}
            className={`flex-1 text-[9px] font-black uppercase tracking-[0.2em] py-2.5 rounded-xl transition-all duration-300 italic ${
              filterAssignee === 'unassigned' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xl border border-zinc-100 dark:border-zinc-700' : 'text-zinc-500 dark:text-zinc-400 hover:text-indigo-600'
            }`}
          >
            {t('inbox.filter.unassigned')}
          </button>
        </div>

        <div className="relative group">
          <MagnifyingGlassIcon className={`absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${localSearch ? 'text-indigo-500' : 'text-zinc-400'}`} />
          <input
            type="text"
            placeholder="Procurar conversas..."
            className="w-full pl-14 pr-6 py-4.5 bg-zinc-50/50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-700/50 rounded-[1.25rem] text-[13px] font-bold focus:outline-none focus:ring-8 focus:ring-indigo-500/5 focus:bg-white dark:focus:bg-zinc-800 border-indigo-500/0 focus:border-indigo-500/30 transition-all placeholder:text-zinc-400 italic placeholder:uppercase placeholder:tracking-widest"
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
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] pl-1 italic">Responsável</label>
                  <select
                    value={filterAssignee}
                    onChange={(e) => setFilterAssignee(e.target.value)}
                    className="w-full text-[11px] font-black uppercase tracking-tight bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl px-4 py-3 focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/30 transition-all text-zinc-900 dark:text-white italic appearance-none cursor-pointer"
                  >
                    <option value="">{t('inbox.filters.allAssignees')}</option>
                    <option value="unassigned">{t('inbox.filter.unassigned')}</option>
                    {user?.id && <option value={user.id}>{t('inbox.filters.assignedToMe')}</option>}
                    {members.map((m) => (
                      m.member && m.member.id !== user?.id ? (
                        <option key={m.id} value={m.member.id}>{m.member.name?.toUpperCase()}</option>
                      ) : null
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] pl-1 italic">Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full text-[11px] font-black uppercase tracking-tight bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl px-4 py-3 focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/30 transition-all text-zinc-900 dark:text-white italic appearance-none cursor-pointer"
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

      <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center h-full">
            <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-900 rounded-[2.5rem] flex items-center justify-center mb-8 border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden group">
              <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <UserCircleIcon className="w-10 h-10 text-zinc-200 dark:text-zinc-800 relative z-10" />
            </div>
            <p className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.2em] italic">{t('inbox.empty')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {conversations.map((conversation, idx) => {
                const isActive = selectedId === conversation.id;
                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95, x: -10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    key={conversation.id}
                    onClick={() => onSelect(conversation)}
                    className={`group flex flex-col p-6 cursor-pointer transition-all duration-300 relative rounded-[2rem] border overflow-hidden ${
                      isActive 
                        ? 'bg-white dark:bg-zinc-800/80 border-indigo-500/20 shadow-xl shadow-indigo-500/5' 
                        : 'bg-transparent border-transparent hover:bg-white dark:hover:bg-zinc-800/40 hover:border-zinc-100 dark:hover:border-zinc-700/30'
                    }`}
                  >
                    {isActive && (
                      <motion.div 
                        layoutId="active-indicator"
                        className="absolute left-0 top-6 bottom-6 w-1 bg-indigo-600 rounded-r-full z-20 shadow-glow-indigo" 
                      />
                    )}
                    
                    <div className="flex items-start justify-between mb-5 relative z-10">
                      <div className="flex items-center min-w-0">
                        <div className="relative flex-shrink-0">
                          <div className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center border transition-all duration-500 overflow-hidden shadow-sm ${
                            isActive ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/40 dark:border-indigo-500/40' : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 group-hover:scale-105'
                          }`}>
                            {conversation.contact?.image ? (
                              <img src={conversation.contact.image} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className={`text-xl font-black italic ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'}`}>
                                {conversation.contact?.name?.charAt(0) || '?'}
                              </span>
                            )}
                          </div>
                          <div className={`absolute -bottom-1 -right-1 w-6 h-6 bg-white dark:bg-zinc-900 rounded-[10px] flex items-center justify-center shadow-lg border-2 border-white dark:border-zinc-900 z-20`}>
                            {conversation.assignee ? (
                              conversation.assignee.image ? (
                                <img src={conversation.assignee.image} alt="" className="w-full h-full rounded-[8px]" />
                              ) : (
                                <div className="w-full h-full bg-indigo-600 rounded-[8px] flex items-center justify-center text-[9px] text-white font-black italic">
                                  {conversation.assignee.name?.charAt(0).toUpperCase()}
                                </div>
                              )
                            ) : (
                              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-glow-emerald" />
                            )}
                          </div>
                        </div>
                        <div className="ml-4 min-w-0">
                          <h3 className={`text-[16px] font-black transition-all truncate italic uppercase tracking-tight mb-1 ${
                            isActive ? 'text-zinc-900 dark:text-white' : 'text-zinc-700 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200'
                          }`}>
                            {conversation.contact?.name || conversation.externalId || t('common.unknown')}
                          </h3>
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border transition-all ${
                              isActive ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500' : 'bg-zinc-100 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-400'
                            }`}>
                              {conversation.platform}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 dark:text-zinc-500 tabular-nums italic">
                        {conversation.updatedAt && formatDistanceToNow(new Date(conversation.updatedAt), { addSuffix: false, locale: dateFnsLocale })}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between gap-4 pl-1 relative z-10">
                      <p className={`text-[13px] line-clamp-1 leading-relaxed font-medium ${
                        isActive ? 'text-zinc-600 dark:text-zinc-300' : 'text-zinc-500 dark:text-zinc-500 group-hover:text-zinc-600'
                      }`}>
                        {conversation.lastMessage || t('inbox.noMessagesYet')}
                      </p>
                      {conversation.status === 'PENDING' && (
                        <div className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-indigo-600 shadow-glow-indigo animate-pulse" />
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
