import { formatDistanceToNow } from 'date-fns';
import { UserCircleIcon, MagnifyingGlassIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

const PlatformIcon = ({ platform }) => {
  switch (String(platform).toUpperCase()) {
    case 'WHATSAPP':
      return <span className="text-emerald-500 text-xs">WHATSAPP</span>;
    case 'INSTAGRAM':
      return <span className="text-pink-500 text-xs">INSTAGRAM</span>;
    case 'EMAIL':
      return <EnvelopeIcon className="h-3 w-3 text-sky-500" />;
    default:
      return <span className="text-zinc-400 text-xs">{platform}</span>;
  }
};

const ConversationList = ({ conversations, selectedConversationId, onSelect, searchText, setSearchText }) => {
  const { t } = useTranslation();

  return (
    <div className="border-r border-zinc-200/50 flex flex-col h-full bg-white/40 backdrop-blur-xl">
      <div className="p-8 border-b border-zinc-100/80">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-executive font-extrabold text-zinc-900 tracking-tighter">
            Inbox <span className="text-indigo-600">.</span>
          </h2>
          <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 rounded-full border border-indigo-100/50">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Live</span>
          </div>
        </div>
        
        <div className="relative group">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 transition-all duration-300 group-focus-within:text-indigo-500 group-focus-within:scale-110" />
          <input
            type="text"
            placeholder={t('common.label.search')}
            value={searchText}
            onChange={(e) => setSearchText?.(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-zinc-100/50 border border-zinc-200/30 rounded-[20px] text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500/30 transition-all placeholder:text-zinc-400 font-executive"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        <div className="space-y-1">
          <AnimatePresence mode="popLayout">
            {conversations.map((conversation) => {
              const isActive = selectedConversationId === conversation.id;
              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={conversation.id}
                  onClick={() => onSelect(conversation)}
                  className={`group px-6 py-5 cursor-pointer transition-all duration-500 relative rounded-[24px] ${
                    isActive 
                      ? 'bg-white shadow-premium-sm border border-zinc-100 shadow-glow-indigo' 
                      : 'hover:bg-white/60 hover:shadow-premium-sm border border-transparent hover:border-zinc-100'
                  }`}
                >
                  <div className="flex items-start justify-between relative z-10">
                    <div className="flex items-center min-w-0">
                      <div className="relative flex-shrink-0">
                        <div className={`avatar-premium rounded-2xl overflow-hidden ${isActive ? 'ring-indigo-500/50' : ''}`}>
                          <UserCircleIcon className={`h-12 w-12 ${isActive ? 'text-indigo-100' : 'text-zinc-200'} transition-colors group-hover:text-indigo-200`} />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full shadow-sm z-20" />
                      </div>
                      <div className="ml-4 min-w-0">
                        <p className={`text-[15px] font-executive font-bold truncate transition-colors ${isActive ? 'text-zinc-900' : 'text-zinc-800'}`}>
                          {conversation.contact?.name || 'Unknown Contact'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <PlatformIcon platform={conversation.platform} />
                          <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">•</span>
                          {conversation.updatedAt && (
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tight">
                              {formatDistanceToNow(new Date(conversation.updatedAt), { addSuffix: false })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {conversation.assignee && (
                      <div className="flex-shrink-0">
                        <div className="px-2 py-0.5 rounded-lg bg-zinc-50 border border-zinc-100 transition-colors group-hover:border-indigo-100 group-hover:bg-indigo-50/30">
                          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter group-hover:text-indigo-400">
                            {conversation.assignee.name.split(' ')[0]}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 pl-1 relative z-10">
                    <p className={`text-sm line-clamp-1 font-medium leading-relaxed ${isActive ? 'text-zinc-600' : 'text-zinc-400'}`}>
                      {conversation.messages && conversation.messages.length > 0
                        ? conversation.messages[conversation.messages.length - 1].content
                        : 'No messages yet'}
                    </p>
                  </div>

                  {isActive && (
                    <motion.div 
                      layoutId="active-pill"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-10 bg-indigo-500 rounded-r-full shadow-glow-indigo z-30" 
                    />
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default ConversationList;
