import { useState, useEffect, useRef, Fragment } from 'react';
import { useSession } from 'next-auth/react';
import { useWorkspace } from '@/providers/workspace';
import { 
  XMarkIcon, 
  ChatBubbleLeftRightIcon, 
  PaperAirplaneIcon, 
  ChevronLeftIcon,
  ChevronRightIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

const FAQ_DATA = [
  {
    id: 'payment',
    icon: '💳',
    title: 'Planos e Faturamento',
    description: 'Gestão de assinaturas e métodos de pagamento.',
    items: [
      {
        q: 'Como altero meu plano?',
        a: 'Para alterar seu plano, clique no seu nome no canto superior direito e selecione "Configurações da Conta" > "Faturamento".\n\nLá você poderá visualizar seu plano atual e as opções de Upgrade ou Downgrade. Ao mudar de plano, o Stripe calcula automaticamente o valor proporcional (prorata) para o restante do seu ciclo de faturamento atual.'
      },
      {
        q: 'Como atualizo meu cartão de crédito?',
        a: 'Acesse "Configurações da Conta" > "Faturamento" e clique em "Gerenciar Pagamentos". Isso abrirá o Portal de Cobrança seguro da Stripe.\n\nNo portal, você pode adicionar um novo método de pagamento, definir um cartão como principal ou visualizar faturas passadas.'
      },
      {
        q: 'Por que fui cobrado a mais?',
        a: 'Existem três motivos principais: \n1. Overage de IA (uso excedente após o limite do plano).\n2. Marketplace Fees (comissões de vendas integradas).\n3. Provisão de Números extras (WhatsApp).\n\nVocê pode auditar todos os custos detalhados na aba de Faturamento.'
      }
    ]
  },
  {
    id: 'whatsapp',
    icon: '📱',
    title: 'WhatsApp e Inbox',
    description: 'Canais e comunicação direta.',
    items: [
      {
        q: 'Como conectar meu WhatsApp?',
        a: 'Vá em "Configurações do Workspace" > "WhatsApp" e clique em "Conectar Número". Você precisará do Phone Number ID e Business Account ID do painel Meta Cloud API.'
      },
      {
        q: 'Minha conexão caiu, o que fazer?',
        a: 'Verifique se seu Token da Meta expirou ou se o Webhook está apontando para o endereço correto no painel de desenvolvedor da Meta.'
      },
      {
        q: 'Como a IA do Autopilot funciona?',
        a: 'O Autopilot sugere respostas no Inbox ou responde automaticamente 24/7. Configure o "Contexto de Negócio" em "Configurações > IA" para melhores resultados.'
      }
    ]
  },
  {
    id: 'crm',
    icon: '🤝',
    title: 'CRM e Automações',
    description: 'Funis, leads e automação no-code.',
    items: [
      {
        q: 'Como criar múltiplos funis?',
        a: 'No menu "Funil de Vendas", use o seletor de funis no topo e clique em "Criar Novo Funil". Defina as etapas do seu processo customizado.'
      },
      {
        q: 'Como as automações funcionam?',
        a: 'Nossas automações seguem a lógica: QUANDO [Gatilho] -> FAÇA [Ação]. Configure em "Automações" para automatizar respostas e movimentação de Leads.'
      },
      {
        q: 'Posso convidar minha equipe?',
        a: 'Sim! Vá em "Configurações do Workspace" > "Equipe" e clique em "Convidar Membro" via e-mail.'
      }
    ]
  }
];

const SupportHub = () => {
  const { data: session } = useSession();
  const { workspace } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState('chat'); // 'chat', 'human'
  const [history, setHistory] = useState([
    {
      id: 'welcome',
      side: 'bot',
      content: 'Olá! Sou o Assistente Virtual da Vysify. 👋\n\nComo posso ajudar você hoje? Selecione um tópico abaixo ou escreva sua dúvida.',
      showActions: true,
      timestamp: new Date()
    }
  ]);
  const [tickets, setTickets] = useState([]);
  const [currentTicketId, setCurrentTicketId] = useState(null);
  const [humanMessages, setHumanMessages] = useState([]);
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

  const fetchHumanMessages = async (ticketId) => {
    try {
      const res = await fetch(`/api/user/support/tickets/${ticketId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setHumanMessages(data.messages);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history, humanMessages, loading]);

  useEffect(() => {
    if (isOpen) {
      fetchTickets();
    }
  }, [isOpen]);

  useEffect(() => {
    if (view === 'human' && currentTicketId) {
      fetchHumanMessages(currentTicketId);
      const interval = setInterval(() => {
        fetchHumanMessages(currentTicketId);
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [view, currentTicketId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, humanMessages, view]);

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    const text = newMessage.trim();
    if (!text) return;

    if (view === 'chat') {
      // Add user message to history
      const userMsg = { id: Date.now(), side: 'user', content: text, timestamp: new Date() };
      setHistory(prev => [...prev, userMsg]);
      setNewMessage('');
      
      // Simulate bot thinking/search
      setLoading(true);
      setTimeout(() => {
        const botMsg = { 
          id: Date.now() + 1, 
          side: 'bot', 
          content: 'Entendi. Estou procurando nos meus documentos... No momento, recomendo conferir as categorias principais ou detalhar mais sua dúvida para eu te ajudar melhor.',
          showActions: true,
          timestamp: new Date() 
        };
        setHistory(prev => [...prev, botMsg]);
        setLoading(false);
      }, 800);
    } else {
      // Human escalation messages
      setLoading(true);
      try {
        if (!currentTicketId) {
          const res = await fetch('/api/user/support/tickets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subject: 'Dúvida via Chat',
              initialMessage: text,
              workspaceId: workspace?.id
            })
          });
          if (res.ok) {
            const data = await res.json();
            setCurrentTicketId(data.ticket.id);
          }
        } else {
          await fetch(`/api/user/support/tickets/${currentTicketId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: text })
          });
          await fetchHumanMessages(currentTicketId);
        }
        setNewMessage('');
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAnotherQuestion = () => {
    setHistory(prev => [
      ...prev,
      {
        id: Date.now(),
        side: 'bot',
        content: 'Sem problemas! O que mais você gostaria de saber? 😊',
        showActions: true,
        timestamp: new Date()
      }
    ]);
  };

  const handleEscalate = () => {
    setView('human');
    // If no human messages yet, add a bot greeting in the human view
    if (humanMessages.length === 0) {
      setHumanMessages([{
        id: 'escalate-greeting',
        author: { role: 'SUPERADMIN' },
        content: 'Conectando você a um de nossos especialistas... Por favor, descreva seu problema com detalhes.',
        createdAt: new Date()
      }]);
    }
  };

  if (!session) return null;

  const pickCategory = (cat) => {
    // Add user choice
    const userMsg = { id: Date.now(), side: 'user', content: cat.title, timestamp: new Date() };
    setHistory(prev => [...prev, userMsg]);

    // Bot responds with items
    setTimeout(() => {
      const botMsg = {
        id: Date.now() + 1,
        side: 'bot',
        content: `Ótima escolha! Aqui estão os tópicos sobre **${cat.title}**:`,
        items: cat.items,
        timestamp: new Date()
      };
      setHistory(prev => [...prev, botMsg]);
    }, 400);
  };

  const pickQuestion = (q, a) => {
    const userMsg = { id: Date.now(), side: 'user', content: q, timestamp: new Date() };
    setHistory(prev => [...prev, userMsg]);

    setTimeout(() => {
      const botMsg = {
        id: Date.now() + 1,
        side: 'bot',
        content: a,
        isAnswer: true,
        timestamp: new Date()
      };
      setHistory(prev => [...prev, botMsg]);
    }, 500);
  };

  if (!session) return null;

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-50">
      <AnimatePresence>
        {!isOpen ? (
          <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 rounded-[1.5rem] sm:rounded-[1.75rem] shadow-3xl shadow-indigo-600/20 border border-white/10 dark:border-zinc-200/20"
          >
            <ChatBubbleLeftRightIcon className="w-7 h-7 sm:w-8 sm:h-8 stroke-[1.5]" />
          </motion.button>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed left-4 right-4 bottom-4 sm:left-auto sm:right-8 sm:bottom-8 sm:w-96 h-[600px] max-h-[calc(100vh-6rem)] sm:max-h-[85vh] vysify-glass rounded-[2rem] sm:rounded-[3rem] shadow-[0_32px_80px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden border border-white/40 dark:border-zinc-800/40"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-zinc-100 dark:border-zinc-800/50 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-3xl shrink-0">
               <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-2xl bg-zinc-950 dark:bg-white flex items-center justify-center shadow-lg shadow-black/10">
                      <div className="w-5 h-5 rounded-full border-2 border-white dark:border-zinc-900 bg-indigo-500" />
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-zinc-900 rounded-full" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-executive font-black text-zinc-950 dark:text-white uppercase tracking-tight italic leading-none">
                      Suporte Vysify
                    </h3>
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Sempre Disponível</p>
                  </div>
               </div>
               <div className="flex items-center gap-2">
                 {view === 'human' && (
                   <button 
                    onClick={() => setView('chat')}
                    className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all"
                   >
                     <ChevronLeftIcon className="w-5 h-5 text-zinc-400" />
                   </button>
                 )}
                 <button 
                  onClick={() => setIsOpen(false)} 
                  className="p-2 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl transition-all group"
                 >
                   <XMarkIcon className="w-5 h-5 text-zinc-400 group-hover:rotate-90 transition-transform" />
                 </button>
               </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 scroll-smooth custom-scrollbar flex flex-col">
               <div className="flex-1 space-y-4">
                  {(view === 'chat' ? history : humanMessages).map((m, idx) => {
                    const isBot = m.side === 'bot' || m.author?.role === 'ADMIN' || m.author?.role === 'SUPERADMIN';
                    const isSystem = m.isAnswer || m.items;
                    
                    return (
                      <motion.div 
                        key={m.id || idx}
                        initial={{ opacity: 0, scale: 0.9, x: isBot ? -10 : 10 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        className={`flex ${isBot ? 'justify-start' : 'justify-end'} group`}
                      >
                        <div className={`flex flex-col gap-1.5 max-w-[85%]`}>
                          <div className={`px-4 py-2.5 rounded-2xl text-[13px] font-medium leading-relaxed shadow-sm border transition-all duration-300 ${
                            isBot 
                              ? 'bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 border-zinc-100 dark:border-zinc-800 rounded-tl-sm'
                              : 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-transparent rounded-tr-sm'
                          } ${isSystem ? 'bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100/50 dark:border-indigo-900/30' : ''}`}>
                             <div className="whitespace-pre-wrap">{m.content}</div>
                             
                             {/* Category Actions */}
                             {m.showActions && (
                               <div className="grid grid-cols-1 gap-2 mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800/50">
                                 {FAQ_DATA.map((cat) => (
                                   <button 
                                     key={cat.id}
                                     onClick={() => pickCategory(cat)}
                                     className="flex items-center gap-3 px-4 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-white dark:hover:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 text-left text-xs font-bold text-zinc-600 dark:text-zinc-300 transition-all active:scale-[0.98]"
                                   >
                                     <span className="text-sm">{cat.icon}</span>
                                     <span className="flex-1">{cat.title}</span>
                                     <ChevronRightIcon className="w-3 h-3 opacity-30" />
                                   </button>
                                 ))}
                                 <button 
                                   onClick={handleEscalate}
                                   className="flex items-center gap-3 px-4 py-2 rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 text-xs font-bold transition-all mt-1"
                                 >
                                   <ChatBubbleLeftRightIcon className="w-4 h-4" />
                                   Falar com Especialista
                                 </button>
                               </div>
                             )}

                             {/* Sub-Question Actions */}
                             {m.items && (
                               <div className="flex flex-col gap-2 mt-4">
                                 {m.items.map((item, i) => (
                                   <button
                                     key={i}
                                     onClick={() => pickQuestion(item.q, item.a)}
                                     className="p-3 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 text-left text-xs font-bold text-zinc-500 hover:text-indigo-600 transition-colors flex items-center gap-3"
                                   >
                                     <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                                     {item.q}
                                   </button>
                                 ))}
                               </div>
                             )}
                          </div>
                          
                          {/* Answer satisfaction or more help? */}
                          {m.isAnswer && (
                            <div className="flex gap-2 mt-1">
                               <button onClick={handleAnotherQuestion} className="px-3 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold text-zinc-500 hover:text-indigo-600 transition-all uppercase italic">Outra Pergunta</button>
                               <button onClick={handleEscalate} className="px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-all uppercase italic">Não resolveu</button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                  {loading && (
                    <div className="flex justify-start">
                       <div className="bg-zinc-100 dark:bg-zinc-800 p-3 rounded-2xl flex gap-1 items-center">
                          <span className="w-1 h-1 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                          <span className="w-1 h-1 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                          <span className="w-1 h-1 bg-zinc-400 rounded-full animate-bounce" />
                       </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} className="h-4" />
               </div>
            </div>
            
            {/* Input Area */}
            <div className="px-6 py-5 bg-zinc-50/50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800/50 shrink-0">
               <form onSubmit={handleSendMessage} className="relative">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={loading}
                    placeholder={view === 'chat' ? "O que você deseja saber?" : "Escreva sua mensagem..."}
                    className="w-full bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 focus:border-indigo-500/50 focus:ring-0 rounded-2xl pl-5 pr-14 py-3.5 text-xs font-semibold placeholder:text-zinc-400 transition-all shadow-sm"
                  />
                  <button
                    type="submit"
                    disabled={loading || !newMessage.trim()}
                    className="absolute right-1.5 top-1.5 p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-30 transition-all shadow-glow-indigo active:scale-95"
                  >
                    <PaperAirplaneIcon className="w-4 h-4" />
                  </button>
               </form>
               <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2 opacity-30">
                    <BookOpenIcon className="w-3 h-3 text-zinc-500" />
                    <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest italic">Vysify v2.4.0 • Core</span>
                  </div>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SupportHub;
