import { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { useTranslation } from 'react-i18next';

const ChatWindow = ({ conversation, messages, onSendMessage, members = [], onAssign, templates = [] }) => {
  const { t } = useTranslation();
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(newMessage);
      setNewMessage('');
    }
  };

  const handleTemplateChange = (e) => {
    const templateContent = e.target.value;
    if (templateContent) {
      setNewMessage(templateContent);
    }
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-50/30 h-full p-12">
        <div className="w-24 h-24 bg-white/80 rounded-[40px] shadow-premium-sm flex items-center justify-center mb-8 border border-zinc-100">
           <PaperAirplaneIcon className="w-10 h-10 text-zinc-200 -rotate-45" />
        </div>
        <p className="text-zinc-400 text-lg font-executive font-semibold tracking-tight">Select a conversation to start chatting</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="px-8 py-6 border-b border-zinc-100 flex justify-between items-center glass-light z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-zinc-100 rounded-2xl flex items-center justify-center border border-zinc-200/50">
            <span className="text-lg font-executive font-bold text-zinc-400">
              {conversation.contact?.name?.charAt(0) || '?'}
            </span>
          </div>
          <div>
            <h3 className="text-xl font-executive font-bold text-zinc-900 tracking-tight leading-none mb-1.5 text-executive">
              {conversation.contact?.name || 'Unknown Contact'}
            </h3>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none">
                {conversation.platform}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-zinc-100/50 border border-zinc-200/50 rounded-2xl px-4 py-2 hover:bg-zinc-100 transition-colors">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mr-3">{t('common.label.assignee')}:</span>
            <select
              className="bg-transparent text-sm font-bold text-zinc-700 focus:outline-none cursor-pointer pr-4"
              value={conversation.assigneeId || ''}
              onChange={(e) => onAssign(e.target.value)}
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                m.member ? (
                  <option key={m.id} value={m.member.id}>
                    {m.member.name || m.email}
                  </option>
                ) : null
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-zinc-50/30 custom-scrollbar">
        {messages.map((msg, idx) => {
          const isOutbound = msg.direction === 'OUTBOUND';
          const isFirstInGroup = idx === 0 || messages[idx-1].direction !== msg.direction;
          
          return (
            <div
              key={msg.id}
              className={`flex ${isOutbound ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
            >
              <div className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'} max-w-[70%]`}>
                <div
                  className={`px-6 py-4 rounded-[28px] shadow-premium-sm font-medium text-[15px] leading-relaxed transition-transform duration-300 hover:scale-[1.01] ${isOutbound
                      ? 'bg-zinc-900 text-white rounded-br-lg'
                      : 'bg-white text-zinc-800 rounded-bl-lg border border-zinc-100'
                    }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                <div className={`mt-2 flex items-center gap-2 px-2 ${isOutbound ? 'flex-row-reverse' : 'flex-row'}`}>
                   <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {isOutbound && idx === messages.length - 1 && (
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-tight">Delivered</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-8 border-t border-zinc-100 bg-white">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
             <select
              className="appearance-none block w-full px-5 py-3 bg-zinc-100/50 border border-transparent rounded-2xl text-sm font-bold text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white focus:border-zinc-200 transition-all cursor-pointer"
              onChange={handleTemplateChange}
              value=""
            >
              <option value="" disabled>Insert Message Template...</option>
              {templates.map(t => (
                <option key={t.id} value={t.content} className="font-medium">{t.name}</option>
              ))}
            </select>
            <ChevronRightIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 rotate-90 pointer-events-none" />
          </div>
        </div>
        
        <form onSubmit={handleSend} className="relative">
          <textarea
            className="w-full bg-zinc-100/50 border border-transparent rounded-[32px] pl-8 pr-20 py-5 text-[15px] font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white focus:border-indigo-500/30 transition-all resize-none leading-relaxed"
            placeholder="Write your message..."
            rows="2"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (newMessage.trim()) handleSend(e);
              }
            }}
          />
          <button
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-4 bg-zinc-900 text-white rounded-[24px] hover:bg-zinc-800 hover:scale-[1.05] active:scale-95 transition-all duration-300 shadow-xl shadow-zinc-900/20 disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed group border border-white/5"
            disabled={!newMessage.trim()}
          >
            <PaperAirplaneIcon className="h-5 w-5 transform transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;
