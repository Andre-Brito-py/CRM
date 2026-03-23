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
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className={`flex w-full mb-8 ${
        isMe ? 'justify-end' : 'justify-start'
      }`}
    >
      <div
        className={`flex flex-col max-w-[80%] md:max-w-[70%] ${
          isMe ? 'items-end' : 'items-start'
        }`}
      >
        <div
          className={`px-6 py-4 font-executive text-[16px] leading-[1.6] transition-all duration-500 shadow-premium-sm hover:shadow-premium ${
            isMe
              ? 'bg-brand-600 premium-gradient text-white rounded-[26px] rounded-tr-none'
              : 'bg-white text-zinc-800 border border-zinc-100 rounded-[26px] rounded-tl-none'
          }`}
        >
          <p className="whitespace-pre-wrap font-medium">{message.content}</p>
        </div>
        <div className={`mt-2.5 flex items-center gap-2.5 px-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest tabular-nums">
            {message.createdAt ? formatDistanceToNow(new Date(message.createdAt), { addSuffix: false, locale: dateFnsLocale }) : ''}
          </span>
          {isMe && (
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-black text-brand-500 uppercase tracking-widest">
                Delivered
              </span>
              <div className="w-1.5 h-1.5 rounded-full bg-brand-500 shadow-glow-emerald" />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default MessageBubble;
