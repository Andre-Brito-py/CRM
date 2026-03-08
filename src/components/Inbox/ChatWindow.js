import { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';

const ChatWindow = ({ conversation, messages, onSendMessage, members = [], onAssign, templates = [] }) => {
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
      <div className="flex-1 flex items-center justify-center bg-gray-50 h-full">
        <p className="text-gray-500 text-lg">Select a conversation to start chatting</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <div className="flex items-center">
          <h3 className="text-lg font-medium text-gray-900">
            {conversation.contact?.name || 'Unknown Contact'}
          </h3>
          <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
            {conversation.platform}
          </span>
        </div>
        <div className="flex items-center">
          <span className="text-sm text-gray-500 mr-2">Assign to:</span>
          <select
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
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

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow ${msg.direction === 'OUTBOUND'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-white text-gray-900 rounded-bl-none'
                }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              <span className={`text-xs block mt-1 ${msg.direction === 'OUTBOUND' ? 'text-blue-200' : 'text-gray-400'}`}>
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="mb-2">
          <select
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md text-gray-500"
            onChange={handleTemplateChange}
            value=""
          >
            <option value="" disabled>Insert Template...</option>
            {templates.map(t => (
              <option key={t.id} value={t.content}>{t.name}</option>
            ))}
          </select>
        </div>
        <form onSubmit={handleSend} className="flex items-center space-x-2">
          <textarea
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Type a message..."
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
            className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            disabled={!newMessage.trim()}
          >
            <PaperAirplaneIcon className="h-5 w-5 transform rotate-90" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;
