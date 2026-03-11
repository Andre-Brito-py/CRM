import { formatDistanceToNow } from 'date-fns';
import { UserCircleIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

const ConversationList = ({ conversations, selectedConversationId, onSelect }) => {
  const { t } = useTranslation();

  return (
    <div className="border-r border-zinc-200/50 w-1/3 flex flex-col h-full bg-white/50 backdrop-blur-sm">
      <div className="p-8 border-b border-zinc-200/50">
        <h2 className="text-2xl font-executive font-bold text-zinc-900 tracking-tight mb-6">Inbox</h2>
        <div className="relative group">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 transition-colors group-focus-within:text-indigo-500" />
          <input
            type="text"
            placeholder={t('common.label.search')}
            className="w-full pl-11 pr-4 py-3 bg-zinc-100/50 border border-transparent rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white focus:border-indigo-500/30 transition-all placeholder:text-zinc-400"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <ul className="divide-y divide-zinc-100">
          {conversations.map((conversation) => (
            <li
              key={conversation.id}
              onClick={() => onSelect(conversation)}
              className={`group px-6 py-5 cursor-pointer transition-all duration-300 relative ${selectedConversationId === conversation.id 
                ? 'bg-indigo-50/40' 
                : 'hover:bg-zinc-50'
              }`}
            >
              {selectedConversationId === conversation.id && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-10 bg-indigo-500 rounded-r-full shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
              )}
              <div className="flex items-start justify-between">
                <div className="flex items-center min-w-0">
                  <div className="relative flex-shrink-0">
                    <UserCircleIcon className="h-12 w-12 text-zinc-300 transition-colors group-hover:text-zinc-400" />
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full shadow-sm" />
                  </div>
                  <div className="ml-4 min-w-0">
                    <p className={`text-[15px] font-executive font-bold truncate transition-colors ${selectedConversationId === conversation.id ? 'text-indigo-600' : 'text-zinc-900'}`}>
                      {conversation.contact?.name || 'Unknown Contact'}
                    </p>
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-0.5">
                      {conversation.platform}
                    </p>
                  </div>
                </div>
                <div className="ml-2 flex-shrink-0 flex flex-col items-end">
                  {conversation.updatedAt && (
                    <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-tight">
                      {formatDistanceToNow(new Date(conversation.updatedAt), { addSuffix: false })}
                    </p>
                  )}
                  {conversation.assignee && (
                    <div className="mt-2 flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-zinc-100 border border-zinc-200/50">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                      <span className="text-[10px] font-bold text-zinc-500 truncate max-w-[60px] uppercase tracking-tighter">
                        {conversation.assignee.name.split(' ')[0]}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-3">
                <p className="text-sm text-zinc-500 line-clamp-1 font-medium leading-relaxed">
                  {conversation.messages && conversation.messages.length > 0
                    ? conversation.messages[0].content
                    : 'No messages yet'}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ConversationList;
