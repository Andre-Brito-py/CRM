# Runbook: Validação de Webhooks Stripe LIVE

## Pré-requisitos

- Chaves Stripe **LIVE** configuradas (`sk_live_*`, `pk_live_*`)
- `STRIPE_WEBHOOK_SECRET` configurado (whsec do endpoint LIVE)
- Webhook endpoint ativo no Stripe Dashboard apontando para `{APP_URL}/api/webhooks/stripe`
- Eventos obrigatórios habilitados no endpoint:
  - `checkout.session.completed`
  - `customer.subscription.created` / `updated` / `deleted`
  - `invoice.paid`, `invoice.payment_succeeded`, `invoice.payment_failed`

---

## Opção 1: Script automatizado

```bash
APP_URL=https://meucrm.com \
ADMIN_SESSION_COOKIE=<cookie-next-auth-session-token> \
node scripts/validate-webhooks-live.js
```

**Variáveis opcionais:**
- `REPLAY_TIMES=3` — quantas vezes reenviar cada evento (2–5)
- `SKIP_REPLAY=true` — pular a fase de idempotência

**Resultado esperado:** exit code `0` e todas as fases `PASSED`.

---

## Opção 2: Validação manual via Stripe Dashboard

### 2.1 Verificar configuração

1. Acesse o admin: `{APP_URL}/api/admin/stripe/validate` (GET, como SUPERADMIN)
2. Confirme:
   - `mode.isLiveKey: true`
   - `webhook.secretSelfTest: true`
   - `webhook.endpointCheck.ok: true`
   - `blockingIssues: []`

### 2.2 Testar idempotência (resend)

1. No Stripe Dashboard → **Developers → Webhooks → seu endpoint**
2. Selecione um evento recente (ex: `invoice.paid`)
3. Clique em **"Resend"** → confirme HTTP 200
4. Verifique no banco:
   ```sql
   SELECT id, type, status, "receivedAt", "processedAt"
   FROM stripe_events
   WHERE id = 'evt_xxxx'
   ORDER BY "receivedAt" DESC;
   ```
   → Deve haver **1 único registro** com `status = 'processed'`
5. Clique **"Resend"** novamente para o **mesmo evento**
6. Resposta esperada: `{ "received": true, "duplicate": true, "alreadyProcessed": true }`
7. Verifique que a tabela `stripe_events` **não criou** registro duplicado

### 2.3 Testar com checkout real

1. Use um cartão de teste (`4242 4242 4242 4242`) ou cartão real no LIVE
2. Complete um checkout → observe `checkout.session.completed` chegar
3. Confirme no banco que `customerPayments.subscriptionType` foi atualizado
4. No Dashboard, resend o mesmo evento → confirme que **nada mudou** (idempotente)

---

## Troubleshooting

| Problema | Causa provável | Solução |
|---|---|---|
| `webhook.secretSelfTest: false` | Secret não bate com o endpoint | Copie o signing secret correto do Dashboard Stripe |
| `webhook_endpoint_missing` | URL não encontrada nos endpoints | Crie o endpoint no Dashboard com a URL correta |
| `webhook_events_missing:...` | Eventos obrigatórios não habilitados | Edite o endpoint e adicione os eventos listados |
| Replay retorna HTTP 500 | Handler com erro de processamento | Verifique logs do servidor e `stripe_events.error` |
| `duplicatesDetected: true` | Side-effect duplicado no replay | Investigue qual dado mudou (fiscal_documents? customerPayment?) |
| Evento fica `processing` > 10min | Handler travou ou caiu no meio | Reprocesse manualmente via admin ou atualize status para `failed` |

---

## Evidência de validação

Após executar com sucesso, salve o JSON report do script ou screenshots do banco como evidência para o checklist de go-live.
