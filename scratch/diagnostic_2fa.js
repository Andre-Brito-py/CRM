const { TOTP } = require('otplib');
const QRCode = require('qrcode');

async function test() {
  console.log('--- DIAGNÓSTICO DE DEPENDÊNCIAS 2FA ---');
  
  try {
    console.log('Testando otplib (TOTP)...');
    // Na v13, o authenticator pode ser uma instância de TOTP com configurações específicas
    const secret = 'JBSWY3DPEHPK3PXP'; // Exemplo
    const token = '123456';
    console.log('TOTP Type:', typeof TOTP);
    
    // Tentando o import direto que o Next.js usa
    const otplib = require('otplib');
    console.log('Otplib Keys:', Object.keys(otplib));
    
    console.log('Testando QRCode...');
    const svg = await QRCode.toString('otpauth://test', { type: 'svg' });
    console.log('QRCode SVG gerado com sucesso (tamanho):', svg.length);
    
    console.log('--- SUCESSO NO DIAGNÓSTICO ---');
  } catch (error) {
    console.error('--- FALHA NO DIAGNÓSTICO ---');
    console.error(error);
  }
}

test();
