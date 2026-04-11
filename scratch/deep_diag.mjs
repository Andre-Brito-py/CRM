/**
 * Diagnóstico avançado — testa produção e numeros exatamente como estão no banco
 */
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

const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

const integrations = await prisma.integration.findMany({
  where: { provider: { in: ['WHATSAPP', 'whatsapp'] } },
  include: { workspace: { select: { slug: true, name: true } } },
  orderBy: { createdAt: 'desc' },
});

const activeIntegration = integrations.find(i => i.enabled) || integrations[0];
const creds = typeof activeIntegration.credentials === 'string'
  ? JSON.parse(activeIntegration.credentials || '{}')
  : (activeIntegration.credentials || {});

const ACCESS_TOKEN    = creds.accessToken || '';
const PHONE_NUMBER_ID = creds.phoneNumberId || '';
const WORKSPACE_SLUG  = activeIntegration.workspace.slug;
const API_VERSION     = 'v25.0';

// Pega contatos com telefones salvos
const contacts = await prisma.contact.findMany({
  where: { workspace: { slug: WORKSPACE_SLUG }, phone: { not: null } },
  take: 5,
  orderBy: { updatedAt: 'desc' },
  select: { id: true, name: true, phone: true },
});

await prisma.$disconnect();

console.log('\n══════════════════════════════════════════════════════════');
console.log('  DIAGNÓSTICO AVANÇADO — PROBLEMA IDENTIFICADO');
console.log('══════════════════════════════════════════════════════════');

// ──────────────────────────────────────────────────────────────
// BUG CRÍTICO #1 — Verificar Phone Number ID
// ──────────────────────────────────────────────────────────────
console.log('\n🔴 [TESTE A] Phone Number ID salvo no banco vs Meta');
console.log(`   Banco:  "${PHONE_NUMBER_ID}" (${PHONE_NUMBER_ID.length} dígitos)`);

// Busca o ID real na Meta
try {
  const r = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}?fields=id,display_phone_number`,
    { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } }
  );
  const d = await r.json();
  if (d.error) {
    console.log(`   ❌ Meta rejeita este Phone Number ID: ${d.error.message}`);
  } else {
    console.log(`   Meta retorna ID: "${d.id}" | Número: ${d.display_phone_number}`);
    if (String(d.id) !== String(PHONE_NUMBER_ID)) {
      console.log(`   ⚠️  IDs DIFERENTES! Banco tem "${PHONE_NUMBER_ID}" mas Meta retornou "${d.id}"`);
    } else {
      console.log('   ✅ Phone Number ID correto');
    }
  }
} catch(e) {
  console.log('   Erro:', e.message);
}

// ──────────────────────────────────────────────────────────────
// BUG CRÍTICO #2 — Números de telefone dos contatos
// ──────────────────────────────────────────────────────────────
console.log('\n🔴 [TESTE B] Formato dos números no banco vs formato esperado pela Meta');
console.log('   A Meta exige números com código do país (ex: 5583988758839).');
console.log('   Números sem "55" at the start NÃO chegam ao destino.\n');

contacts.forEach(c => {
  const phone = String(c.phone || '');
  const hasBR = phone.startsWith('55');
  const len = phone.replace(/\D/g, '').length;
  console.log(`   Contato: ${c.name} | Telefone: "${phone}" | ${len} dígitos | ${hasBR ? '✅ tem 55' : '❌ SEM código 55!'}`);
  if (!hasBR) {
    const fixed = `55${phone.replace(/\D/g, '')}`;
    console.log(`   → O Vysify envia para "${phone}" mas deveria ser "${fixed}"`);
  }
});

// ──────────────────────────────────────────────────────────────
// BUG CRÍTICO #3 — Envia mensagem real para o número de teste com o número CORRETO
// ──────────────────────────────────────────────────────────────
console.log('\n🔴 [TESTE C] Tentativa de envio outbound REAL com número completo (55 + número)');

// Pega o primeiro contato e testa os dois formatos
const testContact = contacts[0];
if (testContact) {
  const rawPhone = String(testContact.phone || '').replace(/\D/g, '');
  const withCountry = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
  
  console.log(`   Contato: ${testContact.name}`);
  console.log(`   Número no banco: "${testContact.phone}"`);
  console.log(`   Número que será testado: "${withCountry}"`);

  const payload = {
    messaging_product: 'whatsapp',
    to: withCountry,
    type: 'text',
    text: { body: '🔧 [Vysify Diagnóstico] Se você recebeu esta mensagem, o envio está funcionando corretamente!' },
  };

  try {
    const r = await fetch(`https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const d = await r.json();
    console.log(`\n   HTTP ${r.status}:`, JSON.stringify(d, null, 2));

    if (d.error) {
      const erros = {
        131030: '❌ Número NÃO está na lista de teste do Sandbox. Adicione em: developers.facebook.com → WhatsApp → Configuração da API',
        131026: '❌ Número de telefone inválido ou não tem WhatsApp.',
        190: '❌ Token expirado.',
        131047: '❌ Fora da janela de 24h — use template.',
      };
      console.log(`\n   FALHA: ${d.error.message}`);
      if (erros[d.error.code]) console.log(`   ${erros[d.error.code]}`);
    } else if (d.messages?.[0]?.id) {
      console.log(`\n   ✅ MENSAGEM ENVIADA COM SUCESSO! wamid: ${d.messages[0].id}`);
      console.log('   → Verifique o WhatsApp agora. Se não chegou, o app está em modo Sandbox e');
      console.log('     o número não está na lista de teste.');
    }
  } catch(e) {
    console.log('   Erro HTTP:', e.message);
  }
} else {
  console.log('   ⚠️  Nenhum contato encontrado para testar.');
}

// ──────────────────────────────────────────────────────────────
// BUG #4 — Testa webhook de produção (Vercel)
// ──────────────────────────────────────────────────────────────
console.log('\n🔴 [TESTE D] Simulando webhook inbound direto na produção (Vercel)');

// Detecta URL de produção do APP_URL
const appUrl = process.env.APP_URL || 'http://localhost:3000';
const prodUrl = appUrl.includes('localhost')
  ? 'https://vysify.com' // fallback — tenta o domínio de produção
  : appUrl;

const webhookUrl = `${prodUrl}/api/integrations/whatsapp/webhook?workspace=${WORKSPACE_SLUG}`;
console.log(`   Testando: ${webhookUrl}`);

const fakeFrom = '5511999990001';
const webhookPayload = {
  object: 'whatsapp_business_account',
  entry: [{
    id: 'SIMULATE',
    changes: [{
      value: {
        messaging_product: 'whatsapp',
        metadata: { display_phone_number: '+1 555-637-6850', phone_number_id: PHONE_NUMBER_ID },
        contacts: [{ profile: { name: 'Diagnóstico Vysify' }, wa_id: fakeFrom }],
        messages: [{
          from: fakeFrom,
          id: `wamid.DIAG_${Date.now()}`,
          timestamp: String(Math.floor(Date.now() / 1000)),
          text: { body: '🔧 Mensagem de diagnóstico automático — inbound simulado' },
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
    console.log('   ✅ Webhook respondeu corretamente!');
    console.log(`   → Verifique no Inbox se apareceu conversa do número ${fakeFrom}`);
  } else if (r.status === 404) {
    const parsed = (() => { try { return JSON.parse(text); } catch { return null; } })();
    if (parsed?.error === 'Verification failed' || text.includes('Verification')) {
      console.log('   ❌ Workspace slug não encontrado ou verify_token incorreto');
    } else {
      console.log('   ❌ Webhook retornou 404 — body sem campo "object" válido ou workspace inválido');
    }
  } else if (r.status === 400) {
    console.log(`   ❌ HTTP 400 — workspace "${WORKSPACE_SLUG}" não encontrado na rota do webhook`);
  }
} catch(e) {
  if (e.message?.includes('fetch failed') || e.code === 'ECONNREFUSED') {
    console.log(`   ❌ Não conseguiu conectar em ${prodUrl}`);
    console.log('   → Verifique se vysifc.com está acessível');
  } else {
    console.log('   ❌ Erro:', e.message);
  }
}

// ──────────────────────────────────────────────────────────────
// RESUMO
// ──────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════');
console.log('  RESUMO DO QUE VERIFICAR NO PAINEL META');
console.log('══════════════════════════════════════════════════════════');
console.log(`
  1. O app está em SANDBOX — apenas "Test Number" pode ENVIAR.
     Para RECEBER no seu número (+55 83 98695-2426):
     → Certifique-se que este número está como destinatário de teste em:
        developers.facebook.com → seu App → WhatsApp → Configuração da API

  2. O webhook URL no painel Meta deve ser EXATAMENTE:
     ${prodUrl}/api/integrations/whatsapp/webhook?workspace=${WORKSPACE_SLUG}

  3. O Verify Token no painel Meta deve ser: vysify123
  
  4. O webhook precisa estar inscrito em: messages, message_deliveries
`);
