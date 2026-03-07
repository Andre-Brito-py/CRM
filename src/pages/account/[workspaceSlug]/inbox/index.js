import { useState, useEffect } from 'react';
import AccountLayout from '@/layouts/AccountLayout';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import ConversationList from '@/sections/inbox/ConversationList';
import ChatWindow from '@/sections/inbox/ChatWindow';

// Mock data for development
const mockConversations = [
  {
    id: '1',
    platform: 'WHATSAPP',
    externalId: '5511999999999',
    contact: {
      name: 'John Doe',
      phone: '+5511999999999',
    },
    updatedAt: new Date().toISOString(),
    lastMessage: 'Hello, I am interested in your product.',
    messages: [
      {
        id: '1',
        content: 'Hello, I am interested in your product.',
        direction: 'INBOUND',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: '2',
        content: 'Hi John! Thanks for reaching out. How can I help you?',
        direction: 'OUTBOUND',
        createdAt: new Date(Date.now() - 3500000).toISOString(),
      },
    ],
  },
  {
    id: '2',
    platform: 'WHATSAPP',
    externalId: '5511888888888',
    contact: {
      name: 'Jane Smith',
      phone: '+5511888888888',
    },
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    lastMessage: 'Can you send me the price list?',
    messages: [
      {
        id: '3',
        content: 'Can you send me the price list?',
        direction: 'INBOUND',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      }
    ]
  },
];

const Inbox = () => {
  const [conversations, setConversations] = useState(mockConversations);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);

  useEffect(() => {
    if (selectedId) {
      const conv = conversations.find((c) => c.id === selectedId);
      setSelectedConversation(conv);
    } else {
      setSelectedConversation(null);
    }
  }, [selectedId, conversations]);

  const handleSendMessage = (content) => {
    if (!selectedConversation) return;

    const newMessage = {
      id: Date.now().toString(),
      content,
      direction: 'OUTBOUND',
      createdAt: new Date().toISOString(),
    };

    const updatedConversation = {
      ...selectedConversation,
      messages: [...selectedConversation.messages, newMessage],
      lastMessage: content,
      updatedAt: new Date().toISOString(),
    };

    setConversations((prev) =>
      prev.map((c) => (c.id === selectedId ? updatedConversation : c))
    );
  };

  return (
    <AccountLayout>
      <Meta title="Nextacular - Inbox" />
      <Content.Title
        title="Inbox"
        subtitle="Manage all your customer conversations in one place"
      />
      <Content.Divider />
      <div className="flex flex-col h-[calc(100vh-220px)] overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="flex flex-1 overflow-hidden">
          <ConversationList
            conversations={conversations}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          <div className="flex-1 flex flex-col border-l border-gray-200 overflow-hidden">
            <ChatWindow
              conversation={selectedConversation}
              onSendMessage={handleSendMessage}
            />
          </div>
        </div>
      </div>
    </AccountLayout>
  );
};

export default Inbox;
