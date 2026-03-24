# 📋 Relatório Completo de Features — Vysify CRM

> Análise detalhada de todas as funcionalidades da plataforma, explicando o que faz, como funciona e por que é relevante para seus clientes.

---

## 1. 🏠 Dashboard Inteligente

**Localização:** [index.js](file:///c:/Users/Usuário/Documents/novo/nextacular/src/pages/account/[workspaceSlug]/index.js)

O Dashboard é a **tela principal** que o cliente vê ao entrar no workspace. Funciona como o "cockpit" de operações comerciais.

### O que faz:
- **Stat Cards** — Exibe métricas-chave em tempo real: Total de Contatos, Negócios Abertos, Negócios Ganhos, Receita Total, Pagamentos Pagos e Pagamentos Pendentes
- **Gráfico de Performance de Receita** — Gráfico de área animado (Recharts) mostrando a evolução mensal de vendas
- **NPS Score & Trend** — Gráfico de barras com distribuição de notas NPS + gráfico de linha com tendência dos últimos 6 meses
- **Activity Feed** — Timeline das ações recentes (criação de negócios, atividades do time)
- **Action Center (Tarefas Prioritárias)** — Lista de tarefas próximas do vencimento com indicadores de prioridade (HIGH/MEDIUM/LOW)
- **Uso & Limites** — Painel exclusivo para owners mostrando consumo atual vs. limites do plano (membros, webhooks, automações, WhatsApp, IA, uploads)

### Por que é relevante:
O cliente **nunca precisa procurar informações** — tudo está consolidado em uma única visão. Gestores podem tomar decisões rápidas vendo receita, pipeline e satisfação do cliente no mesmo painel. O bloco de "Uso & Limites" também cria **consciência sobre upgrade**, estimulando upgrades naturais quando os limites se aproximam.

---

## 2. 👥 Gestão de Contatos

**Localização:** [contacts/](file:///c:/Users/Usuário/Documents/novo/nextacular/src/pages/account/[workspaceSlug]/contacts)

### O que faz:
- **Listagem com filtros e busca** — Pesquisa por nome, email, telefone com paginação
- **Criação via modal** — Formulário rápido para adicionar contatos sem sair da tela
- **Histórico de Atividades (Timeline)** — Cada contato tem uma timeline completa: mensagens, notas, chamadas, tarefas e interações do pipeline
- **Tags** — Sistema de etiquetas coloridas para segmentação (ex: "Lead Quente", "VIP", "Recompra")
- **Custom Fields** — Campos personalizados dinâmicos (texto, data, select, checkbox, multi-select, moeda, URL, telefone) armazenados via JSONB
- **Importação CSV** — Importação em massa de contatos via arquivo

### Por que é relevante:
PMEs geralmente gerenciam clientes em **planilhas ou cadernos**. Ter um local centralizado com histórico completo e campos personalizáveis significa que o vendedor **nunca perde contexto** — mesmo quando outro membro da equipe assume o atendimento. A importação CSV facilita a migração de bases existentes.

---

## 3. 🏢 Gestão de Empresas

**Localização:** [companies/](file:///c:/Users/Usuário/Documents/novo/nextacular/src/pages/account/[workspaceSlug]/companies)

### O que faz:
- **CRUD completo** de empresas (nome, CNPJ, segmento, etc.)
- **Associação de contatos** a empresas
- **Custom Fields** específicos para dados corporativos
- **Listagem com filtros avançados**

### Por que é relevante:
Em vendas B2B, a empresa é a "conta principal" e os contatos são pontos de acesso. Permite visualizar **todas as oportunidades e interações** com uma empresa em um só lugar, essencial para equipes que vendem para outras empresas.

---

## 4. 🔄 Pipeline de Vendas (Kanban Visual)

**Localização:** [pipeline/](file:///c:/Users/Usuário/Documents/novo/nextacular/src/pages/account/[workspaceSlug]/pipeline)

### O que faz:
- **Interface Kanban Drag-and-Drop** — Estágios customizáveis (ex: Lead → Qualificado → Proposta → Negociação → Fechado) com arrastar e soltar
- **Criação de Negócios (Deals)** — Cada deal tem nome, valor monetário, contato associado, empresa, estágio e probabilidade
- **Glassmorphism UI** — Interface moderna com efeitos de vidro fosco e indicadores visuais de probabilidade (AI Fit)
- **Optimistic UI** — As atualizações de estágio acontecem instantaneamente na tela, sem esperar o servidor
- **Múltiplos Pipelines** — O workspace pode ter vários funis simultâneos (um para vendas, outro para pós-venda, etc.)

### Por que é relevante:
O Pipeline é o **coração de qualquer operação comercial**. Visualizar negócios em Kanban dá ao gestor uma visão **instantânea de onde cada oportunidade está parada e quanto dinheiro está em jogo**. O drag-and-drop simplifica o trabalho do vendedor que atualiza dezenas de deals por dia. Alimenta automações (ex: enviar WhatsApp quando deal muda de estágio).

---

## 5. 📨 Inbox Omnichannel (WhatsApp + Email)

**Localização:** [inbox/](file:///c:/Users/Usuário/Documents/novo/nextacular/src/pages/account/[workspaceSlug]/inbox)

### O que faz:
- **Interface estilo Helpdesk** — Lista de conversas à esquerda, painel de mensagens à direita
- **WhatsApp integrado** (Meta Cloud API) — Recebe e envia mensagens diretamente da plataforma
- **Email integrado** — Canal de email unificado na mesma caixa
- **Atribuição de conversas** — Designar conversas para membros específicos da equipe
- **Status de conversa** — Aberta, Resolvida, Pendente
- **Lead Gen automático** — Quando um número desconhecido envia mensagem, o contato é criado automaticamente
- **Associação automática** — Mensagens de números conhecidos são vinculadas ao contato existente
- **Templates reutilizáveis** — Mensagens pré-formatadas com variáveis dinâmicas
- **Resumo de conversa por IA** — Resumo automático do histórico de uma conversa longa
- **Sugestões de resposta por IA** — A IA analisa o contexto e sugere respostas em tempo real

### Por que é relevante:
O maior problema de PMEs é **responder clientes rápido e de forma consistente**. Com o Inbox, o time inteiro atende pelo mesmo número/canal, ninguém "esquece" uma conversa, e a IA reduz o tempo de resposta. A criação automática de leads garante que nenhum contato seja perdido.

---

## 6. 🤖 Inteligência Artificial (IA)

**Localização:** [ai/](file:///c:/Users/Usuário/Documents/novo/nextacular/src/pages/api/workspace/[workspaceSlug]/ai) + [ai-context.js](file:///c:/Users/Usuário/Documents/novo/nextacular/src/pages/api/workspace/[workspaceSlug]/ai-context.js)

### O que faz:
- **Sugestões de Resposta** — No Inbox, a IA sugere respostas inteligentes baseadas no contexto da conversa e no histórico do cliente
- **Resumo de Conversas** — Condensa conversas longas em parágrafos claros para vendedores que estão assumindo um atendimento
- **AI Pipeline Insights** — Analisa o pipeline e gera recomendações automatizadas (ex: "essa deal está parada há 10 dias, entre em contato") e avalia probabilidade de fechamento (AI Fit)
- **Contexto de Empresa** — A IA pode receber contexto personalizado do negócio para personalizar sugestões
- **Cota gerenciada** — Tokens de IA são limitados por plano, com cobrança automática de overage via Stripe

### Por que é relevante:
A IA transforma vendedores **juniores em profissionais experientes** — as sugestões de resposta dão tom e conteúdo adequados. O resumo de conversas elimina o tempo gasto relendo histórico. Os insights do pipeline funcionam como um **"gerente virtual"** apontando riscos e oportunidades.

---

## 7. ⚡ Automações & Workflows (No-Code)

**Localização:** [automations/](file:///c:/Users/Usuário/Documents/novo/nextacular/src/pages/account/[workspaceSlug]/automations)

### O que faz:
- **Sistema de Regras (Gatilhos + Ações):**
  - Gatilhos: Mudança de estágio, mensagem recebida, palavra-chave, inatividade
  - Ações: Enviar WhatsApp, enviar email, criar tarefa, mover estágio, aplicar tag, chamar webhook, atribuir responsável
- **Condições compostas (AND/OR)** — Regras com múltiplas condições (ex: "Se contato é VIP **E** deal > R$10k")
- **Filtros avançados** — Por tags, canal, horário, região
- **Delays (Ações com atraso)** — Ex: "Esperar 2 dias, depois enviar follow-up"
- **Múltiplas ações por regra** — Uma automação pode executar várias ações em sequência
- **Auditoria e logs por execução** — Cada disparo de automação é registrado com timestamp, resultado e detalhes
- **Simulação/Teste de Regras** — Testar uma automação antes de ativar, com "explicação" do disparo

### Por que é relevante:
**Elimina trabalho repetitivo e garante consistência.** Sem automação, o vendedor esquece de enviar o follow-up, de atribuir a conversa, de criar a tarefa. Com automação, essas ações acontecem sozinhas. O diferencial de "No-Code" é crucial: o **cliente configura as regras sozinho** sem precisar de desenvolvedor.

---

## 8. ✅ Tarefas & Lembretes

**Localização:** [tasks/](file:///c:/Users/Usuário/Documents/novo/nextacular/src/pages/account/[workspaceSlug]/tasks)

### O que faz:
- **Criação de tarefas** com título, data de vencimento, responsável, prioridade (HIGH/MEDIUM/LOW) e status
- **Associação a Contatos e Deals** — Vincular tarefa a um contato específico ou a um negócio
- **Lembretes automáticos** — Dashboard exibe tarefas urgentes no Action Center
- **Pode ser criada via automação** — Ex: ao receber lead, criar tarefa "Ligar em 24h"

### Por que é relevante:
Vendedores vivem de follow-ups. Uma tarefa esquecida pode significar **perder um negócio**. O sistema de tarefas garante que nada caia no esquecimento, especialmente quando integrado com automações.

---

## 9. 📊 Analytics & Relatórios

**Localização:** [analytics/](file:///c:/Users/Usuário/Documents/novo/nextacular/src/pages/account/[workspaceSlug]/analytics)

### O que faz:
- **Sales Trend** — Gráfico de barras com evolução de vendas ao longo do tempo
- **Desempenho de vendedores** — Sales by User mostrando quem vende mais e Task Completion por membro
- **Funnel de Vendas** — Deals by Stage mostrando taxa de conversão em cada etapa
- **Origem de leads** — De onde os leads estão vindo (orgânico, WhatsApp, indicação, etc.)
- **Tempo médio de fechamento** — Quanto tempo leva para fechar um negócio em cada estágio
- **Exportação CSV** — Baixar os dados brutos para análise externa

### Por que é relevante:
PMEs geralmente **não medem performance de vendas**. Com analytics, o gestor descobre quais vendedores performam melhor, em qual estágio os deals morrem, e de onde vêm os melhores leads. Decisões baseadas em dados ao invés de intuição.

---

## 10. 😊 NPS & Satisfação do Cliente (Customer Satisfaction)

**Localização:** [customer-satisfaction/](file:///c:/Users/Usuário/Documents/novo/nextacular/src/pages/account/[workspaceSlug]/customer-satisfaction) + [nps/](file:///c:/Users/Usuário/Documents/novo/nextacular/src/pages/nps)

### O que faz:
- **Criação de pesquisas NPS** — Configurar pesquisas de satisfação (0–10) com perguntas personalizadas
- **Envio automatizado** — Enviar pesquisas via automação (ex: após deal fechado)
- **Página pública de resposta** — O cliente responde via link público (não precisa ter conta)
- **Analytics de NPS** — Painel com score NPS, distribuição de notas, tendência mensal, e categorização (Promotores/Neutros/Detratores)
- **Integração com Dashboard** — NPS aparece como card direto no Dashboard principal
- **Integração com Webhooks** — Dispara evento "NPS Promotor" para Zapier/integrações (ex: pedir avaliação no Google quando NPS ≥ 9)

### Por que é relevante:
Medir satisfação é **essencial para retenção**. Clientes detratores podem ser abordados rapidamente; promotores podem ser incentivados a indicar. A automação de NPS pós-venda cria um ciclo virtuoso de feedback que a maioria das PMEs simplesmente não tem.

---

## 11. 🔗 Integrações

### 11.1 WhatsApp (Cloud API)
**Localização:** [whatsapp.js](file:///c:/Users/Usuário/Documents/novo/nextacular/src/pages/account/[workspaceSlug]/integrations/whatsapp.js)
- Configuração da API Meta Cloud, envio de templates aprovados, recebimento via webhook
- **Relevância:** O WhatsApp é o canal #1 de comunicação comercial no Brasil

### 11.2 Gmail
**Localização:** [gmail.js](file:///c:/Users/Usuário/Documents/novo/nextacular/src/pages/account/[workspaceSlug]/integrations/gmail.js)
- Integração de email no Inbox para atendimento unificado
- **Relevância:** Clientes que usam email corporativo podem centralizar tudo na mesma interface

### 11.3 Google Calendar
**Localização:** [calendar.js](file:///c:/Users/Usuário/Documents/novo/nextacular/src/pages/account/[workspaceSlug]/integrations/calendar.js)
- Sincronização de agenda para agendamentos e follow-ups
- **Relevância:** Evita conflito de reuniões e automatiza agendamento

### 11.4 Instagram
**Localização:** [instagram.js](file:///c:/Users/Usuário/Documents/novo/nextacular/src/pages/account/[workspaceSlug]/integrations/instagram.js)
- Canal adicional para atendimento via DM do Instagram
- **Relevância:** Empresas com presença forte no Instagram podem atender leads diretamente

### 11.5 Zapier
**Localização:** [zapier.js](file:///c:/Users/Usuário/Documents/novo/nextacular/src/pages/account/[workspaceSlug]/integrations/zapier.js)
- Integração nativa para conectar Vysify com +5.000 apps (Google Sheets, Slack, Mailchimp, etc.)
- **Relevância:** PMEs podem criar workflows entre ferramentas sem código

### 11.6 Webhooks (Avançado)
**Localização:** [webhooks.js](file:///c:/Users/Usuário/Documents/novo/nextacular/src/pages/account/[workspaceSlug]/integrations/webhooks.js)
- Assinatura HMAC com rotação de segredo, filtros por evento, retentativas automáticas, painel de entregas com status/erros/histórico
- **Relevância:** Para clientes técnicos que querem integrar com sistemas internos (ERP, BI, etc.)

### 11.7 API Keys
**Localização:** [api-keys.js](file:///c:/Users/Usuário/Documents/novo/nextacular/src/pages/account/[workspaceSlug]/integrations/api-keys.js)
- Geração e gerenciamento de chaves de API para integrações customizadas
- **Relevância:** Empresas com desenvolvedores próprios podem construir integrações sob medida

### 11.8 Web Forms (Form Builder)
**Localização:** [web-forms.js](file:///c:/Users/Usuário/Documents/novo/nextacular/src/pages/account/[workspaceSlug]/integrations/web-forms.js) + [WebFormBuilder/](file:///c:/Users/Usuário/Documents/novo/nextacular/src/components/WebFormBuilder)

- **Form Builder visual** para criar formulários de captura de leads
- **Página pública** — Cada formulário gera uma URL pública que pode ser compartilhada ou embutida em sites
- Dados dos formulários entram diretamente como contatos/leads no CRM
- **Relevância:** Substitui ferramentas como Typeform/Google Forms para captura de leads nativa. O lead já entra direto no pipeline.

---

## 12. 📝 Templates de Mensagens

**Localização:** [templates.js](file:///c:/Users/Usuário/Documents/novo/nextacular/src/pages/account/[workspaceSlug]/settings/templates.js)

### O que faz:
- **Templates reutilizáveis** com variáveis dinâmicas (nome do contato, empresa, negócio, atendente)
- **Pastas e organização** — Templates por categoria
- **Busca e filtro** por idioma
- **Duplicação** — Criar variações rapidamente

### Por que é relevante:
Padroniza a comunicação da equipe e **reduz em 80% o tempo de digitação** de respostas comuns. Garante que todos vendam e atendam com o mesmo tom profissional.

---

## 13. 🎛️ Custom Fields (Campos Personalizados)

**Localização:** [custom-fields.js](file:///c:/Users/Usuário/Documents/novo/nextacular/src/pages/account/[workspaceSlug]/settings/custom-fields.js)

### O que faz:
- **Tipos de campo suportados:** Texto, Data, Select, Checkbox, Multi-select, Moeda, URL, Telefone
- **Validação e obrigatoriedade** — Definir quais campos são obrigatórios
- Armazenamento via JSONB para flexibilidade máxima

### Por que é relevante:
Cada nicho tem dados específicos. Uma imobiliária precisa de "Tipo do Imóvel" e "Metragem"; uma clínica precisa de "Convênio" e "Alergias". Custom Fields permitem que o CRM **se adapte ao negócio** sem programação.

---

## 14. 🎯 Presets por Nicho (1-Click Setup)

**Localização:** [presets.js](file:///c:/Users/Usuário/Documents/novo/nextacular/src/pages/api/workspace/[workspaceSlug]/presets.js)

### O que faz:
- **Configuração instantânea** baseada no segmento do cliente (Imobiliária, Clínica, Agência, Assistência Técnica, Restaurante, etc.)
- Cria automaticamente: pipelines com estágios adequados, campos personalizados, templates de mensagem e automações
- **Onboarding "1-click"** — O cliente novo escolhe seu nicho e o CRM se auto-configura

### Por que é relevante:
Resolve o **maior problema de CRMs genéricos: o setup inicial**. Em vez de gastar horas configurando, o cliente começa a usar em minutos com todas as configurações adequadas ao seu tipo de negócio. Reduz churn no onboarding.

---

## 15. 💳 Pagamentos Internos & Produtos

**Localização:** [payments/](file:///c:/Users/Usuário/Documents/novo/nextacular/src/pages/account/[workspaceSlug]/settings/payments.js) + [payment-products.js](file:///c:/Users/Usuário/Documents/novo/nextacular/src/pages/account/[workspaceSlug]/settings/payment-products.js)

### O que faz:
- **O cliente pode vender dentro do CRM** — Cadastrar produtos, gerar links de pagamento e cobranças
- Integração com gateways (Asaas, MercadoPago, Pagar.me)
- **Marketplace fee / Split** — A plataforma pode cobrar uma comissão (fee) sobre as vendas do cliente
- **Painel de pagamentos** — Status de cada cobrança (pago, pendente, atrasado)

### Por que é relevante:
Transforma o Vysify em uma **ferramenta all-in-one** — o cliente não precisa de outra plataforma para cobrar. A fee automática cria uma **fonte de receita variável** para o SaaS (quanto mais o cliente vende, mais a plataforma ganha).

---

## 16. 💬 Chat Interno (Equipe)

**Localização:** [chat/](file:///c:/Users/Usuário/Documents/novo/nextacular/src/pages/account/[workspaceSlug]/chat) + [internal-chat/](file:///c:/Users/Usuário/Documents/novo/nextacular/src/pages/api/workspace/[workspaceSlug]/internal-chat)

### O que faz:
- **Mensagens diretas (DM)** entre membros da equipe
- **Canais/Groups** — Canais de comunicação interna por tópico ou departamento
- Notificações internas

### Por que é relevante:
O time comercial precisa se comunicar internamente sem sair do CRM. Em vez de usar WhatsApp pessoal (onde contexto se perde), o chat interno mantém a comunicação **registrada e organizada** dentro do workspace.

---

## 17. 🎫 Assinaturas SaaS & Billing (Stripe)

**Localização:** [billing.js](file:///c:/Users/Usuário/Documents/novo/nextacular/src/pages/account/billing.js) + [payment.js](file:///c:/Users/Usuário/Documents/novo/nextacular/src/pages/account/payment.js)

### O que faz:
- **Assinaturas via Stripe** — Checkout, upgrade, downgrade, cancelamento
- **Grace period (30 dias)** em downgrades — Usuário mantém acesso ao plano superior até o fim do ciclo
- **Billing Portal** — Portal Stripe nativo para o cliente gerenciar cartão, faturas e assinatura
- **Planos com limites** — Membros, webhooks, automações, IA, storage, WhatsApp
- **Cobrança por excedente (Overage)** — Se a cota de IA acabar, o sistema cobra automaticamente via Stripe
- **Nota Fiscal** — Emissão automática de NFS-e via Focus NFE ao pagamento

### Por que é relevante:
Todo o modelo de monetização funciona praticamente sozinho. **Receita recorrente automatizada**, sem intervenção manual para cobrar, cortar acesso ou emitir nota fiscal.

---

## 18. 🛡️ Segurança & LGPD

**Localização:** [security.js](file:///c:/Users/Usuário/Documents/novo/nextacular/src/pages/account/security.js) + [privacy/](file:///c:/Users/Usuário/Documents/novo/nextacular/src/pages/api/workspace/[workspaceSlug]/privacy)

### O que faz:
- **Multi-tenant rigoroso** — Isolamento total por `workspaceId` em todas as queries
- **Trilha de auditoria** — Todas as ações sensíveis (admin, billing, exclusões) são logadas
- **Exportação de dados (LGPD)** — Endpoint `/privacy/export` exporta todos os dados do workspace
- **Remoção de dados (Direito ao Esquecimento)** — Endpoint `/privacy/erase` remove dados permanentemente
- **Termos de uso & Política de Privacidade** — Páginas públicas em `/terms` e `/privacy` com aceite obrigatório
- **Cookie Consent** — Modal configurável pelo cliente seguindo LGPD
- **Rate Limiting distribuído** — Proteção contra abuso (via Postgres, independente de memória serverless)
- **Criptografia de credenciais** — Chaves de API, segredos e configs criptografados com `CONFIG_ENCRYPTION_KEY`

### Por que é relevante:
Em 2026, **conformidade com LGPD não é opcional** — é exigência legal. Seus clientes precisam saber que os dados dos clientes deles estão seguros e que podem exercer direitos de exportação/remoção. A auditoria protege contra ações indevidas de membros da equipe.

---

## 19. 🔔 Notificações & PWA (Mobile)

**Localização:** [notifications/](file:///c:/Users/Usuário/Documents/novo/nextacular/src/pages/api/notifications)

### O que faz:
- **PWA (Progressive Web App)** — O CRM pode ser "instalado" no celular como um app nativo
- **Push Notifications** — Alertas para mensagens recebidas, tarefas vencendo, deals movidos
- **Interface mobile-otimizada** — Dashboard, Tasks, Inbox e Pipeline adaptados para celular

### Por que é relevante:
Vendedores de PMEs não ficam sentados no computador. Eles estão em reuniões, visitas, eventos. Ter o CRM **no bolso com notificações em tempo real** é a diferença entre perder e ganhar um negócio.

---

## 20. 👑 Super Admin (Platform Owner Panel)

**Localização:** [admin/](file:///c:/Users/Usuário/Documents/novo/nextacular/src/pages/admin)

### O que faz:
- **Dashboard Admin** — Estatísticas globais de workspaces, usuários, planos ativos, receita
- **Gerenciamento de Planos** — Criar/editar planos SaaS com preço mensal, anual, limites e features (tela dinâmica com ~31k LOC)
- **System Config** — Painel visual para configurar OpenAI, Google OAuth, Stripe, AWS S3, domínios Vercel — tudo criptografado (~58k LOC)
- **Gerenciamento de Usuários** — Visualizar, pesquisar e gerenciar todos os usuários da plataforma
- **Gerenciamento de Workspaces** — Visualizar e inspecionar todos os workspaces
- **Masquerade (Impersonation)** — Logar como qualquer usuário para suporte, com trilha de auditoria
- **System Health** — Monitoramento de status do banco de dados, uptime e performance
- **Finance** — Revenue dashboard, configuração de provedores de pagamento, cupons, payment settings por workspace
- **AI Config** — Configuração de IA (modelos, tokens, quotas) pelo painel

### Por que é relevante:
Esse é o **seu painel como dono da plataforma**. Permite operar o SaaS inteiro sem tocar em código: ajustar preços, resolver tickets de suporte (logando como cliente), monitorar saúde do sistema e configurar integrações — tudo por interface visual.

---

## 21. 🎪 Demo Interativa & Landing Page

**Localização:** [demo.js](file:///c:/Users/Usuário/Documents/novo/nextacular/src/pages/demo.js) + [index.js](file:///c:/Users/Usuário/Documents/novo/nextacular/src/pages/index.js)

### O que faz:
- **Demo Interativa** — Página pública com Kanban funcional (drag-and-drop) usando dados fictícios, sem necessidade de registro
- CTA inteligente que aparece após 15 segundos para converter visitantes
- **Landing Page Cinematográfica** — Hero com animações, Features showcase, Testimonials, FAQ, Pricing dinâmico, Stats
- **Pricing Dinâmico** — Preços se atualizam em tempo real conforme configuração do Super Admin (com toggle mensal/anual e % de desconto)
- **i18n** — Tradução completa para múltiplos idiomas (PT-BR/EN) com `react-i18next`

### Por que é relevante:
A Demo permite que o potencial cliente **experimente o produto antes de se cadastrar**, aumentando a taxa de conversão. O Pricing dinâmico elimina retrabalho — você muda o preço no painel admin e a landing atualiza imediatamente.

---

## 22. 📝 Roteamento Inteligente & SLA (Inbox)

### O que faz:
- **Regras de atribuição automática** — Por origem, palavra-chave, região, horário, carga de trabalho
- **Round-Robin** — Distribuição equitativa de conversas entre a equipe
- **Escalonamento automático** — Se SLA é violado (ex: >5min sem resposta), conversa sobe para supervisor
- **Alertas de SLA** — Notificações quando tempo de resposta está se aproximando do limite

### Por que é relevante:
Garante que **nenhuma conversa fique abandonada** e que a carga de trabalho seja distribuída de forma justa. O SLA cria compromisso profissional com o tempo de atendimento — algo que diferencia PMEs sérias de amadoras.

---

## 23. 📚 Help Center (Central de Ajuda)

**Localização:** [HelpModal.js](file:///c:/Users/Usuário/Documents/novo/nextacular/src/sections/help/HelpModal.js)

### O que faz:
- **Modal de ajuda in-app** (~51k LOC) com tutoriais passo a passo para todas as features
- Tutoriais para: Custom Fields, Automações, Templates, Presets, Webhooks, AI Pipeline Insights, AI Conversation Summaries, NPS
- Interface navegável com busca

### Por que é relevante:
Reduz tickets de suporte drasticamente. O cliente encontra respostas **sem sair do sistema**, o que aumenta a autonomia e reduz o custo operacional de suporte.

---

## 24. 🌐 Domínio Personalizado

**Localização:** [domain.js](file:///c:/Users/Usuário/Documents/novo/nextacular/src/pages/account/[workspaceSlug]/settings/domain.js)

### O que faz:
- **White-label parcial** — O workspace pode configurar um domínio personalizado
- Integração com Vercel para mapeamento automático de domínios

### Por que é relevante:
Para clientes que querem que seus clientes acessem o CRM com seu próprio domínio (ex: `crm.minhaempresa.com.br`), reforçando a identidade da marca.

---

## 25. 🏁 Onboarding Guiado

**Localização:** [OnboardingTour/](file:///c:/Users/Usuário/Documents/novo/nextacular/src/components/Onboarding)

### O que faz:
- **Tour interativo** com tooltips guiados (driver.js style) para novos usuários
- Steps contextuais por página (Dashboard, Pipeline, Inbox, etc.)
- Marca como completo para não repetir

### Por que é relevante:
O primeiro uso é decisivo para retenção. Um tour bem feito garante que o cliente **entenda o valor do produto** rapidamente, reduzindo churn nos primeiros 7 dias.

---

## Resumo Executivo

| Categoria | Features | Impacto |
|---|---|---|
| **Core CRM** | Contatos, Empresas, Pipeline, Deals | Base da operação comercial |
| **Comunicação** | Inbox, WhatsApp, Email, Instagram, Chat Interno | Centralização omnichannel |
| **Produtividade** | Tarefas, Templates, Custom Fields, Presets | Redução de trabalho manual |
| **Inteligência** | IA (respostas, resumos, insights), Analytics, NPS | Decisões baseadas em dados |
| **Automação** | Workflows, Webhooks, Zapier, SLA/Roteamento | Operação autônoma |
| **Captura** | Web Forms, Lead Gen automático | Alimentação do funil |
| **Monetização** | Stripe, Pagamentos internos, NFS-e, Overage | Receita automatizada |
| **Plataforma** | Super Admin, Multi-tenant, LGPD, Security | Operação SaaS robusta |
| **Experiência** | Demo, Landing Page, PWA, i18n, Onboarding | Conversão e retenção |

> **A Vysify não é apenas um CRM — é uma plataforma comercial completa que permite que PMEs vendam, atendam e acompanhem clientes sem depender de planilhas, múltiplas ferramentas ou desenvolvedores.**
