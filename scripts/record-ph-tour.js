const puppeteer = require('puppeteer');

// Configurações da simulação
const BASE_URL = 'http://localhost:3000';
const WORKSPACE_SLUG = 'acme-corp-premium'; // Ajuste se seu workspace principal tiver outro slug

// Helper para pausas
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  console.log('🚀 Iniciando Robô de Gravação do Product Hunt...');
  
  // 1. Abre o navegador na resolução ideal para o vídeo (1920x1080)
  const browser = await puppeteer.launch({
    headless: false, // Deixa a tela visível para você gravar
    defaultViewport: null,
    args: ['--window-size=1920,1080', '--start-maximized']
  });

  const pages = await browser.pages();
  const page = pages[0];
  await page.setViewport({ width: 1920, height: 1080 });

  console.log('🌐 Acessando a página de login...');
  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded' });

  // 2. Tempo para Login Manual
  console.log('\n⚠️  VOCÊ TEM 15 SEGUNDOS PARA FAZER O LOGIN E ABRIR O SEU GRAVADOR DE TELA!');
  console.log('👉 Digite e-mail e senha, clique em entrar e espere.');
  
  for(let i = 15; i > 0; i--) {
    process.stdout.write(`\r⏳ O robô assume o controle em ${i} segundos... `);
    await sleep(1000);
  }
  console.log('\n\n🎬 AÇÃO! O robô assumiu o controle. COMECE A GRAVAR AGORA!');

  // Helper para simular scroll suave (como se fosse um humano rodando a rodinha do mouse)
  async function smoothScroll() {
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          if(totalHeight >= scrollHeight / 2) { // Rola até a metade
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
    await sleep(1000); // Pausa depois de rolar
    // Volta para o topo
    await page.evaluate(() => window.scrollTo(0, 0));
  }

  // -------------------------------------------------------------
  // CENA 1: Pipeline / Kanban (10 segundos)
  // -------------------------------------------------------------
  console.log('📽️  Cena 1: Pipeline (Kanban)');
  await page.goto(`${BASE_URL}/account/${WORKSPACE_SLUG}/pipeline`, { waitUntil: 'domcontentloaded' });
  await sleep(2000); // Mostra a tela carregada
  // Simula o mouse passeando pelos cards
  await page.mouse.move(500, 300, { steps: 20 });
  await sleep(500);
  await page.mouse.move(900, 400, { steps: 30 });
  await sleep(2000);
  await smoothScroll();
  await sleep(2000);

  // -------------------------------------------------------------
  // CENA 2: Automações (10 segundos)
  // -------------------------------------------------------------
  console.log('📽️  Cena 2: Automações');
  await page.goto(`${BASE_URL}/account/${WORKSPACE_SLUG}/automations`, { waitUntil: 'domcontentloaded' });
  await sleep(3000); // Admira as automações
  await page.mouse.move(600, 500, { steps: 25 });
  await sleep(1000);
  await smoothScroll();
  await sleep(2000);

  // -------------------------------------------------------------
  // CENA 3: Contatos / CRM List (10 segundos)
  // -------------------------------------------------------------
  console.log('📽️  Cena 3: Lista de Contatos do CRM');
  await page.goto(`${BASE_URL}/account/${WORKSPACE_SLUG}/contacts`, { waitUntil: 'networkidle2' });
  await sleep(2000);
  await page.mouse.move(300, 600, { steps: 20 });
  await sleep(1000);
  await smoothScroll();
  await sleep(2000);

  // -------------------------------------------------------------
  // CENA 4: Dashboard / Analytics (10 segundos)
  // -------------------------------------------------------------
  console.log('📽️  Cena 4: Analytics');
  await page.goto(`${BASE_URL}/account/${WORKSPACE_SLUG}`, { waitUntil: 'networkidle2' });
  await sleep(3000); // Deixa os gráficos carregarem
  await page.mouse.move(1000, 400, { steps: 40 }); // Passeia pelo gráfico
  await smoothScroll();
  await sleep(3000);

  console.log('\n✅ CORTE! Gravação finalizada com sucesso!');
  
  // Mantém aberto por 5 segundos antes de fechar
  await sleep(5000);
  await browser.close();
}

main().catch(err => console.error(err));
