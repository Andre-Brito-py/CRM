import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import toast from 'react-hot-toast';
import AccountLayout from '@/layouts/AccountLayout';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import ConversationList from '@/sections/inbox/ConversationList';
import ChatWindow from '@/sections/inbox/ChatWindow';
import api from '@/lib/common/api';

const Inbox = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const { workspaceSlug } = router.query;
  const [selectedId, setSelectedId] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchText, setSearchText] = useState('');
  const [messageText, setMessageText] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Fetch conversations
  const { data: conversationsData, mutate: mutateConversations } = useSWR(
    workspaceSlug
      ? `/api/workspace/${workspaceSlug}/inbox?assigneeId=${filterAssignee}&status=${filterStatus}&search=${searchText}`
      : null,
    api
  );

  // Fetch members for assignment
  const { data: membersData } = useSWR(
    workspaceSlug ? `/api/workspace/${workspaceSlug}/members` : null,
    api
  );

  // Fetch templates
  const { data: templatesData, mutate: mutateTemplates } = useSWR(
    workspaceSlug ? `/api/workspace/${workspaceSlug}/inbox/templates` : null,
    api
  );

  const conversations = conversationsData?.data?.conversations || [];
  const members = membersData?.data?.members || [];
  const templates = templatesData?.data?.templates || [];

  useEffect(() => {
    if (selectedId && conversations.length > 0) {
      const conv = conversations.find((c) => c.id === selectedId);
      setSelectedConversation(conv);
    } else {
      setSelectedConversation(null);
    }
  }, [selectedId, conversations]);

  const handleGenerateResponse = async () => {
    if (!selectedConversation) return;

    setIsGeneratingAI(true);
    try {
      const response = await api(`/api/workspace/${workspaceSlug}/inbox/${selectedConversation.id}/suggest-reply`, {
        method: 'POST',
      });

      if (response.data?.suggestion) {
        setMessageText(response.data.suggestion);
        toast.success('Response generated!');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate response');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSendMessage = async (content) => {
    if (!selectedConversation) return;

    const previousConversations = [...conversations];

    // Optimistic update
    const newMessage = {
      id: Date.now().toString(),
      content,
      direction: 'OUTBOUND',
      createdAt: new Date().toISOString(),
      status: 'SENDING',
    };

    const updatedConversation = {
      ...selectedConversation,
      messages: [...(selectedConversation.messages || []), newMessage],
      lastMessage: content,
      updatedAt: new Date().toISOString(),
    };

    // Update local state immediately
    mutateConversations({
      data: {
        conversations: conversations.map((c) =>
          c.id === selectedId ? updatedConversation : c
        )
      }
    }, false);

    try {
      await api(`/api/workspace/${workspaceSlug}/inbox/${selectedConversation.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          direction: 'OUTBOUND',
          type: 'TEXT',
        }),
      });
      // Revalidate to get the real message ID and status
      mutateConversations();
    } catch (error) {
      console.error(error);
      toast.error('Failed to send message');
      // Rollback
      mutateConversations({ data: { conversations: previousConversations } }, false);
    }
  };

  const handleAssign = async (assigneeId) => {
    if (!selectedConversation) return;

    try {
      await api(`/api/workspace/${workspaceSlug}/inbox/${selectedConversation.id}`, {
        method: 'PUT',
        body: { assigneeId },
      });
      toast.success('Conversation assigned');
      mutateConversations();
    } catch (error) {
      console.error(error);
      toast.error('Failed to assign conversation');
    }
  };

  return (
    <AccountLayout>
      <Meta title="Inbox" />
      <Content>
        <div className="flex h-[calc(100vh-200px)] overflow-hidden bg-white rounded-lg shadow-lg border border-gray-200">
          <div className={`${selectedId ? 'hidden md:block h-full md:flex-shrink-0' : 'block w-full h-full'}`}>
            <ConversationList
              conversations={conversations}
              selectedConversationId={selectedId}
              onSelect={(conv) => setSelectedId(conv.id)}
              filterAssignee={filterAssignee}
              setFilterAssignee={setFilterAssignee}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              searchText={searchText}
              setSearchText={setSearchText}
              members={members}
              user={session?.user}
            />
          </div>
          <div className={`${selectedId ? 'block w-full md:w-auto' : 'hidden md:block'} flex-1 h-full`}>
            <ChatWindow
              conversation={selectedConversation}
              messages={selectedConversation?.messages || []}
              onSendMessage={handleSendMessage}
              members={members}
              onAssign={handleAssign}
              templates={templates}
              messageText={messageText}
              onMessageChange={setMessageText}
              onGenerateResponse={handleGenerateResponse}
              isGeneratingAI={isGeneratingAI}
              onBack={() => setSelectedId(null)}
            />
          </div>
        </div>
      </Content>
    </AccountLayout>
  );
};

export default Inbox;
