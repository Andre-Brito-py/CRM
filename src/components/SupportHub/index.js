import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useWorkspace } from '@/providers/workspace';
import { XMarkIcon, ChatBubbleLeftRightIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';

const SupportHub = () => {
  const { data: session } = useSession();
  const { workspace } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState('menu'); // menu, chat
  const [tickets, setTickets] = useState([]);
  const [currentTicketId, setCurrentTicketId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const fetchTickets = async () => {
    try {
      const res = await fetch('/api/user/support/tickets');
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets);
        if (data.tickets.length > 0) {
           setCurrentTicketId(data.tickets[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMessages = async (ticketId) => {
    try {
      const res = await fetch(`/api/user/support/tickets/${ticketId}/messages`);
      if (res.ok) {
         const data = await res.json();
         setMessages(data.messages);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTickets();
    }
  }, [isOpen]);

  useEffect(() => {
    if (view === 'chat' && currentTicketId) {
       fetchMessages(currentTicketId);
       const interval = setInterval(() => {
         fetchMessages(currentTicketId);
       }, 15000); // Poll every 15s
       return () => clearInterval(interval);
    }
  }, [view, currentTicketId]);

  useEffect(() => {
     messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim()) return;

    setLoading(true);
    try {
      if (!currentTicketId) {
        // Create new ticket
        const res = await fetch('/api/user/support/tickets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
             subject: 'Nova Dúvida via Chat',
             initialMessage: newMessage,
             workspaceId: workspace?.id
          })
        });
        if (res.ok) {
          const data = await res.json();
          setCurrentTicketId(data.ticket.id);
          setView('chat');
        }
      } else {
        // Add message to existing ticket
        await fetch(`/api/user/support/tickets/${currentTicketId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: newMessage })
        });
        await fetchMessages(currentTicketId);
      }
      setNewMessage('');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!session) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center justify-center w-14 h-14 bg-brand-600 text-white rounded-full shadow-lg hover:bg-brand-700 transition-colors"
        >
          <ChatBubbleLeftRightIcon className="w-7 h-7" />
        </button>
      ) : (
        <div className="w-80 h-[450px] bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-2xl shadow-xl flex flex-col drop-shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-brand-600 text-white">
            <h3 className="font-semibold text-lg">Central de Ajuda</h3>
            <button onClick={() => setIsOpen(false)} className="hover:bg-brand-700 p-1 rounded-full transition-colors">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-gray-50 dark:bg-zinc-800/50">
            {view === 'menu' ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Como podemos te ajudar hoje?</p>
                <button
                  className="p-3 text-left w-full rounded-xl bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 hover:border-brand-300 transition-colors shadow-sm text-sm font-medium"
                  onClick={() => alert('Dica: Verifique a aba "Billing" no menu superior para dúvidas de pagamento.')}
                >
                  💳 Dúvidas sobre Pagamento
                </button>
                <button
                   className="p-3 text-left w-full rounded-xl bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 hover:border-brand-300 transition-colors shadow-sm text-sm font-medium"
                   onClick={() => alert('Para conectar o WhatsApp, vá em Configurações > Integrações no seu Workspace.')}
                >
                  📱 Conexão WhatsApp
                </button>
                <button
                   className="p-3 text-left w-full rounded-xl bg-white dark:bg-zinc-800 border border-brand-200 dark:border-brand-900/30 hover:bg-brand-50 dark:hover:bg-brand-900/10 transition-colors shadow-sm text-sm font-bold text-brand-600 dark:text-brand-400 mt-2"
                   onClick={() => setView('chat')}
                >
                  💬 Falar com um Humano
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4 h-full">
                {messages.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center my-auto">Envie uma mensagem para iniciarmos o atendimento.</p>
                ) : (
                  messages.map((m) => {
                    const isMe = m.authorId === session.user.userId || m.author.role === 'USER'; // Approx check
                    return (
                      <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${isMe ? 'bg-brand-600 text-white rounded-tr-sm' : 'bg-gray-200 dark:bg-zinc-700 text-gray-900 dark:text-white rounded-tl-sm'}`}>
                          {m.content}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {view === 'chat' && (
             <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex gap-2">
               <input
                 type="text"
                 value={newMessage}
                 onChange={(e) => setNewMessage(e.target.value)}
                 disabled={loading}
                 placeholder="Digite sua mensagem..."
                 className="flex-1 bg-gray-100 dark:bg-zinc-800 border-transparent focus:bg-white focus:border-brand-500 focus:ring-0 rounded-full px-4 py-2 text-sm"
               />
               <button
                 type="submit"
                 disabled={loading || !newMessage.trim()}
                 className="p-2 bg-brand-600 text-white rounded-full hover:bg-brand-700 disabled:opacity-50 transition-colors"
               >
                 <PaperAirplaneIcon className="w-5 h-5" />
               </button>
             </form>
          )}

          {view === 'chat' && (
            <button
               onClick={() => setView('menu')}
               className="text-xs text-center p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50"
            >
              Voltar para opções
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default SupportHub;
