import { formatDistanceToNow } from 'date-fns';
import { enUS, ptBR } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import { motion } from 'framer-motion';

const MessageBubble = ({ message, isMe }) => {
  const { i18n, t } = useTranslation();

  const dateFnsLocale = useMemo(() => {
    const base = (i18n?.language || 'en').split('-')[0];
    return base === 'pt' ? ptBR : enUS;
  }, [i18n?.language]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.6, 
        ease: [0.16, 1, 0.3, 1],
        layout: { duration: 0.3 }
      }}
      className={`flex w-full mb-4 ${
        isMe ? 'justify-end' : 'justify-start'
      }`}
    >
      <div
        className={`flex flex-col max-w-[85%] md:max-w-[75%] ${
          isMe ? 'items-end' : 'items-start'
        }`}
      >
        <div
          className={`px-5 py-3.5 text-[14.5px] leading-[1.6] shadow-xl transition-all relative group overflow-hidden ${
            isMe
              ? 'bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-[1.8rem] rounded-tr-[4px] shadow-indigo-500/20'
              : 'vysify-glass text-zinc-800 dark:text-zinc-100 rounded-[1.8rem] rounded-tl-[4px] shadow-zinc-200/10'
          }`}
        >
          {isMe && (
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl -mr-12 -mt-12 opacity-50 pointer-events-none" />
          )}
          <p className="whitespace-pre-wrap font-medium tracking-tight">
            {message.content}
          </p>
        </div>
        
        <div className={`mt-2 flex items-center gap-2.5 px-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 italic">
            {message.createdAt ? formatDistanceToNow(new Date(message.createdAt), { addSuffix: false, locale: dateFnsLocale }) : ''}
          </span>
          {isMe && (
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-indigo-500 shadow-glow-indigo" />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default MessageBubble;
