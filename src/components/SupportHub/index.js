import { useState, useEffect, useRef, Fragment } from 'react';
import { useSession } from 'next-auth/react';
import { useWorkspace } from '@/providers/workspace';
import { 
  XMarkIcon, 
  ChatBubbleLeftRightIcon, 
  PaperAirplaneIcon, 
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  QuestionMarkCircleIcon,
  LifebuoyIcon,
  BookOpenIcon,
  PhoneIcon
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
        a: 'Para alterar seu plano, clique no seu nome no canto superior direito e selecione "Configurações da Conta" > "Faturamento".\n\nLá você poderá visualizar seu plano atual e as opções de Upgrade ou Downgrade. Ao mudar de plano, o Stripe (nosso processador de pagamentos) calcula automaticamente o valor proporcional (prorata) para o restante do seu ciclo de faturamento atual, garantindo que você pague apenas a diferença.'
      },
      {
        q: 'Como atualizo meu cartão de crédito?',
        a: 'Acesse "Configurações da Conta" > "Faturamento" e clique em "Gerenciar Pagamentos". Isso abrirá o Portal de Cobrança seguro da Stripe.\n\nNo portal, você pode:\n1. Adicionar um novo método de pagamento.\n2. Definir um cartão como principal.\n3. Remover cartões antigos.\n4. Visualizar seu histórico completo de faturas e baixar recibos para contabilidade.'
      },
      {
        q: 'Por que fui cobrado a mais?',
        a: 'Existem três motivos principais para cobranças extras além da mensalidade fixa:\n\n1. Overage de IA: Se o seu plano possui um limite de tokens de Inteligência Artificial e você o ultrapassou, o sistema cobra pelo uso excedente por mil tokens.\n2. Marketplace Fees: Caso você use o checkout integrado do CRM para vender seus próprios produtos, uma pequena comissão pode ser retida.\n3. Provisão de Números: Adição de números de WhatsApp extras além do pacote base do seu plano.\n\nVocê pode auditar todos os custos detalhados na aba de Faturamento.'
      }
    ]
  },
  {
    id: 'whatsapp',
    icon: '📱',
    title: 'WhatsApp e Caixa de Entrada',
    description: 'Configuração de canais e comunicação direta.',
    items: [
      {
        q: 'Como conectar meu WhatsApp?',
        a: 'O Vysify utiliza a API oficial do WhatsApp Cloud (Meta). Para conectar:\n\n1. Vá em "Configurações do Workspace" > "WhatsApp".\n2. Clique em "Conectar Número".\n3. Você precisará do Phone Number ID e do Business Account ID do seu painel de desenvolvedor da Meta.\n4. Configure o Webhook fornecido na tela para começar a receber mensagens em tempo real.\n\nEste método oficial garante que sua conta não seja banida e permite múltiplos atendentes simultâneos.'
      },
      {
        q: 'Minha conexão caiu, o que fazer?',
        a: 'Como usamos a API oficial, a conexão raramente "cai" como no WhatsApp Web comum. Se as mensagens pararem de chegar:\n\n1. Verifique se o seu Token de Acesso da Meta ainda é válido (recomendamos usar tokens permanentes).\n2. Verifique se o seu Webhook no painel da Meta está com o status "Verificado".\n3. No Vysify, vá em "Configurações > WhatsApp" e use o botão "Testar Conexão" para diagnosticar erros de permissão.'
      },
      {
        q: 'Como a IA do Autopilot funciona?',
        a: 'O Autopilot é o cérebro da nossa plataforma. Ele funciona de duas formas:\n\n1. Sugestões de Resposta: No Inbox, ele sugere o que você deve responder economizando seu tempo.\n2. Resposta Automática: Ele pode responder diretamente ao cliente 24/7.\n\nPara que ele seja eficiente, você DEVE preencher o "Contexto de Negócio" em "Configurações > IA". Quanto mais detalhes sobre sua empresa, preços e serviços você fornecer, mais precisa será a Inteligência Artificial.'
      }
    ]
  },
  {
    id: 'crm',
    icon: '🤝',
    title: 'CRM e Automações',
    description: 'Gestão de funis, leads e automação no-code.',
    items: [
      {
        q: 'Como criar múltiplos funis (Pipelines)?',
        a: 'Você pode gerenciar diferentes processos de negócio (ex: Vendas, Pós-Venda, Parcerias) criando múltiplos funis.\n\n1. No menu "Funil de Vendas", localize o seletor de funis no topo da tela.\n2. Clique em "Criar Novo Funil".\n3. Dê um nome e defina as colunas (Estágios) do seu processo.\n4. Você pode arrastar e soltar negócios entre funis diferentes conforme o lead evolui na jornada.'
      },
      {
        q: 'Como as automações visuais funcionam?',
        a: 'Nossa engine No-Code permite automatizar tarefas repetitivas sem programar. Uma automação sempre segue a lógica: QUANDO [Gatilho] acontece, FAÇA [Ação].\n\nExemplos poderosos:\n- Gatilho: Negócio movido para "Proposta Enviada" -> Ação: Enviar mensagem de WhatsApp em 48h.\n- Gatilho: Pagamento Confirmado -> Ação: Mover para Funil de "Entrega/Onboarding".\n- Gatilho: Novo Lead Captado -> Ação: Aplicar Tag "Lead Frio".\n\nConfigure em "Automações" no menu lateral.'
      },
      {
        q: 'Posso convidar mais pessoas da minha equipe?',
        a: 'Sim! A colaboração é ilimitada no Vysify (respeitando os limites de assentos do seu plano).\n\n1. Vá em "Configurações do Workspace" > "Equipe".\n2. Clique em "Convidar Membro".\n3. Insira o e-mail e defina a Role: "Admin" (acesso total) ou "Membro" (apenas operação).\n4. O convidado receberá um link de acesso instantâneo por e-mail.'
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
    <div className="fixed bottom-8 right-8 z-50">
      <AnimatePresence>
        {!isOpen ? (
          <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className="flex items-center justify-center w-16 h-16 bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 rounded-[1.75rem] shadow-3xl shadow-indigo-600/20 border border-white/10 dark:border-zinc-200/20"
          >
            <QuestionMarkCircleIcon className="w-8 h-8 stroke-[1.5]" />
          </motion.button>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-96 h-[600px] max-h-[85vh] vysify-glass rounded-[3rem] shadow-[0_32px_80px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden border border-white/40 dark:border-zinc-800/40"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-zinc-100 dark:border-zinc-800/50 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-3xl shrink-0">
               <div className="flex items-center gap-4">
                  <AnimatePresence mode="wait">
                    {view !== 'menu' && (
                      <motion.button 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        onClick={() => {
                          if (view === 'answer') setView('faq');
                          else setView('menu');
                        }}
                        className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                      >
                        <ChevronLeftIcon className="w-5 h-5 text-zinc-500" />
                      </motion.button>
                    )}
                  </AnimatePresence>
                  <div>
                    <h3 className="text-[15px] font-executive font-black text-zinc-950 dark:text-white uppercase tracking-tighter italic leading-none">
                      {view === 'menu' && 'Vysify Protocol Agent'}
                      {view === 'faq' && 'Category Directory'}
                      {view === 'answer' && 'Information Retrieval'}
                      {view === 'chat' && 'Secure Communication'}
                    </h3>
                    <div className="flex items-center gap-1.5 opacity-50">
                       <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                       <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">System Ready</span>
                    </div>
                  </div>
               </div>
               <button 
                 onClick={() => setIsOpen(false)} 
                 className="p-2 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl transition-all group"
               >
                 <XMarkIcon className="w-5 h-5 text-zinc-400 group-hover:rotate-90 transition-transform" />
               </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <AnimatePresence mode="wait">
                {view === 'menu' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-8"
                  >
                    <div className="space-y-2">
                       <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] italic">Knowledge Core</p>
                       <div className="grid grid-cols-1 gap-3">
                        {FAQ_DATA.map((cat, idx) => (
                          <motion.button
                            key={cat.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="p-5 text-left w-full rounded-2xl bg-white/50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800/50 hover:border-indigo-500/30 hover:bg-white dark:hover:bg-zinc-900 transition-all shadow-sm group flex items-start gap-4"
                            onClick={() => {
                              setActiveCategory(cat);
                              setView('faq');
                            }}
                          >
                            <span className="text-2xl mt-1 grayscale group-hover:grayscale-0 transition-all transform group-hover:scale-110 duration-500">{cat.icon}</span>
                            <div className="flex-1 min-w-0">
                               <div className="flex items-center justify-between mb-0.5">
                                 <span className="text-[14px] font-black text-zinc-900 dark:text-white uppercase tracking-tight italic">{cat.title}</span>
                                 <ChevronRightIcon className="w-4 h-4 text-zinc-300 group-hover:translate-x-1 transition-transform" />
                               </div>
                               <p className="text-[11px] text-zinc-400 font-medium italic leading-none">{cat.description}</p>
                            </div>
                          </motion.button>
                        ))}
                       </div>
                    </div>
                    
                    <div className="pt-8 border-t border-zinc-100 dark:border-zinc-800/50">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] italic mb-4 text-center">Protocol Escalation</p>
                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className="p-6 text-center w-full rounded-[2rem] bg-zinc-950 dark:bg-white border border-transparent shadow-2xl shadow-indigo-600/20 transition-all flex flex-col items-center gap-2 group"
                        onClick={() => setView('chat')}
                      >
                        <ChatBubbleLeftRightIcon className="w-6 h-6 text-indigo-400 group-hover:scale-110 transition-transform" />
                        <span className="text-[12px] font-black uppercase tracking-[0.15em] text-white dark:text-zinc-950 italic">Establish Human Link</span>
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {view === 'faq' && activeCategory && (
                  <motion.div 
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-3"
                  >
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] italic mb-6">Directory Information Nodes</p>
                    {activeCategory.items.map((item, idx) => (
                      <motion.button
                        key={idx}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="p-5 text-left w-full rounded-2xl bg-white/50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800/50 hover:bg-white dark:hover:bg-zinc-900 hover:border-indigo-500/30 transition-all shadow-sm group"
                        onClick={() => {
                          setActiveQuestion(item);
                          setView('answer');
                        }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700 group-hover:bg-indigo-500 transition-colors" />
                          <span className="text-[13px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-tight italic leading-tight group-hover:text-zinc-950 dark:group-hover:text-white">{item.q}</span>
                        </div>
                      </motion.button>
                    ))}
                  </motion.div>
                )}

                {view === 'answer' && activeQuestion && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="space-y-6"
                  >
                     <div className="p-1 px-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg inline-block">
                        <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest italic leading-none">RETRIEVED INTEL</span>
                     </div>
                     <h4 className="text-[19px] font-executive font-extrabold text-zinc-950 dark:text-white uppercase tracking-tighter italic leading-tight">{activeQuestion.q}</h4>
                     <div className="p-8 bg-white/80 dark:bg-zinc-900/80 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800 shadow-premium-dark text-zinc-700 dark:text-zinc-300 text-sm leading-relaxed whitespace-pre-line italic">
                       {activeQuestion.a}
                     </div>
                     
                     <div className="pt-8 flex flex-col gap-3 border-t border-zinc-100 dark:border-zinc-800/50">
                       <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] italic text-center">Protocol Satisfaction Audit</p>
                       <div className="flex gap-3">
                         <button
                           className="flex-1 p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 hover:bg-emerald-500 dark:hover:bg-emerald-500 hover:text-white transition-all text-[11px] font-black uppercase italic tracking-widest"
                           onClick={() => setView('menu')}
                         >
                           Satisfied
                         </button>
                         <button
                           className="flex-1 p-4 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all text-[11px] font-black uppercase italic tracking-widest border border-indigo-500/20"
                           onClick={() => setView('chat')}
                         >
                           Escalate
                         </button>
                       </div>
                     </div>
                  </motion.div>
                )}

                {view === 'chat' && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col h-[400px]"
                  >
                    <div className="flex-1 overflow-y-auto space-y-4 px-1 py-4 custom-scrollbar">
                      {messages.length === 0 ? (
                        <div className="text-center my-auto px-10 py-12 flex flex-col items-center justify-center h-full">
                          <motion.div 
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-20 h-20 bg-indigo-500/10 rounded-[1.5rem] flex items-center justify-center mb-6"
                          >
                            <ChatBubbleLeftRightIcon className="w-10 h-10 text-indigo-600" />
                          </motion.div>
                          <p className="text-[14px] font-black text-zinc-900 dark:text-white uppercase tracking-tighter italic mb-2">Initiate Transmission</p>
                          <p className="text-[11px] text-zinc-400 font-medium italic max-w-[200px]">Strategic operations agents are ready to receive your encrypted communication protocol.</p>
                        </div>
                      ) : (
                        messages.map((m, idx) => {
                          const isMe = m.authorId === session.user.userId || m.author.role === 'USER';
                          return (
                            <motion.div 
                              key={m.id} 
                              initial={{ opacity: 0, x: isMe ? 20 : -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className={`max-w-[85%] rounded-[1.5rem] px-5 py-3 text-[13px] font-medium leading-relaxed italic shadow-sm border ${
                                isMe 
                                  ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-transparent rounded-tr-none' 
                                  : 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white border-zinc-100 dark:border-zinc-800 rounded-tl-none'
                              }`}>
                                {m.content}
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    <div className="pt-6 mt-4 border-t border-zinc-100 dark:border-zinc-800/50">
                       <form onSubmit={handleSendMessage} className="relative group">
                         <input
                           type="text"
                           value={newMessage}
                           onChange={(e) => setNewMessage(e.target.value)}
                           disabled={loading}
                           placeholder="Transmit message..."
                           className="w-full bg-zinc-50 dark:bg-zinc-950 border-zinc-100 dark:border-zinc-800 focus:border-indigo-500/50 focus:ring-0 rounded-2xl pl-6 pr-14 py-4 text-[13px] italic font-medium placeholder:text-zinc-400 transition-all"
                         />
                         <button
                           type="submit"
                           disabled={loading || !newMessage.trim()}
                           className="absolute right-2 top-2 p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-30 transition-all shadow-glow-indigo group-hover:scale-105 active:scale-95"
                         >
                           <PaperAirplaneIcon className="w-5 h-5 stroke-[2]" />
                         </button>
                       </form>
                       <button
                         onClick={() => setView('menu')}
                         className="w-full text-center mt-4 text-[9px] font-black text-zinc-400 hover:text-indigo-600 transition-colors uppercase tracking-[0.3em] italic"
                       >
                         Return to Knowledge Core
                       </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Footer / Brand */}
            <div className="px-8 py-4 bg-zinc-50/50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800/50 flex items-center justify-between shrink-0">
               <div className="flex items-center gap-2">
                  <BookOpenIcon className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest italic">Vysify v2.4.0 • Enterprise Core</span>
               </div>
               <div className="flex gap-4">
                  <PhoneIcon className="w-3.5 h-3.5 text-zinc-300 hover:text-indigo-500 transition-colors cursor-pointer" />
                  <SparklesIcon className="w-3.5 h-3.5 text-zinc-300 hover:text-amber-500 transition-colors cursor-pointer" />
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SupportHub;
