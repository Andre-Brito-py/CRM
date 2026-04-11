/**
 * DIAGNÓSTICO COMPLETO DO OMNICHANNEL WHATSAPP
 * 
 * Testa dois sentidos:
 *   1. OUTBOUND — Envia mensagem do Vysify para o seu número via Meta API
 *   2. INBOUND  — Simula o webhook que a Meta enviaria para o Vysify (POST local)
 * 
 * COMO USAR:
 *   1. Preencha as variáveis abaixo
 *   2. Execute: node scratch/test_omnichannel.mjs
 */

// ============================================================
// ⚙️  PREENCHA AQUI COM SEUS DADOS
// ============================================================

const ACCESS_TOKEN    = 'COLE_O_TOKEN_AQUI';       // Token de acesso do painel Meta
const PHONE_NUMBER_ID = 'COLE_O_PHONE_NUMBER_ID';  // Ex: 108250537827626
const TO_NUMBER       = 'COLE_O_SEU_NUMERO';        // Ex: 5583988758839 (sem + ou espaços)
const WORKSPACE_SLUG  = 'COLE_O_SLUG_DO_WORKSPACE'; // Slug do workspace no Vysify
const APP_URL         = 'http://localhost:3000';      // URL local ou produção

// ============================================================

const API_VERSION = 'v25.0';

const clean = (num) => String(num).replace(/\D/g, '');
const addNineBR = (num) => {
  const n = clean(num);
  if (n.length === 12 && n.startsWith('55')) return n.slice(0, 4) + '9' + n.slice(4);
  return n;
};

const finalNumber = addNineBR(TO_NUMBER);

console.log('\n══════════════════════════════════════════════════════════');
console.log('  DIAGNÓSTICO OMNICHANNEL WHATSAPP — VYSIFY CRM');
console.log('══════════════════════════════════════════════════════════');
console.log(`📞 Número destino: ${TO_NUMBER} → limpo: ${finalNumber} (${finalNumber.length} dígitos)`);
console.log(`🔑 Phone Number ID: ${PHONE_NUMBER_ID}`);
console.log(`🏢 Workspace: ${WORKSPACE_SLUG}`);
console.log(`🌐 App URL: ${APP_URL}`);
console.log('══════════════════════════════════════════════════════════\n');

// ──────────────────────────────────────────────────────────────
// PASSO 1 — Verificar token
// ──────────────────────────────────────────────────────────────
console.log('📡 [1/4] Verificando token de acesso da Meta...');
try {
  const r = await fetch(
    `https://graph.facebook.com/debug_token?input_token=${ACCESS_TOKEN}&access_token=${ACCESS_TOKEN}`
  );
  const d = await r.json();
  if (d.data?.is_valid === false) {
    console.log('   ❌ TOKEN INVÁLIDO ou EXPIRADO!');
    console.log('   → Gere um novo token em: developers.facebook.com → seu App → WhatsApp → API Setup');
    process.exit(1);
  } else if (d.data) {
    const exp = d.data.expires_at ? new Date(d.data.expires_at * 1000) : null;
    const expired = exp && exp < new Date();
    console.log(`   ✅ Token válido | Tipo: ${d.data.type} | App: ${d.data.app_id}`);
    if (exp) console.log(`   ⏰ Expira: ${exp.toLocaleString('pt-BR')}${expired ? ' ❌ JÁ EXPIROU' : ''}`);
    else console.log('   ♾️  Token permanente (sem expiração)');
    if (d.data.scopes) console.log(`   Escopos: ${d.data.scopes.join(', ')}`);
  } else {
    console.log('   ⚠️  Não foi possível validar token:', JSON.stringify(d));
  }
} catch (e) {
  console.log('   ⚠️  Falha ao verificar token:', e.message);
}

// ──────────────────────────────────────────────────────────────
// PASSO 2 — Verificar Phone Number ID e modo (Sandbox / Live)
// ──────────────────────────────────────────────────────────────
console.log('\n📡 [2/4] Verificando Phone Number ID e modo do app...');
let accountMode = null;
try {
  const r = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}?fields=display_phone_number,verified_name,quality_rating,status,account_mode`,
    { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } }
  );
  const d = await r.json();
  if (d.error) {
    console.log(`   ❌ ERRO: ${d.error.message}`);
    console.log(`   Código: ${d.error.code} | Subtipo: ${d.error.error_subcode}`);
    if (d.error.code === 100) console.log('   💡 Phone Number ID incorreto ou sem permissão.');
    if (d.error.code === 190) console.log('   💡 Token inválido/expirado.');
  } else {
    accountMode = d.account_mode;
    console.log(`   Número: ${d.display_phone_number} | Nome: ${d.verified_name}`);
    console.log(`   Status: ${d.status} | Qualidade: ${d.quality_rating}`);
    if (accountMode === 'SANDBOX') {
      console.log('   ⚠️  MODO: SANDBOX — Só envia/recebe de números registrados na lista de teste!');
      console.log('   → Verifique: developers.facebook.com → seu App → WhatsApp → Números de telefone para testes');
    } else if (accountMode === 'LIVE') {
      console.log('   ✅ MODO: LIVE — Pode enviar para qualquer número');
    } else {
      console.log(`   ℹ️  MODO: ${accountMode || 'desconhecido'}`);
    }
  }
} catch (e) {
  console.log('   ⚠️  Falha ao verificar Phone Number:', e.message);
}

// ──────────────────────────────────────────────────────────────
// PASSO 3 — OUTBOUND: Envia mensagem do Vysify → seu número
// ──────────────────────────────────────────────────────────────
console.log('\n📡 [3/4] OUTBOUND — Enviando mensagem diretamente via Meta API...');
const metaUrl = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`;
const payload = {
  messaging_product: 'whatsapp',
  to: finalNumber,
  type: 'text',
  text: { body: '🔧 [Vysify] Teste de diagnóstico #outbound — se você recebeu isto, o envio está funcionando!' },
};

console.log('   Payload:', JSON.stringify(payload));

try {
  const r = await fetch(metaUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const d = await r.json();
  console.log(`   HTTP ${r.status}:`, JSON.stringify(d, null, 2));

  if (d.error) {
    const codes = {
      131030: 'Número NÃO está na lista de teste (modo Sandbox). Adicione o número em developers.facebook.com.',
      131047: 'Janela de 24h expirada. Use um Template aprovado.',
      131026: 'Número de telefone inválido ou não existe no WhatsApp.',
      100: 'Parâmetro inválido — verifique Phone Number ID.',
      190: 'TOKEN INVÁLIDO ou EXPIRADO.',
      200: 'Permissão negada — falta escopo whatsapp_business_messaging.',
    };
    console.log(`\n   ❌ ERRO META API: ${d.error.message}`);
    if (codes[d.error.code]) console.log(`   💡 ${codes[d.error.code]}`);
  } else if (d.messages?.[0]?.id) {
    console.log('\n   ✅ MENSAGEM ACEITA PELA META — wamid:', d.messages[0].id);
    if (accountMode === 'SANDBOX') {
      console.log('   ⚠️  App em SANDBOX: a mensagem só chegará se seu número estiver na lista de teste!');
    } else {
      console.log('   📱 Verifique seu WhatsApp agora. Se não chegou, pode ser:');
      console.log('   → Número de destino incorreto (verifique o código do país)');
      console.log('   → Conta Meta precisa ser publicada (Live Mode)');
    }
  }
} catch (e) {
  console.log('   ❌ Falha na requisição HTTP:', e.message);
}

// ──────────────────────────────────────────────────────────────
// PASSO 4 — INBOUND: Simula webhook da Meta chegando no Vysify
// ──────────────────────────────────────────────────────────────
console.log('\n📡 [4/4] INBOUND — Simulando webhook da Meta chegando no Vysify...');
const webhookUrl = `${APP_URL}/api/integrations/whatsapp/webhook?workspace=${WORKSPACE_SLUG}`;

// Payload exato que a Meta envia quando uma mensagem é recebida
const webhookPayload = {
  object: 'whatsapp_business_account',
  entry: [
    {
      id: 'SIMULATE_ENTRY',
      changes: [
        {
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '15550000000',
              phone_number_id: PHONE_NUMBER_ID,
            },
            contacts: [
              {
                profile: { name: 'Teste Diagnóstico' },
                wa_id: finalNumber,
              },
            ],
            messages: [
              {
                from: finalNumber,
                id: `wamid.TEST_${Date.now()}`,
                timestamp: String(Math.floor(Date.now() / 1000)),
                text: { body: '🔧 [Teste] Mensagem inbound simulada pelo diagnóstico' },
                type: 'text',
              },
            ],
          },
          field: 'messages',
        },
      ],
    },
  ],
};

console.log(`   URL do webhook: ${webhookUrl}`);
console.log('   Payload:', JSON.stringify(webhookPayload, null, 2));

try {
  const r = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(webhookPayload),
  });
  const text = await r.text();
  console.log(`\n   HTTP ${r.status}: "${text}"`);

  if (r.status === 200) {
    console.log('   ✅ WEBHOOK RECEBIDO COM SUCESSO pelo Vysify!');
    console.log('   → Verifique no Inbox do Vysify se a conversa apareceu.');
  } else if (r.status === 400) {
    console.log('   ❌ HTTP 400 — Provável causa: parâmetro "workspace" não encontrado no banco.');
    console.log(`   → Verifique se o slug "${WORKSPACE_SLUG}" existe no Vysify.`);
  } else if (r.status === 404) {
    console.log('   ❌ HTTP 404 — O corpo do webhook não tem "object" válido OU workspace não encontrado.');
  } else if (r.status === 429) {
    console.log('   ⚠️  Rate limit atingido. Aguarde 1 minuto e tente novamente.');
  } else if (r.status >= 500) {
    console.log('   ❌ Erro interno no servidor Vysify. Verifique os logs do Next.js.');
  } else {
    console.log(`   ⚠️  Resposta inesperada: ${r.status}`);
  }
} catch (e) {
  if (e.message.includes('ECONNREFUSED') || e.message.includes('fetch failed')) {
    console.log(`   ❌ Não foi possível conectar ao Vysify em ${APP_URL}`);
    console.log('   → Certifique-se de que o servidor Next.js está rodando: npm run dev');
  } else {
    console.log('   ❌ Erro ao chamar webhook:', e.message);
  }
}

console.log('\n══════════════════════════════════════════════════════════');
console.log('  DIAGNÓSTICO CONCLUÍDO');
console.log('══════════════════════════════════════════════════════════');
console.log('Se algum passo falhou, corrija o problema indicado e execute novamente.');
console.log('Para mais detalhes, veja: scratch/diagnose_whatsapp.mjs\n');
