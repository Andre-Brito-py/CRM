import { formatDistanceToNow } from 'date-fns';
import { UserCircleIcon } from '@heroicons/react/24/outline';

const ConversationList = ({ conversations, selectedConversationId, onSelect }) => {
  return (
    <div className="border-r border-gray-200 w-1/3 flex flex-col h-full bg-white">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Inbox</h2>
        <div className="mt-2">
          <input
            type="text"
            placeholder="Search messages..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <ul className="divide-y divide-gray-200">
          {conversations.map((conversation) => (
            <li
              key={conversation.id}
              onClick={() => onSelect(conversation)}
              className={`hover:bg-gray-50 cursor-pointer ${selectedConversationId === conversation.id ? 'bg-blue-50' : ''
                }`}
            >
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <UserCircleIcon className="h-10 w-10 text-gray-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-blue-600 truncate">
                        {conversation.contact?.name || 'Unknown Contact'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {conversation.platform}
                      </p>
                    </div>
                  </div>
                  <div className="ml-2 flex-shrink-0 flex flex-col items-end">
                    <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Open
                    </p>
                    {conversation.updatedAt && (
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDistanceToNow(new Date(conversation.updatedAt), { addSuffix: true })}
                      </p>
                    )}
                    {conversation.assignee && (
                      <p className="text-xs text-gray-500 mt-1 truncate max-w-[100px]">
                        {conversation.assignee.name}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-2 sm:flex sm:justify-between">
                  <div className="sm:flex">
                    <p className="flex items-center text-sm text-gray-500 truncate">
                      {conversation.messages && conversation.messages.length > 0
                        ? conversation.messages[0].content
                        : 'No messages yet'}
                    </p>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ConversationList;
