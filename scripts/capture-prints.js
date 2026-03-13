const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  const mockupsDir = path.join(__dirname, '../public/images/mockups');
  if (!fs.existsSync(mockupsDir)) {
    fs.mkdirSync(mockupsDir, { recursive: true });
  }

  console.log('🚀 Iniciando Browser...');
  const browser = await puppeteer.launch({ 
    headless: "new", 
    defaultViewport: { width: 1920, height: 1080 } 
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('Navegando para o Login...');
    await page.goto('http://localhost:3000/auth/login', { waitUntil: 'networkidle0', timeout: 60000 });
    
    console.log('Fazendo Login como Usuário Premium...');
    await page.type('input[type="email"]', 'lucas_premium@example.com');
    await page.type('input[type="password"]', 'SenhaForte123!');
    await page.click('button[type="submit"]');
    
    // Aguarda o login concluir
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 });
    
    // Pode ser que caia em /account. Redirecionando para as páginas que interessam:
    const baseUrl = 'http://localhost:3000/account/acme-corp-premium';
    
    // 1. Dashboard
    console.log('📸 Acessando Dashboard...');
    await page.goto(baseUrl, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000)); // Wait for charts to render
    await page.screenshot({ path: path.join(mockupsDir, 'dashboard.png') });
    console.log('➡️ dashboard.png salvo!');

    // 2. Pipeline (Funil)
    console.log('📸 Acessando Pipeline...');
    await page.goto(`${baseUrl}/pipeline`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(mockupsDir, 'pipeline.png') });
    console.log('➡️ pipeline.png salvo!');

    // 3. Inbox (Conversas)
    console.log('📸 Acessando Inbox (WhatsApp)...');
    await page.goto(`${baseUrl}/inbox`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(mockupsDir, 'inbox.png') });
    console.log('➡️ inbox.png salvo!');

  } catch (error) {
    console.error('Erro ao tirar prints:', error);
  } finally {
    await browser.close();
    console.log('✅ Prints finalizados com sucesso.');
  }
})();
