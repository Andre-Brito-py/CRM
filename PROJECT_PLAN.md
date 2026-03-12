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
    - [x] Envio ativo de mensagens (Outbound) via Interface do CRM.
    - [x] Recebimento de mensagens (Inbound webhook).
    - [x] **Lead Gen:** Criação automática de leads quando um novo número envia mensagem.
    - [x] Associação automática de conversas a contatos existentes.
    - [x] Templates de mensagens reutilizáveis.
    - [x] Envio de mensagens automáticas baseadas em eventos.

### 4. Automation & Workflows 🚧
*Automação de vendas baseada em regras.*
- **Workflows:**
    - [x] Sistema de Regras e Gatilhos no Backend (Deal Stage, Incoming Message, Inatividade).
    - [x] Interface básica para criação e gestão de Automações.
    - **Ações Automáticas:**
        - [x] Quando um negócio muda de estágio → enviar mensagem ou atribuir usuário.
        - [x] Quando chega mensagem com palavra-chave → enviar mensagem ou atribuir.
        - [x] Quando um cliente não responde em X dias → enviar follow-up.
- **Tasks & Reminders:**
    - [x] Sistema de tarefas (Título, Data de vencimento, Responsável, Status).
    - [x] Associação de tarefas a Contatos e Negócios.
    - [x] Lembretes automáticos (via UI de Dashboard).

### 5. Artificial Intelligence (IA) 🚧
*Funcionalidades para aumentar produtividade.*
- **Integração Base:**
    - [x] Conectar API da OpenAI via System Config.
- **Assistente de Resposta:**
    - [x] Geração dinâmica de sugestões de resposta para clientes no Inbox.
    - [ ] Resumo inteligente de histório de conversas.
- **Vendas Inteligentes:**
    - [ ] Análise de pipeline de vendas com insights automáticos.
    - [ ] Recomendações de próximos passos para vendedores.

### 5.5 Premium Visual Overhaul & Gating 🚧
*Melhorias de design e paywall.*
- [ ] Implementar UI de paywall (bloqueio visual para usuários Free).
- [ ] Refinar as cores, bordas e sombras do layout para padrão "Premium SaaS" moderno (glassmorphism flexível, gradientes curados, melhor grid no Dashboard).
- [ ] Refinar micro-interações e motion no sistema.

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
    - [x] API Keys (para integrações externas).
    - [x] Gmail (UI Pronta).
    - [x] Google Calendar (UI pronta).
    - [x] Zapier (UI pronta).
    - [x] WhatsApp (Cloud API).

### 7.1 Plataforma No-Code (Personalização para PMEs) 🚧
*Camada de personalização e automação para adaptar o CRM a diferentes negócios.*
- **Workflows v2 (Automação avançada):**
    - [x] Condições compostas (AND/OR).
    - [x] Filtros por tags/canal/horário.
    - [x] Múltiplas ações por regra e ações com atraso (wait/delay).
    - [x] Novas ações: criar tarefa, chamar webhook.
    - [x] Novas ações: mover estágio, aplicar tag.
    - [x] Auditoria e logs por execução de regra.
    - [x] Simulação/teste de regras com “explicação” do disparo.
- **Templates v2 (Mensagens):**
    - [x] Variáveis ampliadas (contato/empresa/negócio/atendente).
    - [x] Pastas, busca, templates por idioma e duplicação (versionamento simples via nome).
    - [ ] Assistência por IA para revisão/encurtamento do texto.
- **Custom Fields v2 (Dados):**
    - [x] Novos tipos (checkbox, multi-select, moeda, URL, telefone).
    - [x] Validação e obrigatoriedade.
    - [ ] Conjuntos de campos por área (vendas/suporte) e permissões.
- **Integrações v2 (Webhooks e API Keys):**
    - [x] Segredos assinados (HMAC) e rotação de segredos.
    - [x] Retentativas e painel de entregas (status, erros, histórico).
    - [x] Filtros por evento e opção de “enviar todos” (`*`).
- **Presets por segmento (1-click setup):**
    - [x] Pipelines + campos + templates + automações para nichos (imobiliária, clínica, agência, assistência técnica).
- **Roteamento e SLA (Inbox):**
    - [x] Regras de atribuição (por origin/palavra-chave/região/horário/carga).
    - [x] Escalonamento automático e alertas de SLA.

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

### Fase 4: Inbox, WhatsApp e Automations (Base) ✅
- ✅ Inbox com atribuição e status.
- ✅ Integração WhatsApp (inbound/outbound).
- ✅ Templates (CRUD) para mensagens.
- ✅ Automações (regras + execução) e UI básica.
- ✅ IA: sugestão de resposta no Inbox (endpoint).

### Fase 5: Plataforma No-Code (Evolução para PMEs) 🚧
- [ ] Alinhar schema Prisma aos modelos no-code (rules/templates/webhooks/api-keys/status/assignee).
- [ ] Workflows v2 (condições, delays, múltiplas ações, logs, simulação).
- [x] Templates v2 (variáveis ampliadas, pastas, versionamento simples via nome, idioma).
- [ ] Custom Fields v2 (novos tipos, validação por estágio, permissões).
- [ ] Integrações v2:
    - [x] HMAC e rotação de segredos.
    - [x] Filtros por evento e opção de “enviar todos” (`*`).
    - [x] Retentativas e painel de entregas (status, erros, histórico).
- [x] Presets por nicho e mini-apps internos para fluxos recorrentes.
