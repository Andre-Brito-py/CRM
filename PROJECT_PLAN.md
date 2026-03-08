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
    - [ ] **Histórico de Atividades:** Timeline com mensagens, notas, chamadas e tarefas para cada contato.
    - [ ] **Tags:** Sistema de tags para segmentação.
    - [ ] **Campos Personalizados:** Custom fields para adaptar o CRM.
    - [ ] **Importação:** Importação de contatos via CSV.
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
    - [ ] Atribuição de conversas para membros da equipe.
    - [x] Status de conversa (Aberta, Resolvida, Pendente).
    - [x] Histórico completo de mensagens.
- **Integração WhatsApp:**
    - [ ] Integração com API (Meta/Twilio).
    - [ ] Envio e recebimento de mensagens diretamente no CRM.
    - [ ] **Lead Gen:** Criação automática de leads quando um novo número envia mensagem.
    - [ ] Associação automática de conversas a contatos existentes.
    - [ ] Templates de mensagens reutilizáveis.
    - [ ] Envio de mensagens automáticas baseadas em eventos.

### 4. Automation & Workflows 🚧
*Automação de vendas baseada em regras.*
- **Workflows:**
    - [ ] Sistema de Regras e Gatilhos.
    - [ ] **Ações Automáticas:**
        - Quando um negócio muda de estágio → enviar mensagem.
        - Quando um cliente não responde em X dias → enviar follow-up.
        - Quando um novo lead é criado → atribuir automaticamente a um vendedor.
- **Tasks & Reminders:**
    - [ ] Sistema de tarefas (Título, Data de vencimento, Responsável, Status).
    - [ ] Lembretes automáticos.

### 5. Artificial Intelligence (IA) 🚧
*Funcionalidades para aumentar produtividade.*
- **Assistente de Resposta:**
    - [ ] Geração automática de respostas para clientes.
    - [ ] Sugestões de respostas baseadas no histórico da conversa.
- **Vendas Inteligentes:**
    - [ ] Geração de mensagens de follow-up.
    - [ ] Análise de pipeline de vendas com insights automáticos.
    - [ ] Recomendações de próximos passos para vendedores.

### 6. Analytics & Reports 🚧
*Módulo de inteligência de dados.*
- [ ] Relatórios de vendas.
- [ ] Desempenho de vendedores.
- [ ] Conversão por estágio do pipeline.
- [ ] Origem de leads.
- [ ] Tempo médio de fechamento.

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
    - [ ] Google Calendar.
    - [ ] Gmail.
    - [ ] Webhooks.
    - [ ] Zapier.
    - [ ] APIs públicas.

### 8. Experiência Mobile 🚧
*Acesso em qualquer lugar.*
- [ ] Transformar o sistema em PWA.
- [ ] Otimizar interface para uso em celular.
- [ ] Notificações push para mensagens e tarefas.

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
