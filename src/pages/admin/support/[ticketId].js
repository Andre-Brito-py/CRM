import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import AdminLayout from '@/layouts/AdminLayout';
import fetcher from '@/lib/client/fetcher';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const AdminTicketDetail = () => {
  const router = useRouter();
  const { ticketId } = router.query;
  const [newMessage, setNewMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const messagesEndRef = useRef(null);

  const { data: messagesData, mutate: mutateMessages } = useSWR(ticketId ? `/api/admin/support/${ticketId}/messages` : null, fetcher, { refreshInterval: 15000 });
  const messages = messagesData?.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleUpdateStatus = async (status) => {
    try {
      const res = await fetch(`/api/admin/support`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, statusToUpdate: status })
      });
      if (res.ok) {
         toast.success('Status updated');
      } else {
         toast.error('Failed to update status');
      }
    } catch {
      toast.error('Error updating status');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/support/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage })
      });
      
      if (res.ok) {
        setNewMessage('');
        mutateMessages();
      } else {
        toast.error('Failed to send message');
      }
    } catch {
      toast.error('Error sending message');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="py-6 max-w-4xl mx-auto px-4 sm:px-6 md:px-8 flex flex-col h-[calc(100vh-64px)]">
        <div className="flex sm:items-center justify-between py-3 border-b-2 border-gray-200">
           <div className="flex items-center space-x-4">
              <button onClick={() => router.push('/admin/support')} className="text-sm font-medium text-brand-600 hover:text-brand-500">
                &larr; Back
              </button>
              <h1 className="text-xl font-semibold text-gray-900 truncate">Ticket #{ticketId?.slice(-6)}</h1>
           </div>
           <div className="flex space-x-2">
              <button onClick={() => handleUpdateStatus('CLOSED')} className="text-sm text-red-600 border border-red-300 rounded px-3 py-1 hover:bg-red-50">Close Ticket</button>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col space-y-4">
          {messages.map((m) => {
             const isAdmin = m.author.role === 'SUPERADMIN';
             return (
               <div key={m.id} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                 <span className="text-xs text-gray-400 mb-1 px-2">{m.author?.name || m.author?.email}</span>
                 <div className={`px-4 py-2 rounded-xl text-sm max-w-lg shadow-sm ${
                    isAdmin ? 'bg-brand-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                 }`}>
                   {m.content}
                 </div>
               </div>
             );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t-2 border-gray-200 px-4 pt-4 mb-2 sm:mb-0">
          <form onSubmit={handleSendMessage} className="relative flex">
            <input
              type="text"
              placeholder="Write your message!"
              className="w-full focus:outline-none focus:placeholder-gray-400 text-gray-600 placeholder-gray-500 pl-4 pr-12 bg-gray-50 rounded-full py-3"
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              disabled={submitting}
            />
            <button
               type="submit"
               disabled={!newMessage.trim() || submitting}
               className="inline-flex items-center justify-center absolute right-2 top-2 p-2 rounded-full bg-brand-600 text-white disabled:opacity-50 transition-colors hover:bg-brand-700"
            >
               <PaperAirplaneIcon className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminTicketDetail;
