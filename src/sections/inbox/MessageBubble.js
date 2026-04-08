import { formatDistanceToNow } from 'date-fns';
import { enUS, ptBR } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowUturnLeftIcon } from '@heroicons/react/24/outline';

const MessageBubble = ({ message, isMe, onReply }) => {
  const { i18n } = useTranslation();

  const dateFnsLocale = useMemo(() => {
    const base = (i18n?.language || 'en').split('-')[0];
    return base === 'pt' ? ptBR : enUS;
  }, [i18n?.language]);

  const isSystem = message.type === 'SYSTEM';

  if (isSystem) {
    return (
      <div className="flex justify-center w-full my-8">
        <motion.div
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           className="px-6 py-2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-400 italic">
            {message.content}
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: isMe ? 20 : -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ 
        duration: 0.8, 
        ease: [0.16, 1, 0.3, 1],
        layout: { duration: 0.3 }
      }}
      className={`flex w-full mb-8 group/bubble ${isMe ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`flex items-center gap-4 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={`flex flex-col max-w-[85vw] sm:max-w-md lg:max-w-lg ${isMe ? 'items-end' : 'items-start'}`}>
          <div
            className={`px-4 py-3 sm:px-5 sm:py-3.5 text-[15px] leading-relaxed shadow-sm transition-all relative group ${
              isMe
                ? 'bg-zinc-900 dark:bg-zinc-800 text-white rounded-2xl rounded-tr-sm'
                : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-2xl rounded-tl-sm border border-zinc-200/50 dark:border-zinc-800'
            }`}
          >
            {/* Quoted Message */}
            {message.quotedMessage && (
              <div className={`mb-3 p-3 rounded-lg border-l-2 text-[13px] ${
                isMe ? 'bg-white/10 border-white/30 text-white/90' : 'bg-zinc-200/50 dark:bg-white/5 border-zinc-400 text-zinc-600 dark:text-zinc-400'
              }`}>
                <p className="line-clamp-2">{message.quotedMessage.content}</p>
              </div>
            )}

            <p className="whitespace-pre-wrap">
              {message.content}
            </p>
          </div>
          
          <div className={`mt-1.5 flex items-center gap-2 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
            <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums">
              {message.createdAt ? formatDistanceToNow(new Date(message.createdAt), { addSuffix: false, locale: dateFnsLocale }) : ''}
            </span>
            {isMe && (
              <div className="flex items-center gap-1">
                {message.status === 'FAILED' ? (
                  <div className="flex items-center gap-1 text-red-500">
                    <span className="text-[10px] font-medium uppercase">Error</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-0.5 opacity-50">
                    <div className="w-1 h-1 rounded-full bg-zinc-500" />
                    <div className="w-1 h-1 rounded-full bg-zinc-500" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Reply Action */}
        {!isSystem && onReply && (
          <motion.button
            whileHover={{ scale: 1.1, rotate: -5 }}
            whileTap={{ scale: 0.9 }}
            onClick={onReply}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-zinc-400 hover:text-indigo-600 hover:border-indigo-500/30 shadow-premium-sm transition-all opacity-0 group-hover/bubble:opacity-100 scale-90 group-hover/bubble:scale-100"
          >
            <ArrowUturnLeftIcon className="w-4 h-4" />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};

export default MessageBubble;
