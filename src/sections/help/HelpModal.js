import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/components/Modal/index';
import {
  QuestionMarkCircleIcon,
  RectangleStackIcon,
  PhoneIcon,
  Cog6ToothIcon,
  BoltIcon,
  PuzzlePieceIcon,
  RocketLaunchIcon,
  MagnifyingGlassIcon,
  InboxIcon,
  CheckCircleIcon,
  ChartBarIcon,
  CreditCardIcon,
  UsersIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';

/* ─── Static help categories (content from i18n) ───────────────────── */
const HELP_CATEGORIES = [
  { key: 'crm', icon: PhoneIcon },
  { key: 'pipelines', icon: RectangleStackIcon },
  { key: 'inbox', icon: InboxIcon },
  { key: 'tasks', icon: CheckCircleIcon },
  { key: 'custom_fields', icon: Cog6ToothIcon },
  { key: 'automations', icon: BoltIcon },
  { key: 'analytics', icon: ChartBarIcon },
  { key: 'integrations', icon: PuzzlePieceIcon },
  { key: 'presets', icon: RocketLaunchIcon },
  { key: 'billing', icon: CreditCardIcon },
  { key: 'team', icon: UsersIcon },
];

/* ─── Step component for Tutorial cards ────────────────────────────── */
const Step = ({ number, title, desc }) => (
  <div className="flex gap-4 items-start">
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center shadow-lg shadow-blue-500/30">
      {number}
    </div>
    <div>
      <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{title}</p>
      {desc && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">{desc}</p>}
    </div>
  </div>
);

const TipBox = ({ children }) => (
  <div className="mt-4 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-xl">
    <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-0.5">💡 Dica</p>
    <p className="text-xs text-amber-700 dark:text-amber-500 leading-relaxed">{children}</p>
  </div>
);

const TutorialImage = ({ src, alt, caption }) => (
  <div className="my-5 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 shadow-lg">
    <img src={src} alt={alt} className="w-full object-cover" loading="lazy" />
    {caption && (
      <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
        {caption}
      </div>
    )}
  </div>
);

/* ─── Tutorial content (rich JSX) ──────────────────────────────────── */
const TUTORIAL_CONTENT = {
  custom_fields: {
    title: '🎛️ Tutorial: Campos Personalizados',
    render: () => (
      <div className="space-y-6">
        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          Campos Personalizados permitem que você adapte o CRM à sua empresa, adicionando informações específicas do seu negócio em Contatos, Empresas e Negócios.
        </p>

        <TutorialImage
          src="/help-images/custom-fields.png"
          alt="Campos Personalizados"
          caption="Tela de Configuração → Campos Personalizados"
        />

        <div className="space-y-4">
          <Step number={1} title='Acesse Configurações → Campos Personalizados' desc='No menu superior, clique em "Configurações" (ícone de engrenagem) e depois em "Custom Fields" no menu lateral.' />
          <Step number={2} title='Clique em "+ Add Field"' desc='Um novo campo vazio aparece na lista. Você pode adicionar quantos campos precisar.' />
          <Step number={3} title='Preencha o nome (Label)' desc='Ex.: "Data de Aniversário", "Tamanho da Empresa", "Nível de Interesse". O sistema gera automaticamente a chave interna.' />
          <Step number={4} title='Escolha o tipo do campo' desc='• Text — texto livre | • Number — número | • Select — dropdown com opções | • Multi-Select — múltipla escolha | • Checkbox — sim/não | • Currency — valor monetário | • URL — link | • Phone — telefone | • Date — data' />
          <Step number={5} title='Para Select/Multi-Select: defina as opções' desc='Escreva as opções separadas por vírgula. Ex.: Quente, Morno, Frio' />
          <Step number={6} title='Defina a área de visibilidade' desc='"Both" = aparece em Vendas e Suporte. "Sales Only" = só aparece em Deals. "Support Only" = só na Inbox.' />
          <Step number={7} title='Marque "Required Field" se quiser torná-lo obrigatório' desc='Quando marcado, o sistema exige o preenchimento ao salvar um contato ou negócio.' />
          <Step number={8} title='Clique em "Save Changes"' desc='Os campos já ficam disponíveis nos formulários de Contato e Negócio.' />
        </div>

        <TipBox>
          Você pode ter até 20 campos personalizados. Para excluir um campo, clique no ícone de lixeira ao lado dele. Atenção: excluir um campo remove os dados já preenchidos.
        </TipBox>
      </div>
    ),
  },

  automations: {
    title: '⚡ Tutorial: Automações & Workflows',
    render: () => (
      <div className="space-y-6">
        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          Automações são regras &quot;se isso → faça aquilo&quot;. Você define um <b>gatilho</b>, adiciona <b>condições</b> e configura as <b>ações</b> que o sistema realiza automaticamente.
        </p>

        <TutorialImage
          src="/help-images/automations.png"
          alt="Criação de regra de automação"
          caption="Construtor de Regras de Automação"
        />

        <div className="space-y-4">
          <Step number={1} title='Acesse o menu "Automações"' desc='No menu superior da topbar, clique em "Automações".' />
          <Step number={2} title='Clique em "+ New Rule"' desc='Um painel de criação de regra abre à direita da tela.' />
          <Step number={3} title='Dê um nome à regra' desc='Ex.: "Resposta automática para pedido de preço".' />
          <Step number={4} title='Escolha o Gatilho (Trigger)' desc='• Nova Mensagem Recebida | • Negócio Mudou de Estágio | • Contato Criado | • Inatividade (X dias sem resposta)' />
          <Step number={5} title='Adicione Condições (opcional)' desc='Filtre quando a regra dispara. Ex.: "Conteúdo da mensagem contém: preço". Condições podem ser AND (todas devem ser verdade) ou OR (qualquer uma).' />
          <Step number={6} title='Configure as Ações' desc='• Atribuir conversa para membro | • Enviar mensagem automática | • Aplicar tag | • Mover deal de estágio | • Criar tarefa | • Chamar webhook externo | • Atraso (wait 2 horas)' />
          <Step number={7} title='Ative a regra com o toggle' desc='Regras desativadas não executam. Útil para testar antes de ativar.' />
          <Step number={8} title='Clique em "Save Rule"' desc='A regra entra em vigor imediatamente para novas ocorrências.' />
        </div>

        <div className="mt-5 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-700/40 rounded-xl space-y-2">
          <p className="text-xs font-bold text-blue-700 dark:text-blue-400">📋 Exemplo prático</p>
          <p className="text-xs text-blue-700 dark:text-blue-500 leading-relaxed">
            <b>Regra:</b> &quot;Roteamento de clientes VIP&quot;<br />
            <b>Gatilho:</b> Nova Mensagem Recebida<br />
            <b>Condição:</b> Tag do contato = &quot;VIP&quot;<br />
            <b>Ação 1:</b> Atribuir para &quot;Gerente de Contas&quot;<br />
            <b>Ação 2:</b> Enviar mensagem &quot;Olá {'{{contact.name}}'}, um gerente está te atendendo agora!&quot;
          </p>
        </div>

        <TipBox>
          No painel de Logs de Automação, você vê quais regras dispararam e por quê — ótimo para depurar problemas. Acesse em Automações → aba Logs.
        </TipBox>
      </div>
    ),
  },

  templates: {
    title: '📝 Tutorial: Templates de Mensagem',
    render: () => (
      <div className="space-y-6">
        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          Templates são mensagens pré-escritas com variáveis dinâmicas. Use-os na Inbox para responder rapidamente ou em Automações para envios automáticos.
        </p>

        <TutorialImage
          src="/help-images/templates.png"
          alt="Editor de Templates de Mensagem"
          caption="Editor de Templates com variáveis dinâmicas"
        />

        <div className="space-y-4">
          <Step number={1} title='Acesse a Inbox → Templates' desc='Na Topbar clique em "Inbox" e depois no botão "Gerenciar Templates" no canto superior.' />
          <Step number={2} title='Clique em "+ New Template"' desc='Um formulário de criação aparece.' />
          <Step number={3} title='Dê um nome ao template' desc='Ex.: "Boas-vindas", "Proposta de Preço", "Follow-up 3 dias". Esse é o nome que aparece no seletor dentro da conversa.' />
          <Step number={4} title='Escreva o corpo da mensagem com variáveis' desc='Use as variáveis dinâmicas abaixo para personalizar automaticamente:' />
        </div>

        <div className="bg-zinc-50 dark:bg-zinc-800 rounded-xl p-4 font-mono text-xs space-y-1.5 border border-zinc-200 dark:border-zinc-700">
          {[
            ['{{contact.name}}', 'Nome do contato'],
            ['{{contact.email}}', 'Email do contato'],
            ['{{contact.phone}}', 'Telefone do contato'],
            ['{{company.name}}', 'Nome da empresa do contato'],
            ['{{deal.name}}', 'Nome do negócio vinculado'],
            ['{{deal.amount}}', 'Valor do negócio'],
            ['{{agent.name}}', 'Seu nome (quem está atendendo)'],
            ['{{workspace.name}}', 'Nome da sua empresa'],
          ].map(([v, d]) => (
            <div key={v} className="flex items-center gap-3">
              <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md font-medium">{v}</span>
              <span className="text-zinc-500 dark:text-zinc-400">{d}</span>
            </div>
          ))}
        </div>

        <div className="space-y-4 mt-2">
          <Step number={5} title='Clique em "Save Template"' desc='O template fica disponível para todos os agentes.' />
          <Step number={6} title='Para usar na Inbox' desc='Abra uma conversa → Clique em "Insert Message Template..." → Escolha o template → A mensagem preenche o campo de texto. Você pode editar antes de enviar.' />
        </div>

        <TipBox>
          Teste seu template antes com um contato real para ver como as variáveis ficam preenchidas. Se uma variável estiver vazia (ex: deal sem valor), ela aparece como campo em branco.
        </TipBox>
      </div>
    ),
  },

  presets: {
    title: '🚀 Tutorial: Setups em 1-Clique (Presets)',
    render: () => (
      <div className="space-y-6">
        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          Presets são pacotes de configuração pré-montados para segmentos de mercado específicos. Com 1 clique você configura Pipelines, Campos Personalizados e Tags adequados ao seu negócio.
        </p>

        <TutorialImage
          src="/help-images/presets.png"
          alt="Tela de Presets por Indústria"
          caption="Configurações → Presets — escolha seu segmento de mercado"
        />

        <div className="space-y-4">
          <Step number={1} title='Acesse Configurações → Presets' desc='No menu de Configurações do workspace, clique em "Presets" ou "1-Click Setups".' />
          <Step number={2} title='Escolha o preset do seu segmento' desc='Atualmente disponíveis:' />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: '🏠', name: 'Imobiliária', desc: 'Pipeline: Captação → Visita → Proposta → Fechamento. Campos: Tipo de Imóvel, Valor Avaliado, Tamanho (m²).' },
            { icon: '🏥', name: 'Clínica Médica', desc: 'Pipeline: Agendamento → Consulta → Retorno. Campos: Convênio, Data Nascimento, Prontuário.' },
            { icon: '💼', name: 'Agência Digital', desc: 'Pipeline: Proposta → Onboarding → Recorrência. Campos: Pacote Contratado, MRR, Data renovação.' },
            { icon: '🔧', name: 'Assistência Técnica', desc: 'Pipeline: Orçamento → Aprovação → Execução → Entrega. Campos: Equipamento, Nº Série, Garantia.' },
          ].map((p) => (
            <div key={p.name} className="p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl">
              <div className="text-lg mb-1">{p.icon}</div>
              <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100 mb-1">{p.name}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>

        <div className="space-y-4 mt-2">
          <Step number={3} title='Clique em "Apply Preset"' desc='O sistema cria automaticamente os Pipelines, Estágios, Campos Personalizados e Tags configurados para aquele segmento.' />
          <Step number={4} title='Personalize conforme necessário' desc='O preset é um ponto de partida. Depois de aplicado, você pode editar os estágios do pipeline, renomear campos, adicionar mais opções etc.' />
        </div>

        <TipBox>
          Você pode aplicar múltiplos presets se atender mais de um segmento. O sistema verifica duplicatas antes de criar, então campos com a mesma chave não são duplicados.
        </TipBox>
      </div>
    ),
  },

  webhooks: {
    title: '🔗 Tutorial: Integrações & Webhooks',
    render: () => (
      <div className="space-y-6">
        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          Webhooks enviam dados do CRM para sistemas externos (Zapier, Make, seu próprio sistema) sempre que algo acontece. São a ponte entre o Nextacular e qualquer outra ferramenta.
        </p>

        <TutorialImage
          src="/help-images/webhooks.png"
          alt="Painel de Webhooks"
          caption="Configurações → Integrações → Webhooks"
        />

        <div className="space-y-4">
          <Step number={1} title='Acesse Configurações → Integrações → Webhooks' desc='No menu lateral de configurações, clique em "Webhooks".' />
          <Step number={2} title='Clique em "+ New Webhook"' desc='Um formulário de criação aparece.' />
          <Step number={3} title='Cole a URL do destino' desc='Ex.: URL do Zapier, Make, seu servidor, ou n8n. A URL deve aceitar requisições POST com JSON.' />
          <Step number={4} title='Selecione os eventos a enviar' desc='• contact.created — Novo contato criado | • deal.stage_changed — Negócio mudou de estágio | • message.received — Mensagem recebida | • task.completed — Tarefa concluída | • * — Envia TODOS os eventos' />
          <Step number={5} title='Copie o HMAC Secret' desc='Esse segredo serve para validar que os webhooks são legítimos e vieram do Nextacular. Use-o no seu servidor para verificar a assinatura.' />
          <Step number={6} title='Salve e teste' desc='Clique em "Save". O primeiro evento real que acontecer disparará o webhook.' />
        </div>

        <div className="mt-4 p-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
          <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">📦 Formato do payload enviado:</p>
          <pre className="text-xs text-green-600 dark:text-green-400 font-mono leading-relaxed overflow-x-auto">{`{
  "event": "deal.stage_changed",
  "workspace": "minha-empresa",
  "data": {
    "dealId": "clx123",
    "dealName": "Proposta Empresa ABC",
    "oldStage": "Qualificação",
    "newStage": "Proposta Enviada",
    "contactName": "João Silva"
  },
  "timestamp": "2024-03-11T21:00:00Z"
}`}</pre>
        </div>

        <div className="space-y-4 mt-2">
          <Step number={7} title='Monitore o painel de Entregas' desc='Em Webhooks → Delivery Log você vê cada envio: status HTTP, payload e se houve erro.' />
          <Step number={8} title='Falhou? Use "Retry"' desc='Se um webhook falhou (timeout, servidor offline), clique em Retry na linha correspondente para reenviar.' />
          <Step number={9} title='Rotação de Segredo' desc='Se suspeitar que o HMAC secret foi vazar, clique em "Rotate Secret" para gerar um novo. Atualize imediatamente no seu servidor receptor.' />
        </div>

        <TipBox>
          Para integrar com o Zapier sem programação: crie um Zap com trigger &quot;Webhooks by Zapier → Catch Hook&quot;, copie a URL gerada e cole no Nextacular. Pronto!
        </TipBox>
      </div>
    ),
  },

  ai_insights: {
    title: '🤖 Tutorial: Insights de IA (Pipeline)',
    render: () => (
      <div className="space-y-6">
        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          O módulo de IA analisa seu pipeline e gera insights estratégicos automaticamente — identificando gargalos, oportunidades de melhoria e recomendações de próximos passos.
        </p>

        <div className="space-y-4">
          <Step number={1} title='Acesse o Pipeline' desc='No menu superior, clique em "Pipeline".' />
          <Step number={2} title='Clique em "Get AI Insights" (ícone ✨)' desc='O botão aparece ao lado do nome do pipeline no topo da tela. Requer plano Standard ou superior.' />
          <Step number={3} title='Aguarde a análise (2-5 segundos)' desc='O sistema envia os dados do seu pipeline para a IA, que retorna um relatório focado em ação.' />
          <Step number={4} title='Leia o painel azul de insights' desc='O painel mostra tipicamente: gargalos por estágio, negócios parados, valores em risco e sugestões concretas.' />
          <Step number={5} title='Feche o painel com o "×"' desc='Clique no X para fechar e retornar ao Kanban. Você pode gerar novos insights a qualquer momento.' />
        </div>

        <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-700/40 rounded-xl">
          <p className="text-xs font-bold text-indigo-700 dark:text-indigo-400 mb-2">🔍 Exemplo de insight gerado:</p>
          <p className="text-xs text-indigo-700 dark:text-indigo-500 leading-relaxed italic">
            &quot;• O estágio &apos;Proposta Enviada&apos; tem R$48.000 parados há mais de 14 dias em 3 negócios — considere um follow-up urgente.<br />
            • Taxa de conversão de &apos;Qualificação → Fechamento&apos; está em 12%, abaixo do benchmark de 20%.<br />
            • 2 negócios marcados como Alta Prioridade estão sem atividade recente.&quot;
          </p>
        </div>

        <TipBox>
          Os insights ficam mais precisos quando seus deals têm valores (R$) preenchidos e estão distribuídos entre diferentes estágios. Mantenha o pipeline atualizado!
        </TipBox>
      </div>
    ),
  },

  ai_summary: {
    title: '💬 Tutorial: Resumo IA de Conversa',
    render: () => (
      <div className="space-y-6">
        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
          O Resumo IA lê o histórico de uma conversa e gera um resumo estruturado em segundos — ideal para equipes que precisam de contexto rápido ao assumir um atendimento.
        </p>

        <div className="space-y-4">
          <Step number={1} title='Acesse a Inbox e abra uma conversa' desc='Clique em qualquer conversa na lista lateral.' />
          <Step number={2} title='Clique no botão &quot;Resumo IA&quot; (ícone ✨) no cabeçalho' desc='O botão aparece no topo direito da janela de chat, ao lado do seletor de responsável.' />
          <Step number={3} title='Aguarde 2-3 segundos' desc='O botão mostra "Gerando..." enquanto a IA processa. O sistema analisa as últimas 50 mensagens.' />
          <Step number={4} title='Leia o painel azul de resumo' desc='O resumo aparece em destaque abaixo do cabeçalho, com:' />
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-700/40 rounded-xl p-4 space-y-2">
          <div className="flex items-start gap-2 text-xs text-blue-700 dark:text-blue-400">
            <span className="mt-0.5">🎯</span>
            <span><b>Problema/Necessidade principal</b> do cliente nesta conversa</span>
          </div>
          <div className="flex items-start gap-2 text-xs text-blue-700 dark:text-blue-400">
            <span className="mt-0.5">📋</span>
            <span><b>O que foi dito e prometido</b> pelos agentes até agora</span>
          </div>
          <div className="flex items-start gap-2 text-xs text-blue-700 dark:text-blue-400">
            <span className="mt-0.5">→</span>
            <span><b>Próximo passo recomendado</b> pela IA para fechar o atendimento</span>
          </div>
        </div>

        <div className="space-y-4">
          <Step number={5} title='Feche o resumo com o &quot;×&quot;' desc='O resumo desaparece mas a conversa segue normalmente.' />
          <Step number={6} title='Troque de conversa para resetar' desc='Ao clicar em outra conversa, o resumo anterior é descartado automaticamente.' />
        </div>

        <TipBox>
          Esse recurso é perfeito durante a troca de turno: o agente entrante clica em &quot;Resumo IA&quot; e fica atualizado em segundos, sem ler centenas de mensagens.
        </TipBox>
      </div>
    ),
  },
};

/* ─── All tutorial keys for sidebar nav ────────────────────────────── */
const TUTORIAL_KEYS = Object.keys(TUTORIAL_CONTENT);

/* ─── HelpModal ─────────────────────────────────────────────────────── */
const HelpModal = ({ isOpen, toggle }) => {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState('crm');
  const [searchQuery, setSearchQuery] = useState('');
  const [mode, setMode] = useState('help'); // 'help' | 'tutorials'
  const [activeTutorial, setActiveTutorial] = useState('custom_fields');

  const filteredCategories = HELP_CATEGORIES.filter((cat) =>
    t(`help.category.${cat.key}.title`).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTutorials = TUTORIAL_KEYS.filter((key) =>
    TUTORIAL_CONTENT[key].title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal show={isOpen} title={mode === 'tutorials' ? '📚 Tutoriais No-Code' : t('help.modal.title')} toggle={toggle} size="large">
      <div className="flex h-[560px] -m-6 border-t border-gray-100 dark:border-zinc-800">
        {/* ── Sidebar ─────────────────────────────────────────────── */}
        <div className="w-64 flex-shrink-0 border-r border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50 flex flex-col">
          {/* Mode switcher */}
          <div className="flex gap-1 p-3 pb-0">
            <button
              onClick={() => setMode('help')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${mode === 'help' ? 'bg-blue-600 text-white shadow-md' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
            >
              {t('help.modal.title')}
            </button>
            <button
              onClick={() => setMode('tutorials')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 ${mode === 'tutorials' ? 'bg-blue-600 text-white shadow-md' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
            >
              <AcademicCapIcon className="h-3.5 w-3.5" />
              Tutoriais
            </button>
          </div>

          {/* Search */}
          <div className="p-3">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={t('help.search.placeholder')}
                className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
            {mode === 'help' && filteredCategories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                      : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                  {t(`help.category.${cat.key}.title`)}
                </button>
              );
            })}

            {mode === 'tutorials' && filteredTutorials.map((key) => {
              const tut = TUTORIAL_CONTENT[key];
              const isActive = activeTutorial === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTutorial(key)}
                  className={`flex items-center gap-2 w-full px-3 py-2.5 text-sm font-medium rounded-xl transition-all text-left ${isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                      : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                  {tut.title.split(':')[0]}
                  <span className={`text-xs leading-tight ${isActive ? 'text-blue-100' : 'text-zinc-500'}`}>
                    {tut.title.split(':')[1]?.trim()}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* ── Content area ──────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-8 dark:bg-zinc-950">
          {mode === 'help' && (
            <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl">
                  {(() => {
                    const cat = HELP_CATEGORIES.find((c) => c.key === activeCategory);
                    const Icon = cat?.icon || QuestionMarkCircleIcon;
                    return <Icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />;
                  })()}
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {t(`help.category.${activeCategory}.title`)}
                </h2>
              </div>

              <div
                className="prose prose-blue dark:prose-invert max-w-none text-gray-600 dark:text-zinc-400"
                dangerouslySetInnerHTML={{ __html: t(`help.category.${activeCategory}.content`) }}
              />

              <div className="mt-10 pt-6 border-t border-gray-100 dark:border-zinc-800 text-center">
                <p className="text-xs text-gray-400 dark:text-zinc-500 mb-2">{t('help.footer.text')}</p>
                <button
                  onClick={() => { setMode('tutorials'); setSearchQuery(''); }}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  📚 Ver tutoriais passo-a-passo →
                </button>
              </div>
            </div>
          )}

          {mode === 'tutorials' && (
            <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                {TUTORIAL_CONTENT[activeTutorial]?.title}
              </h2>
              {TUTORIAL_CONTENT[activeTutorial]?.render()}
              <div className="mt-10 pt-6 border-t border-gray-100 dark:border-zinc-800 text-center">
                <p className="text-xs text-gray-400 dark:text-zinc-500">{t('help.footer.text')}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default HelpModal;
