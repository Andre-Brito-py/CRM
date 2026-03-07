import { formatDistanceToNow } from 'date-fns';

const MessageBubble = ({ message, isMe }) => {
  return (
    <div
      className={`flex w-full mb-4 ${
        isMe ? 'justify-end' : 'justify-start'
      }`}
    >
      <div
        className={`flex flex-col max-w-[70%] rounded-lg p-3 ${
          isMe
            ? 'bg-blue-600 text-white rounded-tr-none'
            : 'bg-white text-gray-900 border border-gray-200 rounded-tl-none'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <span
          className={`text-xs mt-1 ${
            isMe ? 'text-blue-100' : 'text-gray-500'
          }`}
        >
          {message.createdAt ? formatDistanceToNow(new Date(message.createdAt), { addSuffix: true }) : ''}
        </span>
      </div>
    </div>
  );
};

export default MessageBubble;
