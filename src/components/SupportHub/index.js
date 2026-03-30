import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useWorkspace } from '@/providers/workspace';
import { XMarkIcon, ChatBubbleLeftRightIcon, PaperAirplaneIcon, ChevronLeftIcon } from '@heroicons/react/24/outline';

const FAQ_DATA = [
  {
    id: 'payment',
    icon: '💳',
    title: 'Planos e Faturamento',
    items: [
      {
        q: 'Como altero meu plano?',
        a: 'Você pode fazer o upgrade ou downgrade do seu plano acessando o menu "Conta" no canto superior direito e clicando em "Faturamento" (Billing). Lá estarão listados os planos disponíveis.'
      },
      {
        q: 'Como atualizo meu cartão de crédito?',
        a: 'No menu superior "Conta" > "Faturamento", você verá uma opção para gerenciar seus métodos de pagamento ou acessar o portal do cliente.'
      },
      {
        q: 'Por que fui cobrado a mais?',
        a: 'Isso pode ocorrer devido a taxas de Uso de IA (Overage) se você ultrapassar o limite do seu plano, ou comissões retidas em pagamentos (Marketplace Fees) caso você use o checkout integrado.'
      }
    ]
  },
  {
    id: 'whatsapp',
    icon: '📱',
    title: 'WhatsApp e Caixa de Entrada',
    items: [
      {
        q: 'Como conectar meu WhatsApp?',
        a: 'No menu lateral do seu Workspace, vá em "Configurações" > "Integrações" e escolha WhatsApp. Você precisará escanear o QR Code gerado pelo sistema.'
      },
      {
        q: 'Minha conexão caiu, o que fazer?',
        a: 'Vá novamente na tela de Integrações, desconecte a instância atual e gere um novo QR Code. Certifique-se de que seu celular está conectado à internet.'
      },
      {
        q: 'Como a IA do Autopilot funciona?',
        a: 'O Autopilot pode ser ativado na tela de "Inbox" dentro de uma conversa específica ou nas automações. Ele utiliza o Contexto do Workspace definido em "Configurações > IA" para responder.'
      }
    ]
  },
  {
    id: 'crm',
    icon: '🤝',
    title: 'CRM e Automações (No-Code)',
    items: [
      {
        q: 'Como criar múltiplos funis (Pipelines)?',
        a: 'No menu "Funil de Vendas", você controla seus processos via blocos visuais arrastáveis (Kanban). É 100% No-Code: clique no seletor de funis no topo e em "Criar Novo". Você pode customizar estágios e cores depois.'
      },
      {
        q: 'Como as automações visuais funcionam?',
        a: 'Nosso sistema de Automação é "No-Code" (sem necessidade de código). Você monta regras em uma interface simples: escolhe um "Gatilho" pronto (ex: negócio ganhou) e conecta com "Ações" automáticas (ex: enviar WhatsApp, chamar webhook, etc).'
      },
      {
        q: 'Posso convidar mais pessoas da minha equipe?',
        a: 'Sim! Vá em "Membros" dentro das "Configurações" do Workspace e clique em "Convidar Membro" para enviar o convite, distribuindo a gestão dos negócios sem mexer em código.'
      }
    ]
  },
  {
    id: 'forms',
    icon: '📝',
    title: 'Construtor Visual (WebForms)',
    items: [
      {
        q: 'Preciso saber programar para captar leads?',
        a: 'Não! Nosso Construtor Visual de Formulários é 100% "Drag-and-Drop" (arrastar e soltar). Vá em "Formulários" para criar uma página de captura incrível, adicionar campos personalizados e editar o visual em segundos.'
      },
      {
        q: 'Como integrar os formulários ao meu funil?',
        a: 'Na configuração visual do WebForm, e usando nossa engenharia No-Code, você escolhe exatamente em qual Estágio do Funil (Pipeline) aquele lead recém-captado irá acampar. É instantâneo.'
      }
    ]
  }
];

const SupportHub = () => {
  const { data: session } = useSession();
  const { workspace } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState('menu'); // 'menu', 'faq', 'answer', 'chat'
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeQuestion, setActiveQuestion] = useState(null);
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
       }, 15000);
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
        const res = await fetch('/api/user/support/tickets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
             subject: 'Dúvida do Visiot',
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
        <div className="w-80 sm:w-80 w-[calc(100vw-2rem)] h-[450px] max-h-[85vh] bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-2xl shadow-xl flex flex-col drop-shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-brand-600 text-white">
             {view !== 'menu' && view !== 'chat' && (
               <button onClick={() => {
                  if (view === 'answer') setView('faq');
                  else setView('menu');
               }} className="hover:bg-brand-700 p-1 rounded-full transition-colors mr-2 -ml-2">
                 <ChevronLeftIcon className="w-5 h-5" />
               </button>
             )}
            <h3 className="font-semibold text-lg flex-1 truncate">
               {view === 'menu' && 'Central de Ajuda'}
               {view === 'faq' && activeCategory?.title}
               {view === 'answer' && 'Resposta'}
               {view === 'chat' && 'Atendimento'}
            </h3>
            <button onClick={() => setIsOpen(false)} className="hover:bg-brand-700 p-1 rounded-full transition-colors">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-gray-50 dark:bg-zinc-800/50">
            {view === 'menu' && (
              <div className="flex flex-col gap-2 relative h-full">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Escoha uma categoria de dúvida:</p>
                {FAQ_DATA.map((cat) => (
                  <button
                    key={cat.id}
                    className="p-3 text-left w-full rounded-xl bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 hover:border-brand-300 transition-colors shadow-sm text-sm font-medium flex items-center justify-between"
                    onClick={() => {
                      setActiveCategory(cat);
                      setView('faq');
                    }}
                  >
                    <span>{cat.icon} {cat.title}</span>
                    <span className="text-gray-400 text-xs">&gt;</span>
                  </button>
                ))}
                
                <div className="mt-auto pt-4 border-t border-gray-200 dark:border-zinc-700">
                  <p className="text-xs text-center text-gray-500 mb-2">Ainda não resolveu?</p>
                  <button
                    className="p-3 text-center w-full rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-900/40 hover:bg-brand-100 transition-colors shadow-sm text-sm font-bold text-brand-600 dark:text-brand-400"
                    onClick={() => setView('chat')}
                  >
                    💬 Falar com Suporte Humano
                  </button>
                </div>
              </div>
            )}

            {view === 'faq' && activeCategory && (
              <div className="flex flex-col gap-2">
                {activeCategory.items.map((item, idx) => (
                  <button
                    key={idx}
                    className="p-3 text-left w-full rounded-xl bg-white dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 hover:border-brand-300 transition-colors shadow-sm text-sm font-medium leading-tight"
                    onClick={() => {
                      setActiveQuestion(item);
                      setView('answer');
                    }}
                  >
                    {item.q}
                  </button>
                ))}
              </div>
            )}

            {view === 'answer' && activeQuestion && (
              <div className="flex flex-col gap-4">
                 <h4 className="font-bold text-gray-900 dark:text-white leading-tight mt-2">{activeQuestion.q}</h4>
                 <div className="p-4 bg-white dark:bg-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-700 text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-line shadow-sm">
                   {activeQuestion.a}
                 </div>
                 
                 <div className="mt-4 flex flex-col gap-2 border-t border-gray-200 dark:border-zinc-700 pt-4">
                   <p className="text-xs text-center text-gray-500 mb-1">Ajudou a resolver?</p>
                   <button
                     className="p-2 w-full rounded-lg bg-gray-200 dark:bg-zinc-700 hover:bg-gray-300 transition-colors text-sm font-medium"
                     onClick={() => setView('menu')}
                   >
                     Sim, Obrigado!
                   </button>
                   <button
                     className="p-2 w-full rounded-lg bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors text-sm font-medium"
                     onClick={() => setView('chat')}
                   >
                     Não, Falar com Atendente
                   </button>
                 </div>
              </div>
            )}

            {view === 'chat' && (
              <div className="flex flex-col gap-4 h-full">
                {messages.length === 0 ? (
                  <div className="text-center my-auto px-4">
                    <ChatBubbleLeftRightIcon className="w-10 h-10 mx-auto text-brand-300 mb-3" />
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Inicie um ticket</p>
                    <p className="text-xs text-gray-500">Nossa equipe costuma responder o mais rápido possível nos horários comerciais.</p>
                  </div>
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
               className="text-xs text-center p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50 flex-shrink-0"
            >
              Voltar para Menu Principal
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default SupportHub;
