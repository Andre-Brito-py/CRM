/**
 * Extrai credenciais WhatsApp do banco via Prisma + roda diagnóstico completo
 */

// Carrega .env manualmente
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env');

if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

// Importa PrismaClient
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

console.log('\n══════════════════════════════════════════════════════════');
console.log('  STEP 0 — Buscando credenciais do banco de dados');
console.log('══════════════════════════════════════════════════════════');

// Lista workspaces
const workspaces = await prisma.workspace.findMany({ select: { id: true, slug: true, name: true } });
if (workspaces.length === 0) {
  console.log('❌ Nenhum workspace encontrado.');
  await prisma.$disconnect();
  process.exit(1);
}
console.log('\n📋 Workspaces encontrados:');
workspaces.forEach(w => console.log(`   [${w.slug}] ${w.name}`));

// Lista integrações WhatsApp
const integrations = await prisma.integration.findMany({
  where: { provider: { in: ['WHATSAPP', 'whatsapp'] } },
  include: { workspace: { select: { slug: true, name: true } } },
  orderBy: { createdAt: 'desc' },
});

if (integrations.length === 0) {
  console.log('\n❌ NENHUMA INTEGRAÇÃO WHATSAPP ENCONTRADA!');
  console.log('   → Acesse: Vysify > Configurações > Integrações > WhatsApp');
  console.log('   → Clique em "Adicionar número" e preencha os campos.');
  await prisma.$disconnect();
  process.exit(1);
}

console.log('\n📋 Integrações WhatsApp encontradas:');
integrations.forEach((i, idx) => {
  const creds = typeof i.credentials === 'string' ? JSON.parse(i.credentials || '{}') : (i.credentials || {});
  console.log(`\n  [${idx + 1}] ${i.workspace.slug} / ${i.name}`);
  console.log(`       Enabled:          ${i.enabled}`);
  console.log(`       Integration ID:   ${i.id}`);
  console.log(`       Phone Number ID:  ${creds.phoneNumberId || '⚠️  VAZIO'}`);
  console.log(`       Business Acc ID:  ${creds.businessAccountId || '(vazio)'}`);
  console.log(`       Verify Token:     ${creds.verifyToken || '⚠️  VAZIO'}`);
  console.log(`       Access Token:     ${creds.accessToken ? creds.accessToken.slice(0, 30) + '...' : '⚠️  VAZIO'}`);
});

// Pega a primeira integração habilitada
const activeIntegration = integrations.find(i => i.enabled) || integrations[0];
const creds = typeof activeIntegration.credentials === 'string'
  ? JSON.parse(activeIntegration.credentials || '{}')
  : (activeIntegration.credentials || {});

const ACCESS_TOKEN    = creds.accessToken || '';
const PHONE_NUMBER_ID = creds.phoneNumberId || '';
const WORKSPACE_SLUG  = activeIntegration.workspace.slug;
const APP_URL         = process.env.APP_URL || 'http://localhost:3000';

if (!ACCESS_TOKEN || !PHONE_NUMBER_ID) {
  console.log('\n❌ CREDENCIAIS INCOMPLETAS — Access Token ou Phone Number ID estão vazios.');
  console.log('   → Acesse o Vysify, edite a integração e preencha todos os campos.');
  await prisma.$disconnect();
  process.exit(1);
}

console.log(`\n✅ Usando integração: [${WORKSPACE_SLUG}] ${activeIntegration.name}`);

// ──────────────────────────────────────────────────────────────
//  Também verifica mensagens recentes no banco
// ──────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════');
console.log('  STEP 0b — Verificando mensagens recentes no banco');
console.log('══════════════════════════════════════════════════════════');

const recentMessages = await prisma.message.findMany({
  where: {
    conversation: { workspace: { slug: WORKSPACE_SLUG }, platform: 'WHATSAPP' },
  },
  orderBy: { createdAt: 'desc' },
  take: 5,
  include: {
    conversation: {
      include: { contact: { select: { name: true, phone: true } } },
    },
  },
});

if (recentMessages.length === 0) {
  console.log('   ⚠️  Nenhuma mensagem WhatsApp encontrada no banco (inbound nem outbound).');
  console.log('   → Isso confirma que o webhook NUNCA processou uma mensagem com sucesso.');
} else {
  console.log(`   ✅ ${recentMessages.length} mensagem(s) WhatsApp mais recentes:`);
  recentMessages.forEach(m => {
    const contact = m.conversation?.contact;
    const ts = new Date(m.createdAt).toLocaleString('pt-BR');
    console.log(`   [${ts}] ${m.direction} | ${m.status} | ${contact?.phone} (${contact?.name}) | "${String(m.content || '').slice(0, 60)}"`);
  });
}

await prisma.$disconnect();

// ──────────────────────────────────────────────────────────────
//  STEP 1 — Verificar token
// ──────────────────────────────────────────────────────────────
const API_VERSION = 'v25.0';

console.log('\n══════════════════════════════════════════════════════════');
console.log(`  STEP 1 — Verificando token de acesso (Meta)`);
console.log('══════════════════════════════════════════════════════════');
try {
  const r = await fetch(
    `https://graph.facebook.com/debug_token?input_token=${ACCESS_TOKEN}&access_token=${ACCESS_TOKEN}`
  );
  const d = await r.json();
  if (d.data) {
    const exp = d.data.expires_at ? new Date(d.data.expires_at * 1000) : null;
    const expired = exp && exp < new Date();
    console.log(`   Válido: ${d.data.is_valid ? '✅ SIM' : '❌ NÃO'}`);
    console.log(`   Tipo: ${d.data.type} | App ID: ${d.data.app_id}`);
    if (exp) console.log(`   Expira: ${exp.toLocaleString('pt-BR')}${expired ? ' ❌ JÁ EXPIROU!' : ' ✅'}`);
    else console.log('   Expiração: ♾️  Permanente');
    if (d.data.scopes) {
      const hasWA = d.data.scopes.some(s => s.includes('whatsapp') || s.includes('business'));
      console.log(`   Escopos WA: ${hasWA ? '✅' : '❌ FALTANDO whatsapp_business_messaging'}`);
      console.log(`   Escopos: ${d.data.scopes.join(', ')}`);
    }
    if (!d.data.is_valid) {
      console.log('\n   ❌ TOKEN INVÁLIDO — Gere um novo token no painel Meta e atualize a integração.');
    }
  } else {
    console.log('   ⚠️  Não foi possível validar:', JSON.stringify(d));
  }
} catch (e) {
  console.log('   ⚠️  Erro ao verificar token:', e.message);
}

// ──────────────────────────────────────────────────────────────
//  STEP 2 — Verificar Phone Number ID
// ──────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════');
console.log(`  STEP 2 — Verificando Phone Number ID: ${PHONE_NUMBER_ID}`);
console.log('══════════════════════════════════════════════════════════');
let accountMode = null;
try {
  const r = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}?fields=display_phone_number,verified_name,quality_rating,status,account_mode`,
    { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } }
  );
  const d = await r.json();
  if (d.error) {
    console.log(`   ❌ ERRO: ${d.error.message}`);
    console.log(`   Código: ${d.error.code}`);
    if (d.error.code === 100) console.log('   💡 Phone Number ID incorreto!');
    if (d.error.code === 190) console.log('   💡 Token inválido/expirado!');
  } else {
    accountMode = d.account_mode;
    console.log(`   Número: ${d.display_phone_number}`);
    console.log(`   Nome verificado: ${d.verified_name}`);
    console.log(`   Status: ${d.status}`);
    console.log(`   Qualidade: ${d.quality_rating}`);
    if (accountMode === 'SANDBOX') {
      console.log('   ⚠️  MODO: SANDBOX');
      console.log('   → Para receber/enviar mensagens REAIS, o número destino deve estar na lista de teste.');
      console.log('   → Acesse: developers.facebook.com → seu App → WhatsApp → Números de teste');
    } else if (accountMode === 'LIVE') {
      console.log('   ✅ MODO: LIVE');
    } else {
      console.log(`   ℹ️  MODO: ${accountMode}`);
    }
  }
} catch (e) {
  console.log('   ⚠️  Erro:', e.message);
}

// ──────────────────────────────────────────────────────────────
//  STEP 3 — OUTBOUND (envia mensagem via Meta API)
// ──────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════');
console.log('  STEP 3 — OUTBOUND: Verificar envio via Meta API');
console.log('══════════════════════════════════════════════════════════');
console.log('   ⚠️  Para testar o envio real, precisamos de um número destino.');
console.log('   Pulando envio real para não spam — use scratch/test_omnichannel.mjs para isso.');
console.log('   (preencha TO_NUMBER no topo do arquivo)');

// ──────────────────────────────────────────────────────────────
//  STEP 4 — INBOUND: Simula webhook POST no Vysify
// ──────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════');
console.log('  STEP 4 — INBOUND: Simulando POST do webhook Meta → Vysify');
console.log('══════════════════════════════════════════════════════════');

const webhookUrl = `${APP_URL}/api/integrations/whatsapp/webhook?workspace=${WORKSPACE_SLUG}`;
console.log(`   URL: ${webhookUrl}`);

// Simula um número de teste como remetente
const fakeFrom = '5511999990001';
const webhookPayload = {
  object: 'whatsapp_business_account',
  entry: [{
    id: 'SIMULATE',
    changes: [{
      value: {
        messaging_product: 'whatsapp',
        metadata: { display_phone_number: '15550000000', phone_number_id: PHONE_NUMBER_ID },
        contacts: [{ profile: { name: 'Diagnóstico Vysify' }, wa_id: fakeFrom }],
        messages: [{
          from: fakeFrom,
          id: `wamid.DIAG_${Date.now()}`,
          timestamp: String(Math.floor(Date.now() / 1000)),
          text: { body: '🔧 Mensagem de diagnóstico automático — inbound' },
          type: 'text',
        }],
      },
      field: 'messages',
    }],
  }],
};

try {
  const r = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(webhookPayload),
  });
  const text = await r.text();
  console.log(`   HTTP ${r.status}: "${text}"`);

  if (r.status === 200) {
    console.log('\n   ✅ WEBHOOK FUNCIONANDO! Vysify recebeu e processou a mensagem.');
    console.log(`   → Verifique no Inbox se apareceu uma conversa do número ${fakeFrom}`);
  } else if (r.status === 400) {
    console.log('\n   ❌ HTTP 400 — workspace não encontrado ou parâmetro inválido.');
    console.log(`   → Slug "${WORKSPACE_SLUG}" existe no banco mas pode não ser reconhecido.`);
  } else if (r.status === 404) {
    console.log('\n   ❌ HTTP 404 — corpo do webhook inválido ou workspace não encontrado.');
  } else if (r.status === 429) {
    console.log('\n   ⚠️  Rate limit. Aguarde 1 minuto.');
  } else if (r.status >= 500) {
    console.log('\n   ❌ ERRO INTERNO no servidor Vysify. Verifique o terminal do Next.js.');
  } else {
    console.log(`\n   ⚠️  Resposta inesperada.`);
  }
} catch (e) {
  if (e.code === 'ECONNREFUSED' || e.message?.includes('ECONNREFUSED') || e.message?.includes('fetch failed')) {
    console.log(`\n   ❌ Servidor não está rodando em ${APP_URL}`);
    console.log('   → Execute em outro terminal: npm run dev');
    console.log('   → Ou altere APP_URL no .env para a URL de produção.');
  } else {
    console.log('\n   ❌ Erro:', e.message);
  }
}

// ──────────────────────────────────────────────────────────────
//  STEP 5 — Verificar URL do webhook no painel Meta
// ──────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════');
console.log('  STEP 5 — URL do webhook que deve estar configurada na Meta');
console.log('══════════════════════════════════════════════════════════');

// Detecta URL pública pelo APP_URL
const prodUrl = APP_URL.replace('http://localhost:3000', 'https://SEU-DOMINIO.vercel.app');
console.log(`   URL do webhook (copie para o painel Meta):`);
console.log(`   ${APP_URL}/api/integrations/whatsapp/webhook?workspace=${WORKSPACE_SLUG}`);
console.log(`\n   Verify Token configurado no banco: ${creds.verifyToken || '⚠️  VAZIO — configure na integração!'}`);
console.log(`\n   ⚠️  ATENÇÃO: Se você está em localhost, a Meta NÃO consegue fazer POST no seu servidor!`);
console.log(`   → Use ngrok para expor a porta 3000: npx ngrok http 3000`);
console.log(`   → Ou faça o deploy no Vercel e use a URL de produção.`);

console.log('\n══════════════════════════════════════════════════════════');
console.log('  DIAGNÓSTICO CONCLUÍDO');
console.log('══════════════════════════════════════════════════════════\n');
