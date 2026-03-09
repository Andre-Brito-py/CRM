
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import useSWR, { mutate } from 'swr';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { AccountLayout } from '@/layouts/index';
import { useWorkspace } from '@/providers/workspace';
import ConversationList from '@/sections/inbox/ConversationList';
import ChatWindow from '@/sections/inbox/ChatWindow';
import useMembers from '@/hooks/data/useMembers';
import api from '@/lib/common/api';
import { useTranslation } from 'react-i18next';
import OnboardingTour from '@/components/Onboarding/OnboardingTour';

const Inbox = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const { workspace } = useWorkspace();
  const { data: session } = useSession();
  const { data: membersData } = useMembers(workspace?.slug);

  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Filter states
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchText, setSearchText] = useState('');

  // Construct query params for conversations
  const queryParams = new URLSearchParams();
  if (filterAssignee) queryParams.append('assigneeId', filterAssignee);
  if (filterStatus) queryParams.append('status', filterStatus);
  if (searchText) queryParams.append('search', searchText);

  const conversationsUrl = workspace
    ? `/api/workspace/${workspace.slug}/inbox?${queryParams.toString()}`
    : null;

  const { data: conversationsData, error: conversationsError } = useSWR(conversationsUrl);

  const { data: messagesData, error: messagesError, mutate: mutateMessages } = useSWR(
    workspace && selectedConversation
      ? `/api/workspace/${workspace.slug}/inbox/${selectedConversation.id}`
      : null
  );

  useEffect(() => {
    if (messagesData?.data?.conversation?.messages) {
      setMessages(messagesData.data.conversation.messages);
    }
  }, [messagesData]);

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
    setMessages([]); // Clear messages while loading
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
    setMessageText(''); // Clear input

    try {
      const response = await api(`/api/workspace/${workspace.slug}/inbox/${selectedConversation.id}`, {
        method: 'POST',
        body: JSON.stringify({
          content,
          direction: 'OUTBOUND',
          type: 'TEXT',
        }),
      });

      if (response.data) {
        // Replace temp message with actual message from server
        setMessages((prev) =>
          prev.map((msg) => (msg.id === tempMessage.id ? response.data.message : msg))
        );
        mutateMessages(); // Revalidate SWR cache
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      // Ideally remove temp message or show error state
    }
  };

  const handleAssign = async (memberId) => {
    if (!workspace || !selectedConversation) return;

    try {
      const response = await api(`/api/workspace/${workspace.slug}/inbox/${selectedConversation.id}`, {
        method: 'PUT',
        body: JSON.stringify({ assigneeId: memberId }),
      });

      if (response.data) {
        toast.success('Conversation assigned');
        // Update local state
        setSelectedConversation(prev => ({ ...prev, assignee: response.data.conversation.assignee }));
        mutate(conversationsUrl); // Refresh list
      }
    } catch (error) {
      console.error('Error assigning conversation:', error);
      toast.error('Failed to assign conversation');
    }
  };

  const handleGenerateResponse = async () => {
    if (!workspace || !selectedConversation) return;

    setIsGeneratingAI(true);
    try {
      const response = await api(`/api/workspace/${workspace.slug}/inbox/${selectedConversation.id}/suggest-reply`, {
        method: 'POST',
      });

      if (response.data?.suggestion) {
        setMessageText(response.data.suggestion);
        toast.success('AI response generated');
      }
    } catch (error) {
      console.error('Error generating AI response:', error);
      toast.error('Failed to generate AI response');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Mock template creation for now
  const handleCreateTemplate = (name, content) => {
    toast.success(`Template "${name}" created (mock)`);
  };

  if (conversationsError) return <div>Failed to load conversations</div>;

  const inboxSteps = [
    {
      element: '#conversation-list',
      popover: {
        title: t('onboarding.tour.inbox.step1.title'),
        description: t('onboarding.tour.inbox.step1.desc'),
        position: 'right',
      }
    },
    {
      element: '#chat-window',
      popover: {
        title: t('onboarding.tour.inbox.step2.title'),
        description: t('onboarding.tour.inbox.step2.desc'),
        position: 'left',
      }
    },
    {
      element: '#ai-suggest-btn',
      popover: {
        title: t('onboarding.tour.inbox.step3.title'),
        description: t('onboarding.tour.inbox.step3.desc'),
        position: 'top',
      }
    }
  ];

  return (
    <AccountLayout>
      <OnboardingTour tourId="inbox-tour" steps={inboxSteps} />
      <Head>
        <title>Inbox | Nextacular</title>
      </Head>
      <div className="flex h-[calc(100vh-200px)] bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div id="conversation-list" className="w-1/3 min-w-[300px]">
          <ConversationList
            conversations={conversationsData?.data?.conversations || []}
            selectedId={selectedConversation?.id}
            onSelect={handleSelectConversation}
            filterAssignee={filterAssignee}
            setFilterAssignee={setFilterAssignee}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            searchText={searchText}
            setSearchText={setSearchText}
            members={membersData?.members || []}
            user={session?.user}
          />
        </div>
        <div id="chat-window" className="flex-1 flex flex-col min-w-0 bg-white border-l border-gray-200">
          <ChatWindow
            conversation={selectedConversation ? { ...selectedConversation, messages } : null}
            onSendMessage={handleSendMessage}
            onAssign={handleAssign}
            members={membersData?.members || []}
            templates={[]} // Pass templates if available
            onCreateTemplate={handleCreateTemplate}
            messageText={messageText}
            onMessageChange={setMessageText}
            onGenerateResponse={handleGenerateResponse}
            isGeneratingAI={isGeneratingAI}
          />
        </div>
      </div>
    </AccountLayout>
  );
};

export default Inbox;
