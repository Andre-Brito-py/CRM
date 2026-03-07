import { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import MessageBubble from './MessageBubble';

const ChatWindow = ({ conversation, onSendMessage }) => {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(newMessage);
      setNewMessage('');
    }
  };

  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 h-full bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700">Select a conversation</h2>
          <p className="mt-2 text-gray-500">Choose a contact from the list to start chatting.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-full bg-gray-100">
      {/* Header */}
      <div className="flex items-center px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-800">
            {conversation.contact?.name || conversation.externalId || 'Unknown'}
          </h2>
          <p className="text-sm text-gray-500">
            {conversation.platform} • {conversation.contact?.phone || conversation.externalId}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-6 overflow-y-auto">
        {conversation.messages?.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isMe={message.direction === 'OUTBOUND'}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-200">
        <form onSubmit={handleSend} className="flex space-x-4">
          <input
            type="text"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="flex items-center justify-center px-6 py-3 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PaperAirplaneIcon className="w-5 h-5 transform rotate-90" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;
