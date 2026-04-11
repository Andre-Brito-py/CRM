/**
 * DIAGNÓSTICO COMPLETO DO WHATSAPP — Meta Cloud API
 * 
 * Este script testa DIRETAMENTE a Meta API, ignorando o código do CRM.
 * Ele revela exatamente qual erro ou aviso a Meta retorna.
 *
 * COMO USAR:
 *   1. Preencha as variáveis abaixo com os dados do seu painel Meta
 *   2. Execute: node scratch/diagnose_whatsapp.mjs
 */

// ============================================================
// ⚙️  PREENCHA AQUI COM SEUS DADOS
// ============================================================

const ACCESS_TOKEN   = 'COLE_O_TOKEN_AQUI';       // "Gerar token de acesso" no painel Meta
const PHONE_NUMBER_ID = 'COLE_O_PHONE_NUMBER_ID';  // Ex: 108250537827626
const TO_NUMBER       = 'COLE_O_NUMERO_DESTINO';   // Ex: 5583988758839 (sem + ou espaços)

// ============================================================

const API_VERSION = 'v25.0';
const url = `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}/messages`;

// Mostra o número exatamente como será enviado à Meta
const cleanNumber = TO_NUMBER.replace(/\D/g, '');
console.log('\n══════════════════════════════════════════════════');
console.log(' DIAGNÓSTICO WHATSAPP — META CLOUD API');
console.log('══════════════════════════════════════════════════');
console.log(`📞 Número destino (limpo): ${cleanNumber}`);
console.log(`   Comprimento: ${cleanNumber.length} dígitos`);

if (cleanNumber.length === 12 && cleanNumber.startsWith('55')) {
  console.log('⚠️  AVISO: 12 dígitos BR detectados — o 9º dígito está FALTANDO!');
  console.log(`   Enviando como: ${cleanNumber.slice(0,4)}9${cleanNumber.slice(4)} (com 9 adicionado)`);
} else if (cleanNumber.length === 13 && cleanNumber.startsWith('55')) {
  console.log('✅ Número brasileiro com 9º dígito: OK');
} else {
  console.log(`ℹ️  Número internacional: ${cleanNumber.length} dígitos`);
}

console.log(`\n🔑 Phone Number ID: ${PHONE_NUMBER_ID}`);
console.log(`🔗 URL: ${url}`);
console.log('══════════════════════════════════════════════════\n');

// 1. Verifica o token (quem sou eu)
console.log('📡 Passo 1: Verificando token de acesso...');
try {
  const debugRes = await fetch(`https://graph.facebook.com/debug_token?input_token=${ACCESS_TOKEN}&access_token=${ACCESS_TOKEN}`);
  const debugData = await debugRes.json();
  
  if (debugData.data) {
    const d = debugData.data;
    console.log(`   App ID: ${d.app_id}`);
    console.log(`   Tipo de token: ${d.type}`);
    console.log(`   Válido: ${d.is_valid}`);
    
    if (d.expires_at) {
      const exp = new Date(d.expires_at * 1000);
      const now = new Date();
      if (exp < now) {
        console.log(`   ❌ TOKEN EXPIRADO em ${exp.toLocaleString('pt-BR')}`);
      } else {
        console.log(`   ⏰ Expira em: ${exp.toLocaleString('pt-BR')}`);
      }
    } else {
      console.log('   ♾️  Token sem expiração (token de sistema permanente) ✅');
    }
    
    if (d.scopes) {
      const hasWA = d.scopes.some(s => s.includes('whatsapp') || s.includes('business'));
      console.log(`   Escopos WhatsApp: ${hasWA ? '✅' : '❌ FALTANDO whatsapp_business_messaging'}`);
      console.log(`   Escopos: ${d.scopes.join(', ')}`);
    }
  } else {
    console.log('   ⚠️  Não foi possível validar o token (endpoint debug_token falhou)');
    console.log('   Resposta:', JSON.stringify(debugData, null, 2));
  }
} catch (e) {
  console.log('   ⚠️  Falha ao verificar token:', e.message);
}

// 2. Verifica o Phone Number ID
console.log('\n📡 Passo 2: Verificando Phone Number ID...');
try {
  const phoneRes = await fetch(
    `https://graph.facebook.com/${API_VERSION}/${PHONE_NUMBER_ID}?fields=display_phone_number,verified_name,quality_rating,status,account_mode`,
    { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } }
  );
  const phoneData = await phoneRes.json();
  
  if (phoneData.error) {
    console.log(`   ❌ ERRO: ${phoneData.error.message}`);
    console.log(`   Código: ${phoneData.error.code} | Subtipo: ${phoneData.error.error_subcode}`);
  } else {
    console.log(`   Número: ${phoneData.display_phone_number}`);
    console.log(`   Nome verificado: ${phoneData.verified_name}`);
    console.log(`   Status: ${phoneData.status}`);
    console.log(`   Qualidade: ${phoneData.quality_rating}`);
    
    if (phoneData.account_mode) {
      const mode = phoneData.account_mode;
      if (mode === 'SANDBOX') {
        console.log(`   ⚠️  MODO: SANDBOX — só envia para números de teste registrados!`);
      } else if (mode === 'LIVE') {
        console.log(`   ✅ MODO: LIVE — pode enviar para qualquer número`);
      } else {
        console.log(`   ℹ️  MODO: ${mode}`);
      }
    }
  }
} catch (e) {
  console.log('   Falha ao verificar Phone Number:', e.message);
}

// 3. Tenta enviar a mensagem real
console.log('\n📡 Passo 3: Enviando mensagem de teste...');

const finalNumber = (() => {
  const n = cleanNumber;
  if (n.length === 12 && n.startsWith('55')) {
    return n.slice(0,4) + '9' + n.slice(4); // adiciona 9
  }
  return n;
})();

const payload = {
  messaging_product: 'whatsapp',
  to: finalNumber,
  type: 'text',
  text: { body: '🔧 Teste de diagnóstico do Vysify CRM' },
};

console.log('   Payload enviado:', JSON.stringify(payload, null, 2));

try {
  const sendRes = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const sendData = await sendRes.json();
  
  console.log(`\n   HTTP Status: ${sendRes.status} ${sendRes.statusText}`);
  console.log('   Resposta Meta:');
  console.log(JSON.stringify(sendData, null, 2));

  if (sendData.error) {
    console.log('\n══════════════════════════════════════════════════');
    console.log('❌ ERRO DA META API IDENTIFICADO:');
    console.log(`   Mensagem: ${sendData.error.message}`);
    console.log(`   Tipo: ${sendData.error.type}`);
    console.log(`   Código: ${sendData.error.code}`);
    
    // Explicação dos códigos de erro mais comuns
    const errorExplanations = {
      131030: '❗ Número de destino NÃO está na lista de números de teste registrados.',
      131047: '❗ Re-engagement proibido — a janela de 24h expirou. Use um Template Aprovado.',
      131026: '❗ Número de telefone inválido ou não existe no WhatsApp.',
      100:    '❗ Parâmetro inválido — verifique o Phone Number ID ou o número de destino.',
      190:    '❗ TOKEN INVÁLIDO ou EXPIRADO.',
      200:    '❗ Permissão negada — o token não tem escopo whatsapp_business_messaging.',
    };
    
    const explanation = errorExplanations[sendData.error.code];
    if (explanation) {
      console.log(`\n   💡 EXPLICAÇÃO: ${explanation}`);
    }
    console.log('══════════════════════════════════════════════════\n');
  } else if (sendData.messages?.[0]?.id) {
    console.log('\n══════════════════════════════════════════════════');
    console.log('✅ MENSAGEM ACEITA PELA META API');
    console.log(`   Message ID (wamid): ${sendData.messages[0].id}`);
    console.log('\n   ⚠️  Se a mensagem foi aceita MAS não chegou, o problema é:');
    console.log('   → App em modo SANDBOX/Desenvolvimento: número destino não está na lista de teste');
    console.log('   → OU: o App não está em modo LIVE');
    console.log('   → Acesse: developers.facebook.com → seu App → WhatsApp → Configuração da API');
    console.log('   → Certifique-se que o App foi publicado (Live Mode)');
    console.log('══════════════════════════════════════════════════\n');
  }
} catch (e) {
  console.log('   ❌ Falha na requisição HTTP:', e.message);
}
