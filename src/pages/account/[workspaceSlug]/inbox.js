import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { AccountLayout } from '@/layouts/index';
import { useWorkspace } from '@/providers/workspace';
import ConversationList from '@/components/Inbox/ConversationList';
import ChatWindow from '@/components/Inbox/ChatWindow';

const Inbox = () => {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);

  const { data: conversationsData, error: conversationsError } = useSWR(
    workspace ? `/api/workspace/${workspace.slug}/inbox` : null
  );

  const { data: messagesData, error: messagesError, mutate: mutateMessages } = useSWR(
    workspace && selectedConversation
      ? `/api/workspace/${workspace.slug}/inbox/${selectedConversation.id}`
      : null
  );

  useEffect(() => {
    if (messagesData) {
      setMessages(messagesData.data.conversation.messages);
    }
  }, [messagesData]);

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
  };

  const handleSendMessage = async (content) => {
    if (!workspace || !selectedConversation) return;

    // Optimistic UI update
    const tempMessage = {
      id: Date.now().toString(),
      content,
      direction: 'OUTBOUND',
      createdAt: new Date().toISOString(),
      status: 'SENDING',
    };

    setMessages((prev) => [...prev, tempMessage]);

    try {
      const response = await fetch(
        `/api/workspace/${workspace.slug}/inbox/${selectedConversation.id}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content,
            direction: 'OUTBOUND',
            type: 'TEXT',
          }),
        }
      );

      if (response.ok) {
        const { data } = await response.json();
        // Replace temp message with actual message from server
        setMessages((prev) =>
          prev.map((msg) => (msg.id === tempMessage.id ? data.message : msg))
        );
        mutateMessages(); // Revalidate SWR cache
      } else {
        console.error('Failed to send message');
        // Remove temp message or show error
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (conversationsError) return <div>Failed to load conversations</div>;

  return (
    <AccountLayout>
      <Head>
        <title>Inbox | Nextacular</title>
      </Head>
      <div className="flex h-[calc(100vh-200px)] bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <ConversationList
          conversations={conversationsData?.data?.conversations || []}
          selectedConversationId={selectedConversation?.id}
          onSelect={handleSelectConversation}
        />
        <div className="flex-1 flex flex-col min-w-0 bg-white border-l border-gray-200">
          <ChatWindow
            conversation={selectedConversation}
            messages={messages}
            onSendMessage={handleSendMessage}
          />
        </div>
      </div>
    </AccountLayout>
  );
};

export default Inbox;
