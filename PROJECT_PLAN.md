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

## ✅ Objetivo Comercial (Prontidão para 500 clientes)
Meta: deixar a plataforma pronta para operar com **~500 clientes pagantes** com estabilidade, segurança e suporte.

O que isso significa na prática:
- **Confiabilidade:** o sistema precisa continuar funcional sob picos, falhas parciais e retries de integrações.
- **Observabilidade:** ter visibilidade real de erros, latência, filas/jobs, webhooks e pagamentos (com alertas).
- **Segurança:** proteger endpoints públicos (auth/webhooks/cron), segredos e dados multi-tenant.
- **Operação:** deploy, rollback, backups, migrações e runbooks para incidentes.
- **Compliance básico (LGPD):** trilha de auditoria, políticas de retenção e mecanismos de exportação/remoção.

### Requisitos mínimos antes de vender em escala (500 clientes)

### Fase 1 (Base de Produção) — primeira entrega para escalar com segurança
Objetivo: criar os fundamentos técnicos para operar em produção com previsibilidade (logs, erros, CI, segurança de endpoints e rotinas operacionais).

- [ ] Padronizar logs server-side em JSON (níveis, request-id, mascaramento de dados sensíveis).
- [ ] Adicionar request-id em todas as rotas API e incluir em logs/respostas de erro.
- [ ] Capturar exceções e eventos críticos com alertas (auth, billing, webhooks, jobs).
- [ ] Definir ambientes e rotina de deploy/rollback (staging/prod) com checks automáticos.
- [ ] Criar testes smoke/E2E mínimos para fluxos críticos e rodar no CI.
- [ ] Proteger endpoints públicos críticos com rate limit, limites de payload e validações.
- [ ] Definir rotina de backups e testar restore (processo + evidência).

#### 1) Observabilidade & Operação
- [ ] Padronizar logs server-side (níveis, request-id/correlation-id, mascaramento de dados sensíveis).
- [ ] Capturar exceções e eventos críticos (auth, billing, webhooks, jobs, integrações) com alertas.
- [ ] Métricas e dashboards mínimos: taxa de erro, latência, webhooks falhando, jobs atrasados, pagamentos inconsistentes.
- [ ] Playbooks: como investigar falha de webhook, falha de pagamento, falha de envio WhatsApp, queda de DB.

#### 2) Testes & CI/CD
- [ ] Testes smoke/E2E para fluxos críticos (login, criação de workspace, inbox, billing, webhooks).
- [ ] Testes de contrato/parsing de webhooks de pagamento (por provider).
- [ ] Pipeline de CI bloqueando deploy/merge quando lint/build/test falhar.
- [ ] Ambientes por estágio (dev/staging/prod) e deploy com rollback.

#### 3) Rate limit, abuso e proteção de endpoints
- [ ] Rate limit distribuído (não em memória) para suportar múltiplas instâncias.
- [ ] Proteções nos endpoints mais críticos: `/api/auth/*`, webhooks públicos, upload, endpoints de IA.
- [ ] Timeouts e limites de payload; validação rigorosa de assinatura nos webhooks.
- [ ] Estratégias anti-spam/bot (principalmente em auth e endpoints públicos).

#### 4) Jobs/Cron, filas e resiliência
- [ ] Tornar jobs e rotas de cron idempotentes (rodar duas vezes não duplica ação/cobrança).
- [ ] Locks/concorrência para evitar corrida em múltiplas instâncias.
- [ ] Retries com backoff e dead-letter (ou tabela de falhas) para integrações externas.
- [ ] Observabilidade de jobs: status, duração, falhas, reprocessamento seguro.

#### 5) Billing & “edge cases” de assinatura/pagamento
- [ ] Cobrir casos: upgrade/downgrade, cancelamento, falha de pagamento, reativação, mudança de plano, limites por plano.
- [ ] Reconciliação via webhook (fonte de verdade) e ferramentas internas de suporte para correção.
- [ ] Idempotência e proteção contra eventos duplicados (webhook reentregue).

#### 6) Auditoria, LGPD e segurança de dados
- [ ] Trilhas de auditoria para ações sensíveis (Super Admin, billing, integrações, convites, permissões, exclusões).
- [ ] Exportação/remoção de dados por workspace (e política de retenção).
- [ ] Garantir isolamento multi-tenant consistente em todas as rotas (workspaceId sempre filtrando).

#### 7) Performance de banco e escalabilidade
- [ ] Índices e queries revisadas nas áreas críticas: inbox, deals/pipeline, automações, webhooks deliveries.
- [ ] Estratégia de paginação e limites de listagens (evitar consultas pesadas).
- [ ] Cache onde fizer sentido (config pública, settings, contagens).
- [ ] Estratégia de backups, restore testado e migrações seguras (Prisma).

#### 8) Suporte e operação comercial
- [ ] Rotina de incidentes e SLA interno (tempo de resposta, prioridade, escalonamento).
- [ ] Ferramentas de suporte: masquerade com audit, reprocessar webhook/job, inspecionar estado de pagamentos.
- [ ] Migração/onboarding: importação, templates/presets, guias e checklist para clientes.

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

## ✅ O que eu preciso que você me passe (para executar a preparação para 500 clientes)
Para eu implementar isso com o mínimo de suposições e retrabalho, eu preciso destas decisões/dados:

### Infra & Deploy
- Onde vai rodar: Vercel / VPS / Docker / Kubernetes.
- Estratégia de ambientes: staging e produção separados? Domínios e certificados.
- Observabilidade escolhida: Sentry / OpenTelemetry + collector / outra.

### Banco & dados
- Postgres gerenciado (qual fornecedor) e tamanho esperado (contatos/mensagens por cliente).
- Política de backup: frequência, retenção e teste de restore.

### Cache / Rate limit / filas
- Redis/Upstash (ou equivalente) para rate limit e locks.
- Se vamos introduzir fila (ex.: BullMQ/Cloud queue) para webhooks/jobs, ou manter via DB com worker.

### Pagamentos
- Gateway principal para o SaaS (assinatura da plataforma) e o que você vai oferecer primeiro.
- Regras de planos: limites por plano (usuarios, conversas, mensagens, webhooks, automações, storage).

### WhatsApp & limites de uso
- Provedor (Meta Cloud API/Twilio) e volume estimado de mensagens.
- Regras de template/aprovação e estratégia de throttling (limite por workspace).

### Segurança & compliance
- Nível de LGPD desejado no curto prazo (básico vs mais rigoroso).
- Exigências contratuais: auditoria, retenção, exportação, remoção, logs.

### Produto & suporte
- Vertical inicial (imobiliária/clínica/agência etc.) para priorizar o MVP comercial.
- Modelo de suporte: horário, SLA, canal, e quem responde.

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
