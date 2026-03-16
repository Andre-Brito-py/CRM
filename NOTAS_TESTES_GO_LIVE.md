# Notas de Testes — Closify (Go‑Live Comercial)

Este arquivo é o roteiro único para validar que o Closify está pronto para lançamento. A execução deve ser **sequencial** (de cima para baixo), registrando **status** e **evidências** em cada item.

## Como usar

- Cada item tem um **ID**. Use esse ID em prints, logs e tickets.
- Status sugeridos: `PENDENTE` | `EM_ANDAMENTO` | `OK` | `FALHOU` | `BLOQUEADO`.
- Evidência mínima: comando executado + trecho do output, ou vídeo/print, ou URL + payload.

## 0) Gates automatizados (obrigatórios)

### 0.1 Lint / Build / Testes (CI)

- [x] **T0.1** Rodar CI completa: `npm run ci`
- [x] **T0.2** Rodar testes: `npm test`
- [x] **T0.3** Rodar lint: `npm run lint` (warnings ok, erros não)
- [x] **T0.4** Rodar build: `npm run build`
- [x] **T0.4a** Smoke do build em produção: `npm run start` (com `PORT=3001`)
- [x] **T0.4b** Smoke de páginas públicas (dev): `/`, `/demo`, `/auth/login`, `/auth/register`, `/privacy`, `/terms`

### 0.2 Prisma / Banco

- [x] **T0.5** Validar schema: `npm run prisma:validate`
- [ ] **T0.6** Staging: aplicar migrations: `npx prisma migrate deploy`
- [ ] **T0.7** Staging: smoke de conexão DB (subir app e acessar uma rota que consulta o banco)

### 0.3 Scripts operacionais (staging / ambiente isolado)

- [ ] **T0.8** Backup check: `npm run db:backup:check`
- [ ] **T0.9** Backup real: `npm run db:backup`
- [ ] **T0.10** Restore check: `npm run db:restore:check`
- [ ] **T0.11** Restore em staging isolado: `npm run db:restore`

### 0.4 Carga / estabilidade (staging)

- [ ] **T0.12** Carga básica: `npm run loadtest`
- [ ] **T0.13** Verificar erros 5xx e latência p95 antes/depois do teste

## 1) Autenticação (NextAuth)

- [ ] **T1.1** Login por magic link (solicitar, receber, entrar)
- [ ] **T1.2** Expiração de magic link (link antigo deve falhar)
- [ ] **T1.3** Login por senha (correta) e erro com senha inválida (mensagem genérica)
- [ ] **T1.4** 2FA: habilitar, exigir token e bloquear token inválido
- [ ] **T1.5** Google OAuth: login funciona via SystemConfig (sem depender do `.env`)
- [ ] **T1.6** Logout invalida sessão (não reutilizar cookies)
- [ ] **T1.7** Rate limit no login (muitas tentativas → 429)

## 2) Multi‑tenant / Workspaces / Permissões

- [ ] **T2.1** Criar workspace e acessar dashboard
- [ ] **T2.2** Slug único (criar com slug repetido deve falhar)
- [ ] **T2.3** Convites: convidar → aceitar → virar membro (status correto)
- [ ] **T2.4** Limites do plano: convites pendentes e assentos (enforcement real)
- [ ] **T2.5** Isolamento: usuário de WS-A não acessa dados WS-B por URL direta / API

## 3) Core CRM (Contatos / Empresas / Deals / Pipeline)

- [ ] **T3.1** Contatos: criar / editar / remover (soft delete se aplicável)
- [ ] **T3.2** Empresas: criar / vincular a contato / editar
- [ ] **T3.3** Deals: criar com contato, valor, estágio; editar propriedades
- [ ] **T3.4** Pipeline: mover deal entre estágios; validar persistência
- [ ] **T3.5** Busca e filtros (retornar dados esperados)
- [ ] **T3.6** Export CSV (workspace): arquivo abre correto (UTF‑8), colunas esperadas

## 4) Inbox Omnichannel (WhatsApp + Email)

- [ ] **T4.1** Lista de conversas carrega; abrir conversa e renderizar mensagens
- [ ] **T4.2** Enviar mensagem (outbound) e ver status/erro
- [ ] **T4.3** Inbound WhatsApp cria/atualiza conversa e contato (idempotência)
- [ ] **T4.4** Email: enviar email pelo inbox e registrar evento `EMAIL_SENT`
- [ ] **T4.5** Roteamento/SLA (se habilitado): regras aplicadas e alertas

## 5) IA (cota, overage, segurança)

- [ ] **T5.1** Configurar `OPENAI_API_KEY` via Admin e validar endpoint de IA
- [ ] **T5.2** Sugestão de resposta (Inbox) funciona e respeita workspace
- [ ] **T5.3** Resumo de conversa funciona (sem vazar dados de outro workspace)
- [ ] **T5.4** Atingir limite do plano → retorna erro esperado e UI trata
- [ ] **T5.5** Overage: habilitar e validar cobrança extra (onde aplicável)
- [ ] **T5.6** Prompt injection básico não retorna segredos/config do sistema

## 6) Automações / Webhooks / Zapier

- [ ] **T6.1** Criar automação simples (gatilho → ação) e ver execução
- [ ] **T6.2** Condições AND/OR funcionam (dispara quando deve)
- [ ] **T6.3** Ação CALL_WEBHOOK envia payload correto e assina HMAC
- [ ] **T6.4** Retry e histórico de deliveries funcionam
- [ ] **T6.5** Zapier: `ZAPIER_ALLOWED_HOSTS` bloqueia host fora da lista

## 7) Pagamentos (SaaS + CRM)

- [ ] **T7.1** Stripe: criar assinatura, acessar portal, cancelar
- [ ] **T7.2** Webhook Stripe: idempotência por `event.id` (sem duplicar)
- [ ] **T7.3** Validação admin Stripe (`/api/admin/stripe/validate`) ok em staging
- [ ] **T7.4** CRM gateway (ex.: Asaas): criar cobrança, pagar, falhar, conciliar
- [ ] **T7.5** Fees/FinOps refletem em UI e cálculos (custos unitários)

## 8) Fiscal (NFS‑e)

- [ ] **T8.1** Ativar `NFSE_ENABLED` e configurar `FOCUS_NFE_API_KEY` via Admin
- [ ] **T8.2** Emitentes: `NFSE_ISSUERS_JSON` válido e seleção do emitente padrão
- [ ] **T8.3** Emissão automática dispara no evento correto e registra resultado/erros

## 9) Multimodal + LGPD (Etapa E)

- [ ] **T9.1** Consentimento: sem consentimento não processa mídia
- [ ] **T9.2** Áudio: transcrição funciona e aparece no fluxo correto
- [ ] **T9.3** Imagem/doc: OCR/extração funciona com validação
- [ ] **T9.4** Cron retenção (`/api/cron/media-retention`) roda e limpa conforme dias/lote
- [ ] **T9.5** LGPD export/erase (workspace): export gera dados; erase remove/anonimiza

## 10) Admin / Operação / Auditoria

- [ ] **T10.1** Super Admin Settings salva configs; secrets ficam mascarados
- [ ] **T10.2** Configs “public” aparecem em `/api/public-config` quando marcadas como public
- [ ] **T10.3** Auditoria registra ações sensíveis (configs, webhooks, impersonation)
- [ ] **T10.4** Impersonation: iniciar/parar; trilha de auditoria; sem escalada
- [ ] **T10.5** Maintenance mode: ativa/desativa e respeita UI/rotas

## 11) Segurança (checagens práticas)

- [ ] **T11.1** Usuário comum não acessa `/admin` nem `/api/admin/*`
- [ ] **T11.2** Vazamento zero de secrets em logs e responses (inspecionar logs e network)
- [ ] **T11.3** Rate limit em endpoints sensíveis (login, IA, webhooks)
- [ ] **T11.4** Headers básicos e CORS onde aplicável (webhooks) não abrem brecha

## Registro de execução

### Execução atual

- Data: 2026-03-15
- Ambiente: local
- Commit/tag: ea2cb36

### Resultados (preencher)

- T0.1: OK (npm run ci)
- T0.2: OK (jest: 2 passed, 1 skipped)
- T0.3: OK (lint sem erro; warnings de <img>)
- T0.4: OK (build)
- T0.4a: OK (next start + `GET /api/public-config` 200 em `http://localhost:3001`)
- T0.4b: OK (200 em todas as rotas públicas acima em `http://localhost:3000`)
- T0.5: OK (prisma validate)
- T0.6: OK (local) — `npx prisma migrate deploy` (sem migrations pendentes)
- T0.7: OK (local) — smoke DB via `GET /api/public-config` (200)
- T0.8: BLOQUEADO (local) — script usa Docker; Docker Desktop não está rodando
- T0.12: OK (local) — `node scripts/loadtest.js --baseUrl http://localhost:3004 --workspaceSlug <slug> --vus 3 --durationSec 10` com `LOADTEST_COOKIE` válido (0 erros; p95 ~264ms)

Notas (DB local):
- `npx prisma migrate deploy`: sem migrations pendentes
- Para validar todas as funções, executar os testes manuais em um banco consistente (ideal: staging) com `prisma migrate deploy` sem drift.

## Lote 1 (próxima execução manual)

Pré-requisitos:
- Staging com integrações reais (Email/WhatsApp/Stripe) e usuário SUPERADMIN.
- 2 workspaces de teste: WS-A e WS-B, e 2 usuários: U1 (membro WS-A) e U2 (membro WS-B).
  
Notas (local):
- Para criar um SUPERADMIN via seed: `SUPERADMIN_EMAIL` (ou `ADMIN_EMAIL`) + `SUPERADMIN_PASSWORD` e rodar `npx prisma db seed`.

Roteiro:
- Auth: T1.1 → T1.7
- Multi-tenant: T2.1 → T2.5
- Core CRM: T3.1 → T3.4
