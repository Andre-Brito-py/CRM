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
      className={`flex w-full mb-3 ${
        isMe ? 'justify-end' : 'justify-start'
      }`}
    >
      <div
        className={`flex flex-col max-w-[80%] md:max-w-[70%] ${
          isMe ? 'items-end' : 'items-start'
        }`}
      >
        <div
          className={`px-4 py-2 text-[15px] leading-relaxed transition-all shadow-sm ${
            isMe
              ? 'bg-brand-600 text-white rounded-[18px] rounded-tr-none'
              : 'bg-white text-zinc-800 border border-zinc-200 rounded-[18px] rounded-tl-none'
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
        <div className={`mt-1 flex items-center gap-2 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-[11px] text-zinc-400">
            {message.createdAt ? formatDistanceToNow(new Date(message.createdAt), { addSuffix: false, locale: dateFnsLocale }) : ''}
          </span>
          {isMe && (
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default MessageBubble;
