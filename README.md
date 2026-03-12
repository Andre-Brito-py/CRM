# Nextacular CRM

Este repositório é privado.

Não é um projeto “open source”, nem algo feito para ser bonito para outras pessoas. É o meu caderno de obra: decisões, dúvidas, lembretes e as partes que eu não posso esquecer quando eu estiver cansado e achar que “já sei”.

## O que eu estou construindo (em uma frase)
Um CRM omnichannel para vender, atender e acompanhar clientes sem virar refém de planilha.

## Por que isso existe
- Quero abrir um negócio com isso.
- Preciso de uma plataforma que eu controle (produto, dados e evolução).
- A meta é simples: resolver dor real com uma experiência sólida.

## Regras internas (pra eu não me sabotar)
- Nada de credenciais no código/repo.
- Tudo que for “admin master” tem que ser auditável e seguro.
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
NEXTAUTH_SECRET="..."
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
- Cron: `CRON_SECRET`
- Analytics: `GOOGLE_ANALYTICS_ID`
- Geral: `APP_URL`

Valores “public” expostos via `/api/public-config` (seguros para o browser):
- `STRIPE_PUBLISHABLE_KEY`, `GOOGLE_ANALYTICS_ID`, `VAPID_PUBLIC_KEY`, `VERCEL_IP_ADDRESS`

## Coisas que já estão no produto (resumo curto)
- Workspaces (multi-tenant)
- Deals + pipeline kanban
- Contatos/empresas + atividades
- Inbox omnichannel (WhatsApp)
- Login (magic link + senha) + 2FA
- Paywall por plano e painel de super admin
- Customer Satisfaction (NPS): páginas + gráficos com animação
- Sistema de pagamentos do CRM (multi-gateway) + webhooks
- Monetização por taxa da plataforma (split/fee quando disponível)

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
- **Presets por nicho (1-click setup):** cria pipeline + campos + templates + automações prontos para segmentos (imobiliária, clínica, agência, assistência técnica).
- **Roteamento e SLA no Inbox:** regras de atribuição (origem/palavra-chave/região/horário/carga), escalonamento automático e alertas.

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

---

## 📄 Licença

Este projeto é licenciado sob a **MIT License** — veja o arquivo [LICENSE](LICENSE) para detalhes.

---

<div align="center">
  Feito com ❤️ por <a href="https://github.com/Andre-Brito-py">Andre Brito</a>
</div>
