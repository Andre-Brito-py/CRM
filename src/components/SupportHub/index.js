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
    title: 'CRM e Automações (No-Code)',
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
  },
  {
    id: 'forms',
    icon: '📝',
    title: 'Construtor Visual (WebForms)',
    items: [
      {
        q: 'Preciso saber programar para captar leads?',
        a: 'Absolutamente não. Em "Formulários", você encontrará nosso editor visual "Drag-and-Drop".\n\nVocê pode adicionar campos de Texto, Telefone, Seleção e mais. Após salvar, o sistema gera uma URL única (link) que você pode colocar na bio do seu Instagram, no seu site ou enviar por mensagem. Cada resposta gera um novo Lead automaticamente no seu CRM.'
      },
      {
        q: 'Como integrar os formulários ao meu funil?',
        a: 'Esta é a grande vantagem do WebForm integrado:\n\nDentro do editor do formulário, na aba "Configurações", você pode definir o "Mapeamento do Funil". Escolha exatamente em qual Funil e em qual Estágio o Lead deve ser criado após apertar o botão de enviar. Você também pode configurar para que uma Tag automática (ex: "Vindo do Instagram") seja aplicada ao novo contato.'
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
