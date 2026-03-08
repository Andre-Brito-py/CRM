# Planejamento de Desenvolvimento: CRM SaaS com IA e WhatsApp

Este documento descreve o roteiro técnico e funcional para o **Nextacular CRM**, um sistema SaaS Multi-tenant para gestão de clientes, vendas e atendimento omnichannel.

## 🎯 Visão Geral
O objetivo é criar um sistema onde cada "Workspace" é uma empresa que gerencia seus clientes, funis de vendas e atendimentos via WhatsApp em uma única plataforma inteligente.

## 🛠️ Stack Tecnológica Base
- **Frontend:** Next.js (React), Tailwind CSS, Headless UI
- **Backend:** Next.js API Routes (Serverless functions)
- **Database:** PostgreSQL (via Prisma ORM)
- **Auth:** NextAuth.js
- **Pagamentos:** Stripe
- **IA:** OpenAI API (ou similar)
- **Mensageria:** WhatsApp Business API (via Meta Cloud API ou Twilio)

---

## �️ Estrutura de Módulos e Funcionalidades

### 1. Dashboard ✅
*Visão centralizada de métricas e performance.*
- [x] **Sales Dashboard:**
    - Leads totais, Negócios abertos.
    - Taxa de conversão, Receita do pipeline.
    - Vendas mensais.
    - Gráficos visuais de vendas e funil.
- [x] **Activity Feed:** Resumo de atividades recentes.

### 2. CRM (Contacts, Companies, Deals, Pipeline) ✅
*Núcleo de gestão de relacionamento.*
- **Contatos e Empresas:**
    - ✅ Modelagem de Dados (Contact, Company).
    - ✅ Listagem com filtros e busca (`/contacts`, `/companies`).
    - ✅ Formulários de Criação (Modais).
    - ✅ **Histórico de Atividades:** Timeline com mensagens, notas, chamadas e tarefas para cada contato.
    - ✅ **Tags:** Sistema de tags para segmentação.
    - ✅ **Campos Personalizados:** Custom fields dinâmicos (Texto, Data, Select) armazenados via JSONB para flexibilidade No-Code.
    - ✅ **Importação:** Importação de contatos via CSV.
- **Pipeline de Vendas:**
    - ✅ Modelagem (Pipeline, Stage, Deal).
    - ✅ Interface Kanban Drag-and-Drop.
    - ✅ Criação e edição de Negócios via API.
    - ✅ Persistência de estágios (Optimistic UI).

### 3. Inbox & WhatsApp (Omnichannel) 🚧
*Gerenciamento centralizado de conversas.*
- **Inbox Unificado:**
    - [x] Interface estilo Helpdesk.
    - [x] Visualização de conversas por contato.
    - [x] Atribuição de conversas para membros da equipe.
    - [x] Status de conversa (Aberta, Resolvida, Pendente).
    - [x] Histórico completo de mensagens.
- **Integração WhatsApp:**
    - [x] Integração com API (Meta Cloud API).
    - [x] Envio e recebimento de mensagens diretamente no CRM.
    - [x] **Lead Gen:** Criação automática de leads quando um novo número envia mensagem.
    - [x] Associação automática de conversas a contatos existentes.
    - [x] Templates de mensagens reutilizáveis.
    - [x] Envio de mensagens automáticas baseadas em eventos.

### 4. Automation & Workflows 🚧
*Automação de vendas baseada em regras.*
- **Workflows:**
    - [x] Sistema de Regras e Gatilhos (Deal Stage, Incoming Message).
    - [x] **Ações Automáticas:**
        - [x] Quando um negócio muda de estágio → enviar mensagem ou atribuir usuário.
        - [x] Quando chega mensagem com palavra-chave → enviar mensagem ou atribuir.
        - [x] Quando um cliente não responde em X dias → enviar follow-up.
- **Tasks & Reminders:**
    - [x] Sistema de tarefas (Título, Data de vencimento, Responsável, Status).
    - [x] Associação de tarefas a Contatos e Negócios.
    - [x] Lembretes automáticos (via UI de Dashboard).

### 5. Artificial Intelligence (IA) 🚧
*Funcionalidades para aumentar produtividade.*
- **Assistente de Resposta:**
    - [x] Geração automática de respostas para clientes (Mock implementado).
    - [x] Sugestões de respostas baseadas no histórico da conversa.
- **Vendas Inteligentes:**
    - [x] Geração de mensagens de follow-up.
    - [x] Análise de pipeline de vendas com insights automáticos.
    - [x] Recomendações de próximos passos para vendedores.

### 6. Analytics & Reports ✅
*Módulo de inteligência de dados.*
- [x] Relatórios de vendas (Sales Trend - Gráfico de barras).
- [x] Desempenho de vendedores (Sales by User & Task Completion).
- [x] Funnel de Vendas (Deals by Stage).
- [x] Exportação de Relatórios (CSV).
- [x] Origem de leads.
- [x] Tempo médio de fechamento.

### 7. Settings & Team ✅
*Configurações administrativas.*
- **Geral:**
    - ✅ Configurações de Perfil e Workspace.
    - ✅ Seleção de Idioma (i18n).
- **Equipe:**
    - ✅ Convite de membros e gestão de equipe.
- **Faturamento:**
    - ✅ Integração com Stripe (Assinaturas).
- **Integrações Externas:**
    - [x] Webhooks (Eventos de sistema).
    - [x] Gmail (UI Pronta).
    - [x] Google Calendar (UI pronta).
    - [x] Zapier (UI pronta).
    - [x] WhatsApp (Cloud API).

### 8. Experiência Mobile ✅
*Acesso em qualquer lugar.*
- [x] Transformar o sistema em PWA (next-pwa configurado).
- [x] Otimizar interface para uso em celular (Dashboard, Tasks, Inbox, Pipeline).
- [x] Notificações push para mensagens e tarefas.

### 9. Super Admin (Platform Owner) ✅
*Controle total da plataforma SaaS.*
- [x] **Dashboard Admin:** Visão geral de todos os workspaces, usuários e planos (Stats).
- [x] **Gerenciamento de Usuários:** Listagem e visualização de todos os usuários da plataforma.
- [x] **Gerenciamento de Workspaces:** Listagem e visualização de todos os workspaces.
- [x] **Gerenciamento de Planos:** Criar/Editar planos de assinatura (SaaS) com integração dinâmica.
- [x] **Masquerade:** Logar como qualquer usuário para suporte.
- [x] **System Health:** Monitoramento de status do banco de dados, uptime e performance.

---

## 📅 Histórico de Implementação (Roadmap Original)

### Fase 1: Fundação e Modelagem de Dados (Core CRM) ✅
- ✅ Modelagem de Dados (Schema Prisma): Contact, Company, Pipeline, Stage, Deal, Activity.
- ✅ API Services CRUD.

### Fase 2: Gestão de Contatos e Empresas ✅
- ✅ UI de Listagem e Filtros.
- ✅ Modais de Criação (Contatos/Empresas).
- ✅ Validação e Feedback.

### Fase 3: Pipeline de Vendas (Drag-and-Drop) ✅
- ✅ Interface Kanban (`@hello-pangea/dnd`).
- ✅ Gestão de Deals e Colunas Dinâmicas.
- ✅ Lógica de Persistência e Optimistic UI.
