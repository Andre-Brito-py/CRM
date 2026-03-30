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
    <div className="flex flex-col h-full vysify-glass border-r border-zinc-100 dark:border-zinc-800/50 w-full relative overflow-hidden group/list">
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none" />
      
      <div className="p-5 sm:p-8 lg:p-10 border-b border-zinc-100 dark:border-zinc-800/30 flex flex-col gap-5 sm:gap-8 lg:gap-10 relative z-10">
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-executive font-extrabold text-zinc-950 dark:text-white italic tracking-tighter uppercase leading-none mb-1">
              {t('Inbox')}
            </h2>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] italic ml-1 opacity-70">Secured Channel</p>
          </div>
          <div className="flex items-center gap-4">
            {isSuperAdmin && (
              <motion.button
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onToggleAiDebug?.(!showAiDebug)}
                className={`w-11 h-11 flex items-center justify-center rounded-2xl transition-all duration-500 border ${
                  showAiDebug 
                    ? 'bg-zinc-950 text-amber-400 border-amber-500/50 shadow-glow-amber/30' 
                    : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-400 hover:text-amber-500 hover:border-amber-500/30'
                }`}
                title="Intelligence Diagnostics"
              >
                <SparklesIcon className="w-5 h-5 stroke-[2]" />
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowFilters(!showFilters)}
              className={`w-11 h-11 flex items-center justify-center rounded-2xl transition-all duration-500 border ${
                showFilters 
                  ? 'bg-zinc-950 text-indigo-400 border-indigo-500/50 shadow-glow-indigo/30' 
                  : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-400 hover:text-indigo-500 hover:border-indigo-500/30'
              }`}
            >
              <FunnelIcon className="w-5 h-5 stroke-[2] transition-transform duration-700" style={{ transform: showFilters ? 'rotate(180deg)' : 'none' }} />
            </motion.button>
          </div>
        </div>

        <div className="flex bg-zinc-100/50 dark:bg-zinc-900/50 p-2 rounded-[2rem] border border-zinc-100 dark:border-zinc-800/50 shadow-inner-premium">
          {['all', 'mine', 'unassigned'].map((key) => {
            const val = key === 'all' ? '' : (key === 'mine' ? user?.id : 'unassigned');
            const isActive = filterAssignee === val;
            return (
              <button
                key={key}
                onClick={() => setFilterAssignee(val)}
                className={`flex-1 text-[9px] font-black uppercase tracking-[0.2em] py-3 rounded-[1.25rem] transition-all duration-500 italic ${
                  isActive 
                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-premium border border-zinc-100 dark:border-zinc-700' 
                    : 'text-zinc-500 dark:text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-300'
                }`}
              >
                {t(`inbox.filter.${key}`)}
              </button>
            );
          })}
        </div>

        <div className="relative group/search">
          <MagnifyingGlassIcon className={`absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 transition-all duration-500 ${localSearch ? 'text-indigo-600 scale-110' : 'text-zinc-400'}`} />
          <input
            type="text"
            placeholder="PROCURAR COMUNICAÇÕES..."
            className="w-full pl-14 sm:pl-16 pr-6 sm:pr-8 py-4 sm:py-5 bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-100 dark:border-zinc-800/50 rounded-[1.25rem] sm:rounded-[1.5rem] text-[12px] sm:text-[13px] font-executive font-black focus:outline-none focus:ring-8 focus:ring-indigo-500/5 focus:bg-white dark:focus:bg-zinc-900 focus:border-indigo-500/30 transition-all placeholder:text-zinc-300 italic uppercase tracking-[0.15em]"
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
              className="overflow-hidden bg-zinc-50/50 dark:bg-zinc-900/30 rounded-[2rem] border border-zinc-100 dark:border-zinc-800/50 p-6 shadow-inner-premium mt-[-10px]"
            >
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] pl-1 italic">Assignee Scope</label>
                  <div className="relative group/select">
                    <select
                      value={filterAssignee}
                      onChange={(e) => setFilterAssignee(e.target.value)}
                      className="w-full text-[11px] font-black uppercase tracking-widest bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-[1.25rem] px-5 py-3.5 focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/30 transition-all text-zinc-950 dark:text-white italic appearance-none cursor-pointer"
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
                </div>
                <div className="space-y-3">
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] pl-1 italic">Status Protocol</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full text-[11px] font-black uppercase tracking-widest bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-[1.25rem] px-5 py-3.5 focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/30 transition-all text-zinc-950 dark:text-white italic appearance-none cursor-pointer"
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

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4 lg:p-6">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center h-full">
            <div className="relative w-28 h-28 mb-10 group/empty">
               <div className="absolute inset-0 bg-indigo-500/10 blur-[50px] group-hover:bg-indigo-500/20 transition-all duration-1000" />
               <div className="relative w-full h-full bg-white dark:bg-zinc-900 rounded-[3rem] flex items-center justify-center border border-zinc-100 dark:border-zinc-800 shadow-premium">
                 <UserCircleIcon className="w-14 h-14 text-zinc-200 dark:text-zinc-800" />
               </div>
            </div>
            <h3 className="text-xl font-executive font-extrabold text-zinc-900 dark:text-white italic uppercase tracking-tighter mb-2">No Active Streams</h3>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] italic max-w-[200px] leading-relaxed">{t('inbox.empty')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {conversations.map((conversation, idx) => {
                const isActive = selectedId === conversation.id;
                const platformColor = conversation.platform?.toUpperCase() === 'WHATSAPP' ? 'emerald' : 
                                     conversation.platform?.toUpperCase() === 'EMAIL' ? 'indigo' : 'zinc';
                
                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05, duration: 0.5 }}
                    key={conversation.id}
                    onClick={() => onSelect(conversation)}
                    className={`group flex flex-col p-5 sm:p-6 lg:p-8 cursor-pointer transition-all duration-500 relative rounded-[1.75rem] sm:rounded-[2.5rem] border overflow-hidden ${
                      isActive 
                        ? 'bg-zinc-950 border-zinc-800 shadow-3xl ring-1 ring-zinc-800' 
                        : 'bg-white/40 dark:bg-zinc-900/40 border-transparent hover:bg-white dark:hover:bg-zinc-900 hover:border-zinc-100 dark:hover:border-zinc-800/50 hover:shadow-premium'
                    }`}
                  >
                    {isActive && (
                      <motion.div 
                        layoutId="active-indicator"
                        transition={{ type: 'spring', bounce: 0.3, duration: 0.6 }}
                        className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-12 bg-indigo-600 rounded-l-full z-20 shadow-glow-indigo" 
                      />
                    )}
                    
                    <div className="flex items-start justify-between mb-3 sm:mb-6 relative z-10">
                      <div className="flex items-center min-w-0">
                        <div className="relative flex-shrink-0">
                          <div className={`w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-[1.25rem] sm:rounded-[1.75rem] lg:rounded-[2rem] flex items-center justify-center border transition-all duration-700 overflow-hidden shadow-premium ${
                            isActive ? 'bg-zinc-900 border-zinc-800' : 'bg-white dark:bg-zinc-800 border-zinc-100 dark:border-zinc-700 group-hover:scale-105'
                          }`}>
                            {conversation.contact?.image ? (
                              <img src={conversation.contact.image} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                            ) : (
                              <span className={`text-2xl font-executive font-black italic ${isActive ? 'text-white' : 'text-zinc-300 dark:text-zinc-700'}`}>
                                {conversation.contact?.name?.charAt(0) || '?'}
                              </span>
                            )}
                          </div>
                          
                          {/* Assignee/Status Overlay */}
                          <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-white dark:bg-zinc-900 rounded-[12px] flex items-center justify-center shadow-xl border-2 border-white dark:border-zinc-900 z-20 transition-transform group-hover:scale-110">
                            {conversation.assignee ? (
                              conversation.assignee.image ? (
                                <img src={conversation.assignee.image} alt="" className="w-full h-full rounded-[10px] object-cover" />
                              ) : (
                                <div className="w-full h-full bg-zinc-950 text-white rounded-[10px] flex items-center justify-center text-[10px] font-black italic">
                                  {conversation.assignee.name?.charAt(0).toUpperCase()}
                                </div>
                              )
                            ) : (
                              <div className="w-3 h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full border border-zinc-200 dark:border-zinc-700" />
                            )}
                          </div>
                        </div>
                        <div className="ml-3 sm:ml-4 lg:ml-5 min-w-0">
                          <h3 className={`text-[14px] sm:text-[15px] lg:text-[17px] font-executive font-extrabold transition-all truncate italic uppercase tracking-tight mb-1 sm:mb-1.5 ${
                            isActive ? 'text-white' : 'text-zinc-950 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                          }`}>
                            {conversation.contact?.name || conversation.externalId || t('common.unknown')}
                          </h3>
                          <div className="flex items-center gap-2">
                             <div className={`w-1.5 h-1.5 rounded-full ${conversation.status === 'PENDING' ? 'bg-indigo-500 shadow-glow-indigo animate-pulse' : 'bg-zinc-300 dark:bg-zinc-700'}`} />
                             <span className={`text-[9px] font-black uppercase tracking-[0.2em] italic ${isActive ? 'text-zinc-500' : 'text-zinc-400'}`}>
                               Secured via {conversation.platform}
                             </span>
                          </div>
                        </div>
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-[0.15em] tabular-nums italic transition-colors ${isActive ? 'text-zinc-600' : 'text-zinc-400'}`}>
                        {conversation.updatedAt && formatDistanceToNow(new Date(conversation.updatedAt), { addSuffix: false, locale: dateFnsLocale })}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between gap-6 pl-1 relative z-10">
                      <p className={`text-[13px] line-clamp-1 leading-relaxed font-executive font-medium italic ${
                        isActive ? 'text-zinc-400' : 'text-zinc-500 dark:text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-300'
                      }`}>
                        {conversation.lastMessage || 'Transmission pending...'}
                      </p>
                      {conversation.status === 'PENDING' && (
                        <div className="flex-shrink-0 px-3 py-1 bg-indigo-600 text-[8px] text-white font-black uppercase tracking-[0.2em] rounded-full shadow-glow-indigo italic">
                           Live
                        </div>
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
