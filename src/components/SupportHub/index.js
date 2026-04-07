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
        a: 'Vá em "Configurações da Conta" → "Faturamento" e clique em "Alterar Plano". A mudança é instantânea via Stripe — o valor proporcional (prorata) do ciclo atual é calculado automaticamente.'
      },
      {
        q: 'Como atualizo meu cartão de crédito?',
        a: 'Acesse "Configurações da Conta" → "Faturamento" e clique em "Gerenciar Pagamentos". Isso abre o Portal seguro da Stripe onde você adiciona ou troca o método de pagamento.'
      },
      {
        q: 'Por que fui cobrado a mais?',
        a: 'Os motivos mais comuns são:\n1. Overage de IA (uso excedente acima do limite do plano).\n2. Créditos de WhatsApp extras adquiridos.\n3. Prorata de upgrade de plano no meio do ciclo.\n\nAudit todos os custos em "Faturamento → Histórico de Invoices".'
      },
      {
        q: 'Como baixo um recibo ou nota fiscal?',
        a: 'Em "Configurações" → "Faturamento" → "Histórico de Invoices", cada cobrança tem um botão para baixar o recibo em PDF diretamente do Stripe.'
      },
      {
        q: 'Posso comprar créditos extras sem mudar de plano?',
        a: 'Sim! Em "Faturamento" você encontra pacotes de créditos avulsos para IA e WhatsApp. Útil quando a cota mensal acaba antes do fim do ciclo sem precisar fazer upgrade de plano.'
      },
      {
        q: 'O que acontece quando o trial termina?',
        a: 'Ao fim do trial, o sistema pede um cartão de crédito para continuar. Se não for adicionado, o workspace fica somente-leitura. Os dados não são apagados imediatamente — você tem 7 dias para regularizar.'
      }
    ]
  },
  {
    id: 'whatsapp',
    icon: '📱',
    title: 'WhatsApp e Canais',
    description: 'Vincule sua conta oficial e atenda seus clientes.',
    items: [
      {
        q: 'Como vincular meu WhatsApp Business?',
        a: 'O processo é feito em 2 partes:\n\n🔵 NA META (developers.facebook.com):\n1. Crie ou acesse um App do tipo Business.\n2. Clique em "Casos de uso" → "Conectar no WhatsApp" → "Configuração da API".\n3. Copie o **Phone Number ID** e o **Business Account ID** exibidos na página.\n4. Copie o **Token de Acesso** (clique em "Copiar" ao lado do campo).\n\n🟢 NO VYSIFY:\n1. No menu superior, clique em **Área de Trabalho**.\n2. Na barra lateral esquerda, clique em **INTEGRAÇÕES**.\n3. Selecione **WhatsApp**.\n4. Clique em **Adicionar Número** e preencha os campos com as credenciais copiadas da Meta.'
      },
      {
        q: 'Como configurar o Webhook na Meta?',
        a: 'Após adicionar o número no Vysify, copie a **URL de Webhook** gerada.\n\nNa Meta, vá em: Seu App → "WhatsApp" → "Configuração":\n1. Cole a URL de Webhook do Vysify no campo **URL de Callback**.\n2. Preencha o **Verify Token** com o mesmo valor que você usou no Vysify.\n3. Clique em **Verificar e Salvar**.\n4. Em "Webhook Fields", inscreva-se no campo **messages**.\n\nSem isso, as mensagens recebidas não aparecerão no seu Inbox.'
      },
      {
        q: 'Posso usar meu número pessoal?',
        a: 'Sim, mas ele será convertido em uma conta de API do WhatsApp (WABA). Você não poderá mais usar o app oficial do WhatsApp no seu celular para este número. Recomendamos usar um número exclusivo para atendimento.'
      },
      {
        q: 'Minha conexão WhatsApp caiu, o que fazer?',
        a: 'Verifique:\n1. Se o seu Token de Acesso ainda é válido (tokens temporários expiram em 24h).\n2. Se o Webhook URL está com status "Válido" na Meta.\n3. Reconecte em: **Área de Trabalho → INTEGRAÇÕES → WhatsApp** e atualize o token.'
      }
    ]
  },
  {
    id: 'email_integration',
    icon: '✉️',
    title: 'Integração de E-mail',
    description: 'Vincule seu e-mail corporativo ao Inbox.',
    items: [
      {
        q: 'Como configurar o Email Inbound (Omnichannel)?',
        a: 'No Vysify:\n1. No menu superior, clique em **Área de Trabalho**.\n2. Na barra lateral, clique em **INTEGRAÇÕES**.\n3. Selecione **Email** e ative o serviço.\n4. Copie a **URL de Inbound** gerada.\n5. No seu provedor de e-mail (ex: **Postmark**, **SendGrid**), crie um webhook de inbound e cole a URL do Vysify.'
      },
      {
        q: 'Como vincular minha conta Gmail?',
        a: 'No Vysify:\n1. Clique em **Área de Trabalho** no menu superior.\n2. Na barra lateral, clique em **INTEGRAÇÕES**.\n3. Selecione **Gmail** e clique em **Connect Gmail**.\n4. Siga o fluxo de autorização do Google (OAuth 2.0).\n\nAprovado o acesso, seus e-mails e contatos serão sincronizados automaticamente.'
      },
      {
        q: 'O e-mail fica salvo no registro do contato?',
        a: 'Sim! Uma vez integrado, todo e-mail enviado ou recebido é registrado cronologicamente na timeline do contato no CRM, permitindo que toda a equipe tenha o contexto da conversa.'
      }
    ]
  },
  {
    id: 'crm',
    icon: '🤝',
    title: 'CRM e Contatos',
    description: 'Gestão de leads, empresas e negócios.',
    items: [
      {
        q: 'Como importar contatos em massa?',
        a: 'Em "Contatos", clique em "Importar CSV". Arraste o arquivo e mapeie cada coluna para o campo correspondente no CRM (Nome, E-mail, Telefone, etc.). O sistema detecta e mescla duplicatas automaticamente pelo e-mail ou telefone.'
      },
      {
        q: 'Como criar e usar Funis de Vendas?',
        a: 'Acesse "Funil de Vendas" no menu lateral. No seletor de funis no topo, clique em "Criar Novo Funil". Defina as etapas (colunas) do seu processo e arraste os cards de negócios entre elas.\n\nPara múltiplos funis, crie um por tipo de venda (ex: B2B e Varejo).'
      },
      {
        q: 'Como funcionam as Automações?',
        a: 'As automações seguem a lógica: SE [Gatilho acontecer] + QUANDO [Condições forem verdadeiras] → FAÇA [Ação].\n\nGatilhos: nova mensagem, mudança de estágio, NPS respondido, cobrança paga/falhou, tag adicionada.\nAções: enviar WhatsApp, e-mail, atribuir, criar tarefa, mover deal, chamar webhook e mais.'
      },
      {
        q: 'Como adicionar Campos Personalizados?',
        a: 'Vá em "Configurações" → "Campos Personalizados". Crie campos de qualquer tipo: texto, número, seleção, checkbox, moeda, URL, telefone ou data.\n\nEles aparecerão automaticamente no perfil dos contatos e nos filtros de listagem.'
      },
      {
        q: 'Como criar e vincular Empresas (B2B)?',
        a: 'No menu "Empresas", clique em "+ Nova Empresa". Após criar, acesse um Contato e no campo "Empresa" vincule-o. Todos os deals e histórico dos contatos vinculados aparecem consolidados na página da empresa.'
      },
      {
        q: 'Como usar as Tags?',
        a: 'No perfil de um contato, acesse a aba "Tags" e adicione ou crie tags (ex: VIP, Lead Frio, Urgente). Tags são usadas como filtros na listagem e como condições em Automações para segmentar ações.'
      },
      {
        q: 'Como registrar atividades (ligações, reuniões, notas)?',
        a: 'No perfil do contato, acesse a aba "Atividades" e clique em "Registrar Atividade". Escolha o tipo (Nota, Ligação ou Reunião), preencha o título, data e detalhes. O registro fica na linha do tempo cronológica do contato.'
      }
    ]
  },
  {
    id: 'automations',
    icon: '⚡',
    title: 'Automações e Workflows',
    description: 'Regras automáticas e fluxos de trabalho.',
    items: [
      {
        q: 'Como criar uma automação de boas-vindas?',
        a: 'Em "Automações", clique em "Criar Regra".\n• Gatilho: Nova mensagem recebida\n• Ação: Enviar mensagem WhatsApp com template de boas-vindas\n\nUse variáveis como {{contact.firstName}} para personalizar. Ative e teste com o Simulador antes de ligar.'
      },
      {
        q: 'Como testar uma automação antes de ativar?',
        a: 'Em qualquer regra criada (mesmo sem ativar), clique em "Simulador". Insira um Contact ID ou Deal ID opcionais e clique em "Simular". O sistema mostra se a regra dispararia e o preview da ação gerada.'
      },
      {
        q: 'Como criar alertas de SLA (tempo de resposta)?',
        a: 'Crie uma automação com:\n• Gatilho: Mensagem recebida\n• Condição: Horário entre 09h e 18h\n• Ação: Aguardar 15 min → Criar tarefa "Cliente sem resposta há 15 min" para o responsável\n\nIsso garante que nenhum cliente fique sem atendimento por muito tempo.'
      },
      {
        q: 'Como ver os logs de execução das automações?',
        a: 'Clique na automação desejada e acesse a aba "Logs". As últimas 20 execuções são listadas com: data/hora, evento disparador, se executou ou não e o motivo. Essencial para depurar problemas.'
      },
      {
        q: 'Como criar uma sequência de múltiplas ações?',
        a: 'Na hora de escolher a Ação, selecione "Múltiplas Ações". Você pode adicionar quantas ações quiser em sequência, com atrasos (Delay) entre elas.\n\nExemplo: (1) Responder automaticamente → (2) Aguardar 2h → (3) Criar tarefa de follow-up.'
      }
    ]
  },
  {
    id: 'nps',
    icon: '⭐',
    title: 'NPS e Satisfação',
    description: 'Pesquisas de satisfação e feedback.',
    items: [
      {
        q: 'Como criar e enviar uma pesquisa NPS?',
        a: 'Acesse "NPS → Pesquisas" → "Nova Pesquisa". Defina o nome, mensagem de abertura e agradecimento.\n\nPara enviar:\n• Manual: copie o link direto e compartilhe.\n• Automático: crie uma Automação com gatilho "Deal ganho" e ação "Enviar Pesquisa NPS via WhatsApp/E-mail".'
      },
      {
        q: 'Como interpretar o score NPS?',
        a: 'O NPS vai de -100 a +100, calculado como % Promotores (9-10) menos % Detratores (0-6):\n\n• Abaixo de 0: Zona Crítica\n• 0 a 30: Zona de Aperfeiçoamento\n• 30 a 70: Zona de Qualidade\n• Acima de 70: Zona de Excelência\n\nBenchmark médio B2B no Brasil é ~40.'
      },
      {
        q: 'Como criar alertas para notas baixas?',
        a: 'Crie uma Automação com gatilho "NPS Detrator recebido". Como ação, crie uma tarefa urgente para o gerente ligar para o cliente em até 24h.\n\nIsso permite salvar clientes insatisfeitos antes que churn aconteça.'
      },
      {
        q: 'Como ver as respostas individuais?',
        a: 'Na seção "NPS → Respostas", você vê cada avaliação com: nota (0-10), comentário do cliente, nome e data. Use os filtros de pontuação e período para encontrar padrões.'
      }
    ]
  },
  {
    id: 'meta_ads',
    icon: '📊',
    title: 'Meta Ads Analytics',
    description: 'Análise de campanhas do Facebook e Instagram.',
    items: [
      {
        q: 'Como conectar minha conta de anúncios?',
        a: 'No menu "Meta Ads", clique em "Conectar Meta Ads Cloud". Você será redirecionado para o Facebook para autorizar o Vysify via OAuth 2.0.\n\nSua senha nunca é compartilhada — apenas um token de acesso é salvo, criptografado.'
      },
      {
        q: 'Quais métricas aparecem no painel?',
        a: 'O painel mostra os dados dos últimos 30 dias:\n• 💰 Investimento total em campanhas\n• 👥 Leads totais gerados\n• 📉 Custo por Lead (CPL) médio\n• 📈 ROAS (Retorno sobre Investimento em Anúncios)\n\nTambém há um gráfico de gastos diários e uma tabela de campanhas individuais.'
      },
      {
        q: 'Recebi erro ao conectar. O que fazer?',
        a: 'Verifique:\n1. Se as configurações de OAuth estão corretas no Super Admin (Client ID e Secret da Meta API).\n2. Se sua conta Meta tem permissão de Administrador no Business Manager.\n3. Se há pelo menos uma conta de anúncios ativa vinculada ao perfil.\n\nSe o erro persistir, contate o suporte com o código de erro exibido.'
      },
      {
        q: 'Este módulo tem custo extra?',
        a: 'O módulo de Meta Ads Analytics em si não gera custo adicional pela Vysify — seu uso está incluído no plano que inclui este módulo.\n\nOs gastos com os anúncios em si continuam sendo cobrados diretamente pelo Facebook/Meta conforme seu orçamento de campanha. A Vysify apenas lê os dados, não gerencia os gastos.'
      }
    ]
  },
  {
    id: 'ai',
    icon: '🤖',
    title: 'Inteligência Artificial',
    description: 'IA, respostas automáticas e resumos.',
    items: [
      {
        q: 'Como treinar a IA com os dados da minha empresa?',
        a: 'Acesse "Configurações do Workspace" → "Contexto de IA". Preencha com:\n• Descrição dos seus produtos/serviços e preços\n• Público-alvo e suas dores\n• Tom de voz (formal, descontraído, técnico)\n• Diferenciais competitivos\n• Perguntas frequentes e respostas padrão\n\nQuanto mais detalhado, mais precisas as respostas geradas.'
      },
      {
        q: 'Como gerar uma resposta com IA no Inbox?',
        a: 'Dentro de uma conversa aberta, clique no ícone ✨ (estrela) na barra de ferramentas acima do campo de mensagem. A IA analisará o histórico da conversa e o contexto do seu negócio e gerará uma sugestão de resposta. Você pode editar antes de enviar.'
      },
      {
        q: 'Como resumir uma conversa com IA?',
        a: 'No painel lateral de uma conversa, clique em "Resumir com IA". O sistema gera um resumo estruturado com: problema do cliente, o que foi prometido e próximo passo recomendado. Ideal para passar o atendimento entre agentes.'
      },
      {
        q: 'Meus créditos de IA acabaram. O que fazer?',
        a: 'Quando os créditos de IA se esgotam, o sistema mostra um aviso e solicita confirmação para continuar com cobrança por overage, ou você pode comprar um pacote de créditos extras em "Faturamento → Créditos de IA".'
      },
      {
        q: 'Como funciona o AI Insights no Pipeline?',
        a: 'Clique no botão ✨ no topo do Pipeline de Vendas. A IA analisa todos os deals abertos e gera um relatório com:\n• Gargalos identificados por estágio\n• Deals em risco de esfriar (sem atividade recente)\n• Recomendações de próximo passo para cada negócio'
      }
    ]
  },
  {
    id: 'team',
    icon: '👥',
    title: 'Equipe e Configurações',
    description: 'Membros, permissões e configurações gerais.',
    items: [
      {
        q: 'Como convidar membros para o workspace?',
        a: 'Vá em "Configurações" → "Equipe" → "Convidar Membro". Informe o e-mail e o papel (Admin ou Member). O convidado recebe um e-mail de aceite.\n\nAlternativamente, gere um link de convite compartilhável para onboarding em massa.'
      },
      {
        q: 'Qual a diferença entre Owner, Admin e Member?',
        a: '• Owner: acesso total (billing, configurações, todos os dados)\n• Admin: gerencia automações, pipelines, equipe e integrações\n• Member: acessa apenas Inbox, Contatos, Deals e Tarefas — não vê dados financeiros nem configurações sensíveis'
      },
      {
        q: 'Como remover um membro da equipe?',
        a: 'Em "Configurações → Equipe", clique nos três pontos ao lado do membro e selecione "Remover". O acesso é revogado imediatamente. Conversas e deals atribuídos a ele ficam como "Não atribuídos".'
      },
      {
        q: 'Como configurar 2FA (autenticação em 2 fatores)?',
        a: 'Acesse "Conta" → "Segurança" → "Autenticação 2FA" e clique em "Configurar 2FA". Escaneie o QR Code com Google Authenticator, Authy ou 1Password e insira o código de 6 dígitos para ativar.'
      },
      {
        q: 'Como aplicar presets de indústria?',
        a: 'Em "Configurações do Workspace" → "Presets de Indústria", escolha o segmento (Imobiliária, Clínicas, Agência, etc.) e clique em "Aplicar Preset". O sistema cria automaticamente Pipelines, Campos Personalizados e Tags pré-configurados para aquele setor.'
      }
    ]
  }
];

// Keyword search: finds the best matching FAQ item across all categories
const findFaqByKeyword = (query) => {
  const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const keywords = q.split(/\s+/).filter(w => w.length > 2);

  let best = null;
  let bestScore = 0;

  for (const cat of FAQ_DATA) {
    for (const item of cat.items) {
      const target = (item.q + ' ' + item.a + ' ' + cat.title)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      const score = keywords.reduce((acc, kw) => acc + (target.includes(kw) ? 1 : 0), 0);
      if (score > bestScore) {
        bestScore = score;
        best = { ...item, category: cat.title };
      }
    }
  }
  return bestScore > 0 ? best : null;
};


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
      const res = await fetch('/api/user/support');
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
      
      setLoading(true);
      setTimeout(() => {
        const match = findFaqByKeyword(text);
        const botMsg = match
          ? {
              id: Date.now() + 1,
              side: 'bot',
              content: `Encontrei algo sobre **${match.category}** que pode ajudar:\n\n**${match.q}**\n\n${match.a}`,
              isAnswer: true,
              timestamp: new Date()
            }
          : {
              id: Date.now() + 1,
              side: 'bot',
              content: 'Não encontrei uma resposta exata para essa dúvida. 🤔\n\nTente reformular ou selecione uma categoria abaixo para navegar pelos tópicos disponíveis:',
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
          const res = await fetch('/api/user/support', {
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
            await fetchHumanMessages(data.ticket.id);
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
