# Closify CRM

Plataforma CRM multi-tenant com foco em operação comercial e atendimento omnichannel (WhatsApp + Email), pipeline de vendas, automações e monetização por planos.

## O que eu estou construindo (em uma frase)
Um CRM omnichannel para vender, atender e acompanhar clientes sem virar refém de planilha.

## Por que isso existe
- Quero abrir um negócio com isso.
- Preciso de uma plataforma que eu controle (produto, dados e evolução).
- A meta é simples: resolver dor real com uma experiência sólida.

## Landing page (Marketing)
A landing page é a home pública (`/`) e serve como vitrine do produto (proposta de valor, features e preços).

Como ela é montada hoje:
- Página: `src/pages/index.js` (SSG com revalidate, buscando planos no banco para o bloco de preços)
- Layout: `LandingLayout`
- Seções: `src/sections/*` (`Hero`, `Features`, `Pricing`, `Testimonial`, `FAQ`, `CallToAction`, `Footer`)

Páginas públicas úteis:
- `/demo` (demonstração)
- `/auth/login` e `/auth/register`
- `/privacy` e `/terms`
- `/f/[slug]` (Form Builder público)

## Regras internas (pra eu não me sabotar)
- Nada de credenciais no código/repo.
- Tudo que for “admin master” tem que ser auditável e seguro.
- Tudo que for multi-tenant tem que filtrar por `workspaceId` sempre.
- Se uma feature não tiver métrica/uso, ela não existe (não investir tempo sem validar).
- Melhor pequeno e funcionando do que grande e incompleto.

## Como rodar local
Pré-requisitos: Node.js 18+, Postgres.

```bash
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Se a porta 3000 estiver ocupada, o Next sobe em outra (3001/3002…). Conferir o log do terminal.
Em dev, evite fixar `NEXTAUTH_URL` no `.env`, porque isso pode causar “tela branca” quando o Next mudar de porta automaticamente.

Se o Prisma reclamar de drift/migration em ambiente local, priorizar consistência do dev:

```bash
npx prisma db push
npx prisma db seed
```

## Variáveis de ambiente (lembrete)
Arquivo: `.env`

```env
DATABASE_URL="postgresql://..."
DATABASE_URL_POOLED="postgresql://..." # opcional: URL do pooler (PgBouncer/Neon/Supabase)
NEXTAUTH_SECRET="..."
GOOGLE_CLIENT_ID="..."        # opcional: Login com Google
GOOGLE_CLIENT_SECRET="..."    # opcional: Login com Google
EMAIL_FROM="..."
EMAIL_SERVICE="..."
EMAIL_SERVER_USER="..."
EMAIL_SERVER_PASSWORD="..."
PAYMENTS_SECRET_KEY="..."        # Stripe (assinaturas do SaaS)
STRIPE_WEBHOOK_SECRET="..."      # webhook de assinatura (Stripe)
ADMIN_EMAIL="..."

# Pagamentos do CRM (gateway configurável via Super Admin)
# (essas chaves ficam na tabela SystemConfig / PaymentProviderCredential, não precisam ficar no .env)
# ASAAS_API_KEY="..."
# MERCADOPAGO_ACCESS_TOKEN="..."
# PAGARME_SECRET_KEY="..."

# FinOps (custos unitários para estimativas por workspace)
# FINOPS_UNIT_COST_WHATSAPP_OUTBOUND="0.03"
# FINOPS_UNIT_COST_AI_REQUEST="0.01"
# FINOPS_UNIT_COST_UPLOAD_REQUEST="0.001"

# NFS-e (opcional)
# NFSE_ENABLED="false"
# FOCUS_NFE_API_KEY="..."
# FOCUS_NFE_ENVIRONMENT="homologacao"
# FOCUS_NFE_NFSE_ENDPOINT="nfsen"
# NFSE_CODIGO_TRIBUTACAO_NACIONAL_ISS="..."
# NFSE_CODIGO_NBS="..."
```

Produção:
- Definir `NEXTAUTH_URL` com a URL pública canônica (ex.: `https://app.seudominio.com`).

## Configuração de APIs (Super Admin)
As credenciais abaixo podem ser configuradas em runtime no painel de Super Admin (API Configuration), sem redeploy. O backend lê via `getSystemConfig(...)` com fallback para `process.env`.

Chaves comuns:
- IA: `OPENAI_API_KEY`
- Pagamentos da plataforma: `PAYMENTS_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY`
- Email: `EMAIL_FROM`, `EMAIL_SERVICE`, `EMAIL_SERVER_USER`, `EMAIL_SERVER_PASSWORD`
- Domínios (Vercel): `VERCEL_API_URL`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID`, `VERCEL_AUTH_BEARER_TOKEN`, `VERCEL_IP_ADDRESS`
- Storage (S3): `AWS_S3_ACCESS_KEY_ID`, `AWS_S3_SECRET_ACCESS_KEY`, `AWS_S3_REGION`, `AWS_S3_BUCKET_NAME`
- Web Push: `WEB_PUSH_EMAIL`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
- Zapier: `ZAPIER_ENABLED`, `ZAPIER_ALLOWED_HOSTS`
- Cron: `CRON_SECRET`
- Analytics: `GOOGLE_ANALYTICS_ID`
- Geral: `APP_URL`

Valores “public” expostos via `/api/public-config` (seguros para o browser):
- `STRIPE_PUBLISHABLE_KEY`, `GOOGLE_ANALYTICS_ID`, `VAPID_PUBLIC_KEY`, `VERCEL_IP_ADDRESS`
- Manutenção: `MAINTENANCE_ENABLED`, `MAINTENANCE_MESSAGE`, `MAINTENANCE_EXPECTED_AT`

## Zapier (integrações externas via Webhooks)
O Zapier no Closify é feito via **Webhooks + Automações**:
- O workspace cria um webhook apontando para um **Catch Hook** do Zapier.
- Uma automação dispara a ação **CALL_WEBHOOK**, que envia um POST JSON para todos os webhooks ativos que batem com o evento.

O que dá para fazer:
- Conectar o Closify a qualquer app suportado pelo Zapier (Google Sheets, Slack, Gmail, HubSpot, Trello, Notion, etc.) usando Zaps.
- Disparar integrações por evento do produto via automações (ex.: mudança de etapa, inbound WhatsApp, eventos de pagamento, NPS).
- Filtrar o que vai para o Zapier por:
  - evento do webhook (`*` para “todos” ou nomes específicos)
  - regras/condições do builder de automações (AND/OR e filtros por propriedades do evento)
- Pausar/reativar webhooks por workspace e acompanhar entregas (histórico + retentativas).
- Rotacionar o segredo do webhook (HMAC) quando precisar (segurança).

Administração (Super Admin):
- Habilitar/desabilitar Zapier na plataforma via `ZAPIER_ENABLED`.
- Restringir hosts permitidos via `ZAPIER_ALLOWED_HOSTS` (CSV, ex.: `hooks.zapier.com`).
- Monitorar e gerenciar webhooks Zapier em Admin → System (listar, pausar/ativar, rotacionar segredo).

Eventos (gatilhos) que podem disparar o Zapier hoje (via Automations):
- `DEAL_STAGE_CHANGED`
- `INCOMING_MESSAGE`
- `EMAIL_SENT`
- `PAYMENT_CREATED`
- `PAYMENT_PAID`
- `PAYMENT_FAILED`
- `NPS_RESPONSE_RECEIVED`
- `NPS_PROMOTER`
- `NPS_DETRACTOR`
- `SLA_BREACH`

Payload enviado:
```json
{
  "event": "NOME_DO_EVENTO",
  "workspaceId": "ws_...",
  "data": { "..." : "..." },
  "occurredAt": "2026-03-15T12:34:56.000Z"
}
```

Headers de assinatura (HMAC):
- `x-closify-event`: nome do evento
- `x-closify-timestamp`: unix timestamp (segundos)
- `x-closify-signature`: `sha256=<hex>` do HMAC-SHA256 usando o segredo do webhook e a mensagem `${timestamp}.${rawBody}`

## IA (cota + overage)
O uso de IA é controlado por:
- **Cota do plano (tokens/24h)**: limite diário por workspace (ex.: `aiTokens24h` no plano).
- **Overage opcional (tokens/24h)**: quando a cota do plano termina, o cliente pode continuar usando IA com cobrança extra (se habilitado).

Configurações do overage (Super Admin → Settings → IA):
- `AI_QUOTA_WARN_PERCENT` (ex.: `80`)
- `AI_OVERAGE_ENABLED` (`true/false`)
- `AI_OVERAGE_REQUIRE_OPTIN` (`true/false`)
- `AI_OVERAGE_PRICE_PER_1M_TOKENS` (ex.: `4.00`)
- `AI_OVERAGE_MAX_TOKENS_24H` (ex.: `200000`)

Comportamento:
- Quando a API retorna `LIMIT_REACHED` com `overage.enabled=true`, a UI pode pedir confirmação e reenviar a chamada com header `x-ai-overage: true`.
- Em overage, é criado um `invoice_item` no Stripe do cliente (customer do workspace owner) com o valor proporcional ao total de tokens retornado pelo provedor.

Auditoria e acompanhamento (Super Admin):
- Eventos de uso de IA ficam persistidos em `AiUsageEvent` (tokens, rota, modelo e dados de cobrança quando houver).
- Painel de consumo: `/admin/ai/usage` (gráficos por dia e rankings por workspace/rota/modelo).

## Coisas que já estão no produto (resumo curto)
- Workspaces (multi-tenant)
- Deals + pipeline kanban
- Contatos/empresas + atividades
- Inbox omnichannel (WhatsApp + Email)
- Login (magic link + senha) + 2FA + Google (opcional)
- Inbox: resumo de conversa com IA (sob demanda)
- Inbox (Email): sugestão de resposta com IA
- Automações: gatilho `EMAIL_SENT` (envio de email pelo inbox)
- Paywall por plano e painel de super admin
- Assentos por plano (membros aceitos) + limite de convites pendentes (anti-spam)
- Customer Satisfaction (NPS): páginas + gráficos com animação
- Sistema de pagamentos do CRM (multi-gateway) + webhooks
- Monetização por taxa da plataforma (split/fee quando disponível)
- Notificações in-app (web push + bell icon) com opção no-code de envio via automações
- Cupons e promoções (Stripe) gerenciados pelo Super Admin
- Limites dinâmicos por plano (IA, automações, membros) com enforcement real
- Tours de onboarding interativos por tela (com persistência "apenas uma vez")
- Aviso global “Sistema em manutenção” configurável no Super Admin (com previsão de retorno)
- Formulários Web (Form Builder): criação de formulários públicos para captura de leads com mapeamento dinâmico de campos.
- Refino Estético: substituição de emojis por ícones vetoriais (Heroicons) em todo o Help Center.
- Exportação CSV (CRM): Contatos e Deals por workspace + export administrativo (Super Admin).

## Fase 6 (Auditoria, LGPD e segurança de dados) — o que mudou
- **Trilha de auditoria (ações sensíveis):** registro de eventos com metadados de request (ip, user-agent, rota, método) em `Activity` via `AUDIT_*`.
- **Ações auditadas:** super admin (configs/planos/reconciliação), webhooks (criar/rotacionar/deletar segredo), API keys (criar/deletar), integrações (WhatsApp), convites e alterações de workspace (slug/nome/delete).
- **LGPD por workspace:** endpoints para exportação e remoção.
  - Export: `GET /api/workspace/:workspaceSlug/privacy/export`
  - Erase: `POST /api/workspace/:workspaceSlug/privacy/erase`
- **Hardening multi-tenant:** rotas críticas passaram a checar permissão + filtrar por `workspaceId` (incluindo endpoints de IA como resumo de conversa e insights de pipeline).

## Fase 8 (Suporte e operação comercial) — o que mudou
- **Masquerade auditável:** iniciar/parar impersonação com trilha de auditoria.
- **Operação (SUPERADMIN):** botões no Admin → System para reprocessar entregas de webhook e jobs de automação “due”.
- **Reconciliação de pagamentos:** UI no Admin → Payments para inspeção/ação rápida quando o gateway divergir do estado interno.
- **Incidentes e SLA interno:** registro de incidentes (P0–P3) com prazos de resposta/resolução, ack e resolução, direto no Admin → System.
- **Onboarding/migração:** checklist operacional e atalhos por workspace (presets, importação, integrações, templates).

## Fase 9 (Go-live comercial “vendível”) — o que mudou
- **Limites por plano aplicados:** convites/membros, webhooks, automações, IA (quota + rate limit) e upload/storage.
- **Assentos (usuários) por plano (comportamento comercial):**
  - O que conta como “usuário”: `Member` com `status=ACCEPTED` no workspace (assento ativo).
  - Convites pendentes (`status=PENDING`) não consomem assento, mas têm limite próprio por plano (anti-spam).
  - Enforcement:
    - convidar: valida `maxUsers` (assentos) e `maxPendingInvites` (pendentes)
    - aceitar/entrar via link: valida `maxUsers` antes de virar `ACCEPTED`
  - Administração (Super Admin → Plans): `features.maxUsers` e `features.maxPendingInvites` são editáveis por plano. Valor `0` significa ilimitado.
- **Rate limit distribuído:** contador em Postgres (`rate_limit_counters`) para não depender de memória do node em produção.
- **Observabilidade:** healthcheck administrativo com `status`, `alerts` e `thresholds` (retorna 503 quando degradado).
- **FinOps por workspace:** dashboard mostra uso/limites e custo estimado (WhatsApp/IA/uploads).
- **Infra (Postgres gerenciado):**
  - App suporta `DATABASE_URL_POOLED` (pooler) como datasource do Prisma.
  - Migração adiciona índices de performance para consultas típicas (membros, integrações, conversas, webhooks, automações, rate limits).

## Fase 11 (Stripe em produção) — o que mudou
- **Validação automatizada (SUPERADMIN):** `GET /api/admin/stripe/validate` verifica modo LIVE/TEST, Billing Portal, endpoint de webhook (URL + eventos obrigatórios), e consistência de planos (Price/Product no Stripe).
- **Auditoria + idempotência de webhooks:** persistência por `event.id` em `stripe_events` com status (`received/processing/processed/failed`) e lock para evitar duplicação.
- **Observação de eventos LIVE:** Admin → Settings mostra “Eventos LIVE (últimas 24h)” com contagem, eventos faltantes e status.
- **Replay 2x (idempotência):** no mesmo card, é possível reenviar um `evt_...` duas vezes e detectar automaticamente se houve duplicação.
  - API: `POST /api/admin/stripe/validate` com `{ "eventId": "evt_...", "times": 2 }`
- **NFS-e (opcional):** emissão automática atrelada ao `invoice.paid`/`invoice.payment_succeeded` quando `NFSE_ENABLED=true`, com gestão de emitentes no painel de Super Admin.

## Plataforma No-Code (o que torna o CRM “adaptável”)
A ideia aqui é simples: o CRM não é “um CRM fixo”. Cada workspace consegue adaptar processos sem precisar pedir feature nova.

O que já existe hoje:
- **Workflows (automações por regra):** gatilhos + condições + ações, com suporte a ações encadeadas e ações com atraso (delay).
- **Simulação / explicação do disparo:** ajuda a entender “por que uma regra rodou” (ou não) antes de colocar em produção.
- **Logs de execução:** registro de regras executadas e falhas para auditoria e debug operacional.
- **Templates de mensagem v2:** variáveis (contato/empresa/negócio/atendente), pastas, busca, idioma e duplicação simples (versionamento via nome).
- **Campos personalizados v2 (schema flexível):** tipos avançados (checkbox, multi-select, moeda, URL, telefone), validação e obrigatoriedade.
- **Webhooks v2 (integrações):** assinatura HMAC com rotação de segredo, filtros por evento (inclusive “enviar todos”), painel de entregas com histórico e retentativas.
- **API Keys por workspace:** gera chaves para integrações externas consumirem dados do workspace com controle de acesso.
- **Presets por nicho (1-click setup):** cria pipeline + campos + templates + automações prontos para segmentos (imobiliária, clínica, agência, assistência técnica, restaurante).
- **Roteamento e SLA no Inbox:** regras de atribuição (origem/palavra-chave/região/horário/carga), escalonamento automático e alertas.
- Notificações por automação: ação "Enviar notificação" disponível no builder de automações — o usuário pode escolher se sua app envia push ou não, sem código.
- **Form Builder (No-Code Leads):** criador visual de formulários com suporte a labels customizadas, tipos de campo, obrigatoriedade e mapeamento automático para propriedades do contato no CRM. Gera URLs públicas `/f/[slug]` prontas para uso.

Exemplos práticos (sem código):
- Quando um lead chega via WhatsApp e contém “orçamento” → criar negócio no pipeline X e atribuir para o vendedor A.
- Quando um negócio entra em “Proposta enviada” → agendar follow-up em 2 dias e enviar template de mensagem.
- Quando um cliente fica sem resposta por 15 min → escalonar para outro atendente e registrar atividade.
- Quando um pagamento muda para “PAID” → disparar automação e webhook para uma ferramenta externa.

Como isso funciona internamente (resumo):
- As regras, templates e definições de campos ficam **no banco** e são avaliadas no backend.
- O workspace pode ter seu próprio conjunto de regras, campos e templates, sem impactar outros clientes.

## Próximas decisões (anotar antes de codar)
- Qual é o ICP real (quem paga)?
- Qual é o MVP que dá pra cobrar rápido?
- Onde eu preciso ser “10/10” e onde “bom o suficiente” resolve?

## Dinheiro (pra eu não me enganar)
- Assinatura do SaaS: entra no Stripe da plataforma (PAYMENTS_SECRET_KEY).
- Pagamentos do CRM: por workspace, com gateway configurável e monetização por taxa.
- Objetivo: taxa da plataforma ser automática (split/marketplace_fee), não “planilha”.

## Notas rápidas (pra lembrar depois)
- Se aparecer 404 em páginas do admin, confirmar em qual porta o dev server subiu.
- Se aparecer Unauthorized em ação de admin, checar sessão/cookie e rota usada.

## Diário (anotações de dev)
### 2026-03-12
- Arquitetura de pagamentos do CRM por provider (Asaas/Stripe/Pagar.me/Mercado Pago), com credenciais e settings no banco.
- Painel de Super Admin para configurar providers e settings por workspace.
- Webhook unificado de pagamentos com validação de assinatura por gateway.
- Monetização automática nas cobranças do CRM:
  - Asaas: split repassando líquido pro workspace.
  - Mercado Pago: collector + marketplace_fee.
  - Pagar.me: tentativa de split flat (com fallback se o endpoint não suportar).
- Correção: listagem de usuários no Super Admin usando sessão server-side.

### 2026-03-13
- Fase 6 concluída: auditoria, LGPD e isolamento multi-tenant.
- Auditoria com `AUDIT_*` incluindo request metadata (ip, user-agent, rota, método, request-id).
- Exportação e remoção de dados por workspace (LGPD) via `/privacy/export` e `/privacy/erase`.
- Ajustes de isolamento: reforço de `workspaceId` em rotas críticas e endpoints de IA.
- Fase 8 concluída: ferramentas operacionais (masquerade, reprocessos), incidentes/SLA e onboarding.
- Fase 9 concluída: limites por plano, SLO/alertas, FinOps por workspace e suporte a pooler Postgres.
- Sistema de notificações in-app implementado (modelo Prisma, API, web push, bell icon na topbar).
- Ação no-code "Enviar Notificação" adicionada ao builder de automações.
- Cupons e promoções (Stripe): criação de cupom + código promocional via Super Admin, integrado ao checkout.
- Limites dinâmicos de IA/automação por plano: campos no editor de planos, enforcement nos endpoints, dashboard refletindo uso real.
- Tours de onboarding expandidos para todas as telas principais (contatos, empresas, pipeline, inbox, tarefas, automações, analytics, settings, campos personalizados, equipe, templates, billing, NPS, detalhes do negócio).
- Corrigido bug onde tours repetiam ou exibiam mensagens vazias (persistência + traduções PT/EN corrigidas).
- Preset "Restaurante" adicionado ao setup em 1 clique.

### 2026-03-14
- Inbox: botão “Resumir conversa” (IA) abrindo modal com opção de copiar.
- IA: `suggest-reply` com fallback quando `OPENAI_API_KEY` não estiver configurada.
- Modo manutenção: banner global configurável via Super Admin e chaves públicas via `/api/public-config`.
- CI: ajuste no workflow para evitar falha no smoke test quando variáveis mínimas não estiverem presentes.
- **Web Forms (Form Builder):** implementação completa do construtor de formulários, API de submissão pública e integração com CRM (criação de contatos, deals e atividades).
- **Compliance & Portabilidade:** reescrita dos Termos de Uso e Política de Privacidade para padrão B2B SaaS (Controlador/Operador) e LGPD.
- **Exportação de Dados:** funcionalidade de exportação do Workspace em JSON disponível em Configurações Avançadas.
- **UI/UX:** refinamento do Help Center removendo emojis e padronizando com Heroicons.

---

## 📄 Licença

Este projeto é licenciado sob a **MIT License** — veja o arquivo [LICENSE](LICENSE) para detalhes.

---

<div align="center">
  Feito com ❤️ por <a href="https://github.com/Andre-Brito-py">Andre Brito</a>
</div>
