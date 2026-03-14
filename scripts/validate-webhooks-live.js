#!/usr/bin/env node
/**
 * validate-webhooks-live.js
 *
 * Validates Stripe webhook configuration + idempotency in LIVE mode.
 * Uses the admin endpoint /api/admin/stripe/validate (GET + POST).
 *
 * Usage:
 *   node scripts/validate-webhooks-live.js
 *
 * Required env vars:
 *   APP_URL              - Base URL of the app (e.g. https://meucrm.com)
 *   ADMIN_SESSION_COOKIE - next-auth.session-token cookie value of a SUPERADMIN user
 *
 * Optional env vars:
 *   REPLAY_TIMES         - How many times to replay each event (default: 3)
 *   SKIP_REPLAY          - Set to "true" to skip the replay/idempotency phase
 */

const APP_URL = (process.env.APP_URL || '').replace(/\/$/, '');
const SESSION_COOKIE = process.env.ADMIN_SESSION_COOKIE || '';
const REPLAY_TIMES = Math.max(2, Math.min(5, Number(process.env.REPLAY_TIMES || 3)));
const SKIP_REPLAY = String(process.env.SKIP_REPLAY || '').toLowerCase() === 'true';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

const ok = (msg) => console.log(`  ${GREEN}✔${RESET} ${msg}`);
const fail = (msg) => console.log(`  ${RED}✘${RESET} ${msg}`);
const warn = (msg) => console.log(`  ${YELLOW}⚠${RESET} ${msg}`);
const info = (msg) => console.log(`  ${CYAN}ℹ${RESET} ${msg}`);
const heading = (msg) => console.log(`\n${BOLD}${msg}${RESET}`);
const divider = () => console.log(`${DIM}${'─'.repeat(60)}${RESET}`);

const REQUIRED_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
];

async function apiFetch(path, options = {}) {
  const url = `${APP_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    Cookie: `next-auth.session-token=${SESSION_COOKIE}`,
    ...options.headers,
  };

  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch { }

  return { status: res.status, ok: res.ok, json, text };
}

// ─── Phase 1: Configuration Validation ───────────────────────────────────────

async function validateConfiguration() {
  heading('📋 FASE 1 — Validação de Configuração LIVE');
  divider();

  const { status, ok: isOk, json } = await apiFetch('/api/admin/stripe/validate');

  if (!isOk || !json?.data) {
    fail(`GET /api/admin/stripe/validate retornou ${status}`);
    if (json?.errors) console.log('   ', JSON.stringify(json.errors));
    return { passed: false, data: null };
  }

  const d = json.data;
  let allPassed = true;

  // 1. Live mode
  if (d.mode?.isLiveKey) {
    ok('Chave secreta é LIVE (sk_live_...)');
  } else {
    fail('Chave secreta NÃO é LIVE — rodando em modo TEST');
    allPassed = false;
  }

  // 2. Stripe livemode balance
  if (d.stripe?.livemode) {
    ok('Stripe balance confirma livemode');
  } else {
    fail('Stripe balance NÃO está em livemode');
    allPassed = false;
  }

  // 3. Webhook secret self-test
  if (d.webhook?.secretSelfTest) {
    ok('STRIPE_WEBHOOK_SECRET auto-teste de assinatura: OK');
  } else {
    fail('STRIPE_WEBHOOK_SECRET auto-teste de assinatura FALHOU');
    allPassed = false;
  }

  // 4. Webhook endpoint check
  const ep = d.webhook?.endpointCheck;
  if (ep?.ok) {
    ok(`Webhook endpoint configurado e ativo: ${d.webhook?.endpoint}`);
    if (ep.endpoint?.hasWildcard) {
      ok('  Endpoint escuta todos os eventos (wildcard *)');
    } else {
      ok(`  ${ep.endpoint?.enabledEventsCount || '?'} eventos habilitados`);
    }
  } else {
    fail(`Webhook endpoint com problemas: ${JSON.stringify(ep?.issues || [])}`);
    allPassed = false;
  }

  // 5. Blocking issues
  if (d.blockingIssues?.length > 0) {
    fail(`Blocking issues: ${d.blockingIssues.join(', ')}`);
    allPassed = false;
  } else {
    ok('Nenhum blocking issue');
  }

  // 6. Billing Portal
  if (d.billingPortal?.configurationOk) {
    ok('Billing Portal configurado');
  } else {
    warn('Billing Portal NÃO configurado ou inválido');
  }

  // 7. Plan checks
  const plans = d.plans || [];
  const plansFailing = plans.filter((p) => !p.ok);
  if (plans.length === 0) {
    warn('Nenhum plano ativo encontrado');
  } else if (plansFailing.length > 0) {
    fail(`${plansFailing.length}/${plans.length} planos com problemas:`);
    plansFailing.forEach((p) => {
      console.log(`     ${p.slug}: ${p.issues.join(', ')}`);
    });
    allPassed = false;
  } else {
    ok(`${plans.length} planos validados no Stripe`);
  }

  // 8. Live webhook events summary
  const lwe = d.liveWebhookEvents;
  if (lwe) {
    info(`Eventos LIVE nas últimas 24h: ${lwe.last24hCount}`);
    if (lwe.last24hCount > 0) {
      info('  Por tipo:');
      Object.entries(lwe.typesLast24h || {}).forEach(([type, count]) => {
        console.log(`     ${type}: ${count}`);
      });
      info('  Por status:');
      Object.entries(lwe.statusLast24h || {}).forEach(([s, count]) => {
        console.log(`     ${s}: ${count}`);
      });
      if (lwe.staleProcessingCount > 0) {
        warn(`  ${lwe.staleProcessingCount} evento(s) "processing" há mais de 10min (possível travamento)`);
      }
    }
    if (lwe.missingRequired?.length > 0) {
      warn(`  Tipos obrigatórios SEM eventos nas últimas 24h: ${lwe.missingRequired.join(', ')}`);
    }
  } else if (d.mode?.isLiveKey) {
    warn('Não foi possível consultar eventos LIVE (tabela stripe_events indisponível?)');
  }

  // 9. Warnings
  (d.warnings || []).forEach((w) => warn(w));

  divider();
  if (allPassed) {
    ok(`${GREEN}${BOLD}FASE 1 APROVADA — Configuração LIVE OK${RESET}`);
  } else {
    fail(`${RED}${BOLD}FASE 1 COM FALHAS — corrija os itens acima antes de prosseguir${RESET}`);
  }

  return { passed: allPassed, data: d };
}

// ─── Phase 2: Replay & Idempotency ──────────────────────────────────────────

async function validateIdempotency(configData) {
  heading('🔁 FASE 2 — Replay & Idempotência');
  divider();

  if (SKIP_REPLAY) {
    warn('SKIP_REPLAY=true — pulando fase de replay');
    return { passed: true, skipped: true };
  }

  const lwe = configData?.liveWebhookEvents;
  const recent = lwe?.recent || [];

  if (recent.length === 0) {
    warn('Nenhum evento LIVE recente encontrado para replay.');
    warn('Dispare um evento real (ex: checkout test) ou use o Stripe Dashboard para resend.');
    return { passed: true, skipped: true, reason: 'no_recent_events' };
  }

  // Pick the most recent event of each unique type (up to REQUIRED_EVENTS)
  const eventsByType = {};
  for (const ev of recent) {
    if (!eventsByType[ev.type]) {
      eventsByType[ev.type] = ev;
    }
  }

  // Prioritize required events, then any others
  const eventsToReplay = [];
  for (const type of REQUIRED_EVENTS) {
    if (eventsByType[type]) {
      eventsToReplay.push(eventsByType[type]);
    }
  }
  // Add any other types not in required list
  for (const [type, ev] of Object.entries(eventsByType)) {
    if (!REQUIRED_EVENTS.includes(type) && eventsToReplay.length < 5) {
      eventsToReplay.push(ev);
    }
  }

  if (eventsToReplay.length === 0) {
    warn('Nenhum evento adequado para replay (tipos recentes não coincidem com tipos obrigatórios)');
    return { passed: true, skipped: true };
  }

  info(`Replay de ${eventsToReplay.length} evento(s), ${REPLAY_TIMES}x cada:`);
  eventsToReplay.forEach((ev) => console.log(`     ${ev.id} (${ev.type})`));
  console.log();

  let allPassed = true;
  const results = [];

  for (const ev of eventsToReplay) {
    info(`Reenviando ${CYAN}${ev.type}${RESET} — ${ev.id} (${REPLAY_TIMES}x)...`);

    const { status, ok: isOk, json } = await apiFetch('/api/admin/stripe/validate', {
      method: 'POST',
      body: JSON.stringify({ eventId: ev.id, times: REPLAY_TIMES }),
    });

    if (!isOk || !json?.data?.replay) {
      fail(`  POST para replay retornou ${status}: ${json?.errors?.error?.msg || 'erro desconhecido'}`);
      allPassed = false;
      results.push({ eventId: ev.id, type: ev.type, passed: false, error: `HTTP ${status}` });
      continue;
    }

    const replay = json.data.replay;
    const attempts = replay.attempts || [];

    // Show attempt results
    for (const a of attempts) {
      const tag = a.status === 200 ? `${GREEN}200${RESET}` : `${RED}${a.status}${RESET}`;
      let bodyParsed = null;
      try { bodyParsed = JSON.parse(a.body); } catch { }
      const dup = bodyParsed?.duplicate ? ` ${DIM}(duplicate)${RESET}` : '';
      const proc = bodyParsed?.alreadyProcessed ? ` ${DIM}(alreadyProcessed)${RESET}` : '';
      console.log(`     Tentativa ${a.index}: HTTP ${tag}${dup}${proc}`);
    }

    // Check idempotency
    if (replay.duplicatesDetected) {
      fail(`  ⚠ DUPLICATAS DETECTADAS — side-effects mudaram entre tentativas!`);
      allPassed = false;
      results.push({ eventId: ev.id, type: ev.type, passed: false, duplicates: true });
    } else {
      ok(`  Idempotência OK — nenhum side-effect duplicado`);
      results.push({ eventId: ev.id, type: ev.type, passed: true });
    }

    // Show before/after state
    const after = replay.after?.[replay.after.length - 1];
    const seStatus = after?.stripeEvent?.status;
    if (seStatus) {
      info(`  stripe_events.status final: ${seStatus}`);
    }
    console.log();
  }

  divider();

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  if (allPassed) {
    ok(`${GREEN}${BOLD}FASE 2 APROVADA — ${passedCount}/${results.length} eventos replay OK, idempotência confirmada${RESET}`);
  } else {
    fail(`${RED}${BOLD}FASE 2 COM FALHAS — ${failedCount}/${results.length} eventos com problemas${RESET}`);
  }

  return { passed: allPassed, results };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${BOLD}${CYAN}═══════════════════════════════════════════════════${RESET}`);
  console.log(`${BOLD}${CYAN}  Stripe Webhook LIVE Validation${RESET}`);
  console.log(`${BOLD}${CYAN}═══════════════════════════════════════════════════${RESET}`);
  console.log(`  ${DIM}App: ${APP_URL || '(não definido)'}${RESET}`);
  console.log(`  ${DIM}Replay: ${REPLAY_TIMES}x | Skip: ${SKIP_REPLAY}${RESET}`);

  if (!APP_URL) {
    fail('APP_URL não definido. Defina a variável de ambiente e tente novamente.');
    process.exit(1);
  }
  if (!SESSION_COOKIE) {
    fail('ADMIN_SESSION_COOKIE não definido. Use o cookie de sessão de um SUPERADMIN.');
    process.exit(1);
  }

  // Phase 1
  const phase1 = await validateConfiguration();

  // Phase 2
  let phase2 = { passed: true, skipped: true };
  if (phase1.passed) {
    phase2 = await validateIdempotency(phase1.data);
  } else {
    warn('\nPulando Fase 2 (replay) porque a Fase 1 falhou.');
  }

  // Final report
  heading('📊 RESULTADO FINAL');
  divider();

  const overallPassed = phase1.passed && phase2.passed;

  console.log(`  Fase 1 (Configuração): ${phase1.passed ? `${GREEN}PASSED${RESET}` : `${RED}FAILED${RESET}`}`);
  console.log(`  Fase 2 (Idempotência): ${phase2.skipped ? `${YELLOW}SKIPPED${RESET}` : phase2.passed ? `${GREEN}PASSED${RESET}` : `${RED}FAILED${RESET}`}`);

  divider();

  if (overallPassed) {
    console.log(`\n  ${GREEN}${BOLD}✔ VALIDAÇÃO COMPLETA — Webhooks LIVE prontos para produção!${RESET}\n`);
  } else {
    console.log(`\n  ${RED}${BOLD}✘ VALIDAÇÃO COM FALHAS — corrija os itens acima.${RESET}\n`);
  }

  // Output JSON for CI/automation
  const report = {
    timestamp: new Date().toISOString(),
    appUrl: APP_URL,
    phase1: { passed: phase1.passed },
    phase2: { passed: phase2.passed, skipped: !!phase2.skipped, results: phase2.results || [] },
    overall: overallPassed ? 'PASSED' : 'FAILED',
  };

  console.log(`${DIM}JSON report:${RESET}`);
  console.log(JSON.stringify(report, null, 2));

  process.exit(overallPassed ? 0 : 1);
}

main().catch((err) => {
  console.error(`\n${RED}Fatal error:${RESET}`, err);
  process.exit(2);
});
