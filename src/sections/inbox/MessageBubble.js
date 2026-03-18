import { formatDistanceToNow } from 'date-fns';
import { enUS, ptBR } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';

const MessageBubble = ({ message, isMe }) => {
  const { i18n } = useTranslation();

  const dateFnsLocale = useMemo(() => {
    const base = (i18n?.language || 'en').split('-')[0];
    return base === 'pt' ? ptBR : enUS;
  }, [i18n?.language]);

  return (
    <div
      className={`flex w-full mb-6 ${
        isMe ? 'justify-end' : 'justify-start'
      } animate-in fade-in slide-in-from-bottom-2 duration-300`}
    >
      <div
        className={`flex flex-col max-w-[75%] ${
          isMe ? 'items-end' : 'items-start'
        }`}
      >
        <div
          className={`px-5 py-3.5 shadow-premium font-executive text-[15px] leading-relaxed transition-all duration-300 hover:shadow-lg ${
            isMe
              ? 'bg-brand-600 text-white rounded-[22px] rounded-tr-none'
              : 'bg-white text-zinc-800 border border-zinc-100 rounded-[22px] rounded-tl-none'
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
        <div className={`mt-2 flex items-center gap-2 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            {message.createdAt ? formatDistanceToNow(new Date(message.createdAt), { addSuffix: false, locale: dateFnsLocale }) : ''}
          </span>
          {isMe && (
            <span className="text-[10px] font-bold text-brand-400 uppercase tracking-tight">
              Delivered
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
