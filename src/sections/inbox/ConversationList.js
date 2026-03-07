import { useState } from 'react';
import { UserCircleIcon } from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

const ConversationList = ({ conversations, selectedId, onSelect }) => {
  return (
    <div className="flex flex-col h-full overflow-y-auto bg-white w-80">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">Inbox</h2>
        <div className="mt-2">
          <input
            type="text"
            placeholder="Search conversations..."
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            onClick={() => onSelect(conversation.id)}
            className={`flex items-center p-4 cursor-pointer hover:bg-gray-50 transition-colors ${selectedId === conversation.id ? 'bg-blue-50 border-r-4 border-blue-600' : ''
              }`}
          >
            <div className="flex-shrink-0 mr-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
                <UserCircleIcon className="w-6 h-6" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-1">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  {conversation.contact?.name || conversation.externalId || 'Unknown'}
                </h3>
                <span className="text-xs text-gray-500">
                  {conversation.updatedAt && formatDistanceToNow(new Date(conversation.updatedAt), { addSuffix: false })}
                </span>
              </div>
              <p className="text-sm text-gray-500 truncate">
                {conversation.lastMessage || 'No messages yet'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConversationList;
