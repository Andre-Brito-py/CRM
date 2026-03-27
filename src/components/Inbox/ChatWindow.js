import { useState, useRef, useEffect } from 'react';
import { 
  PaperAirplaneIcon, 
  ChevronRightIcon, 
  SparklesIcon, 
  XMarkIcon,
  ArrowUturnLeftIcon,
  UserIcon,
  ChatBubbleBottomCenterTextIcon
} from '@heroicons/react/24/solid';
import { useTranslation } from 'react-i18next';
import { useWorkspace } from '@/providers/workspace';
import api from '@/lib/common/api';
import { motion, AnimatePresence } from 'framer-motion';

const ChatWindow = ({ 
  conversation, 
  messages, 
  onSendMessage, 
  members = [], 
  onAssign, 
  templates = [],
  onBack,
  isGeneratingAI,
  onSummarizeConversation,
  isSummarizingAI,
  messageText,
  onMessageChange,
  onGenerateResponse
}) => {
  const { t } = useTranslation();
  const { workspace } = useWorkspace();
  const [summary, setSummary] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    setSummary(null);
  }, [conversation?.id]);

  const handleSend = (e) => {
    e.preventDefault();
    if (messageText?.trim()) {
      onSendMessage(messageText);
      onMessageChange('');
    }
  };

  const handleTemplateChange = (e) => {
    const templateContent = e.target.value;
    if (templateContent) {
      onMessageChange(templateContent);
    }
  };

  const handleLocalSummarize = async () => {
    if (onSummarizeConversation) {
      const res = await onSummarizeConversation();
      if (res) setSummary(res);
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-50/20 h-full p-12 overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.03),transparent_70%)]" />
        <motion.div 
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-32 h-32 bg-white rounded-[48px] shadow-premium flex items-center justify-center mb-10 border border-zinc-100/50 relative z-10"
        >
          <ChatBubbleBottomCenterTextIcon className="w-14 h-14 text-indigo-100 -rotate-12" />
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute -top-2 -right-2 w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center shadow-glow-indigo"
          >
            <SparklesIcon className="w-4 h-4 text-white" />
          </motion.div>
        </motion.div>
        <h2 className="text-3xl font-executive font-extrabold text-zinc-900 tracking-tight mb-3 relative z-10 text-center">
          {t('inbox.chat.empty.title')}
        </h2>
        <p className="text-zinc-400 text-lg font-medium relative z-10 text-center max-w-sm">
          {t('inbox.chat.empty.subtitle')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white relative overflow-hidden">
      {/* Header */}
      <div className="px-10 py-7 border-b border-zinc-100 flex justify-between items-center glass-premium z-30 sticky top-0">
        <div className="flex items-center gap-5">
          <button 
            onClick={onBack}
            className="md:hidden p-2.5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-all active:scale-90"
          >
            <ArrowUturnLeftIcon className="w-5 h-5" />
          </button>
          
          <div className="relative">
            <div className="w-14 h-14 bg-gradient-to-br from-indigo-50 to-white rounded-[22px] flex items-center justify-center border border-indigo-100/50 shadow-premium-sm overflow-hidden group">
              <UserIcon className="w-8 h-8 text-indigo-200 transition-all duration-500 group-hover:scale-110 group-hover:text-indigo-400" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-4 border-white rounded-full shadow-sm" />
          </div>

          <div className="flex flex-col">
            <h3 className="text-2xl font-executive font-extrabold text-zinc-900 tracking-tighter leading-tight">
              {conversation.contact?.name || 'Unknown'}
            </h3>
            <div className="flex items-center gap-2.5 mt-1">
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] bg-indigo-50 px-2 py-0.5 rounded-md">
                {conversation.platform}
              </span>
              <span className="w-1 h-1 rounded-full bg-zinc-200" />
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest leading-none">
                Active Now
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLocalSummarize}
            disabled={isSummarizingAI || !messages?.length}
            className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl border-2 text-sm font-black transition-all duration-300 ${
              isSummarizingAI
                ? 'bg-indigo-50 border-indigo-100 text-indigo-400 cursor-wait'
                : 'bg-indigo-50/50 border-indigo-100/50 text-indigo-600 hover:bg-white hover:border-indigo-400 hover:shadow-glow-indigo shadow-premium-sm'
            } disabled:opacity-40 disabled:grayscale`}
          >
            <SparklesIcon className={`h-5 w-5 ${isSummarizingAI ? 'animate-spin' : 'animate-pulse'}`} />
            {isSummarizingAI ? t('inbox.ai.summarizing') : t('inbox.ai.summarize')}
          </motion.button>

          <div className="h-10 w-px bg-zinc-100 mx-1" />

          <div className="hidden lg:flex items-center bg-zinc-50 border border-zinc-100 rounded-2xl px-5 py-3 hover:bg-white hover:border-zinc-300 transition-all shadow-premium-sm group">
            <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest mr-4 group-hover:text-indigo-400 transition-colors">
              Owner
            </span>
            <select
              className="bg-transparent text-sm font-bold text-zinc-800 focus:outline-none cursor-pointer pr-4 hover:text-indigo-600 transition-colors"
              value={conversation.assigneeId || ''}
              onChange={(e) => onAssign(e.target.value)}
            >
              <option value="">{t('common.unassigned')}</option>
              {members.map((m) => (
                <option key={m.member?.id || m.id} value={m.member?.id}>
                  {m.member?.name || m.email}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden sm:block ml-2">
            <img src="/images/logo-symbol.png" alt="Vysify" className="w-8 h-8 opacity-40 hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-10 space-y-8 bg-zinc-50/20 custom-scrollbar scroll-smooth">
        <AnimatePresence>
          {summary && (
            <motion.div 
              initial={{ opacity: 0, height: 0, y: -20 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -20 }}
              className="relative overflow-hidden mb-12"
            >
              <div className="p-8 bg-gradient-to-br from-indigo-600 to-indigo-900 border border-white/10 rounded-[32px] shadow-2xl relative">
                <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none">
                  <SparklesIcon className="w-32 h-32 text-white" />
                </div>
                <div className="flex items-center justify-between mb-6 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20">
                      <SparklesIcon className="h-5 w-5 text-indigo-200" />
                    </div>
                    <span className="text-lg font-executive font-extrabold text-white tracking-tight">Executive Summary</span>
                  </div>
                  <button
                    onClick={() => setSummary(null)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-indigo-200 hover:text-white transition-all border border-white/5"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-[15px] text-indigo-50 font-medium leading-relaxed whitespace-pre-wrap relative z-10 opacity-90 italic">
                  &ldquo;{summary}&rdquo;
                </p>
                <div className="mt-6 flex items-center gap-2 relative z-10">
                  <div className="px-3 py-1 bg-white/10 rounded-full border border-white/10">
                    <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">AI Insights Engine v2.0</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {messages.map((msg, idx) => {
            const isOutbound = msg.direction === 'OUTBOUND';
            return (
              <motion.div
                key={msg.id}
                layout
                initial={{ opacity: 0, scale: 0.95, x: isOutbound ? 20 : -20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'} max-w-[70%] group/msg`}>
                  <div
                    className={`px-8 py-5 rounded-[32px] font-medium text-[16px] leading-relaxed transition-all duration-300 shadow-premium-sm relative ${
                      isOutbound
                        ? 'bg-gradient-to-br from-zinc-800 to-zinc-950 text-white rounded-br-lg shadow-glow-indigo/10 border border-white/5'
                        : 'bg-white text-zinc-800 rounded-bl-lg border border-zinc-100 group-hover/msg:border-zinc-200 group-hover/msg:shadow-premium'
                    } hover:scale-[1.01]`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    
                    {/* Timestamp visible on hover or last message */}
                    <div className={`mt-3 flex items-center gap-3 transition-opacity duration-300 ${isOutbound ? 'flex-row-reverse' : 'flex-row'}`}>
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest opacity-60">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isOutbound && (
                        <div className="flex items-center gap-1">
                          <div className="w-1 h-1 rounded-full bg-indigo-500" />
                          <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Sent</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Input Area */}
      <div className="p-10 border-t border-zinc-100 bg-white shadow-[0_-15px_30px_-15px_rgba(0,0,0,0.03)] z-20">
        <div className="flex items-center gap-4 mb-8">
          <div className="relative group/sel">
            <select
              className="appearance-none block w-full px-6 py-3.5 bg-zinc-50 border border-zinc-100 rounded-[20px] text-xs font-black text-zinc-500 uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500/30 transition-all cursor-pointer shadow-premium-sm"
              onChange={handleTemplateChange}
              value=""
            >
              <option value="" disabled>{t('inbox.templates.title').toUpperCase()}</option>
              {templates.map((tmpl) => (
                <option key={tmpl.id} value={tmpl.content}>
                  {tmpl.name}
                </option>
              ))}
            </select>
            <ChevronRightIcon className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 rotate-90 pointer-events-none group-hover/sel:text-indigo-400 transition-colors" />
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onGenerateResponse?.()}
            disabled={isGeneratingAI}
            className="flex items-center gap-2 px-6 py-3.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-[20px] transition-all shadow-premium hover:shadow-glow-indigo/40 disabled:opacity-20 disabled:grayscale"
          >
            <SparklesIcon className={`h-4 w-4 ${isGeneratingAI ? 'animate-spin' : 'text-indigo-400'}`} />
            <span className="text-[11px] font-black uppercase tracking-widest">Smart Reply</span>
          </motion.button>
        </div>

        <form onSubmit={handleSend} className="relative group">
          <textarea
            className="w-full bg-zinc-50 border border-zinc-200/50 rounded-[40px] pl-10 pr-28 py-8 text-[16px] font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500/40 transition-all resize-none leading-relaxed shadow-premium-sm"
            placeholder={t('inbox.message.placeholder')}
            rows="2"
            value={messageText}
            onChange={(e) => onMessageChange?.(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
          />
          <motion.button
            type="submit"
            whileHover={{ scale: 1.05, x: 2 }}
            whileTap={{ scale: 0.95 }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-6 bg-indigo-600 text-white rounded-[32px] hover:bg-indigo-700 shadow-2xl shadow-indigo-600/20 disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed group/btn border border-white/10"
            disabled={!messageText?.trim()}
          >
            <PaperAirplaneIcon className="h-6 w-6 transform transition-transform group-hover/btn:rotate-12 group-hover/btn:-translate-y-1 group-hover/btn:translate-x-1" />
          </motion.button>
        </form>
        
        <p className="text-[10px] text-center mt-6 font-bold text-zinc-300 uppercase tracking-widest">
          Press <kbd className="px-1.5 py-0.5 bg-zinc-100 rounded border border-zinc-200 text-zinc-400">Enter</kbd> to send • <kbd className="px-1.5 py-0.5 bg-zinc-100 rounded border border-zinc-200 text-zinc-400">Shift + Enter</kbd> for newline
        </p>
      </div>
    </div>
  );
};

export default ChatWindow;
