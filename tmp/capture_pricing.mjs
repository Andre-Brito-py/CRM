import puppeteer from 'puppeteer';

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1080 });
  
  console.log('Navigating to http://localhost:3000/#pricing...');
  await page.goto('http://localhost:3000/#pricing', { waitUntil: 'networkidle0' });
  
  // Wait a bit for animations
  await new Promise(r => setTimeout(r, 2000));
  
  console.log('Scrolling to pricing section...');
  await page.evaluate(() => {
    const el = document.getElementById('pricing');
    if (el) {
      el.scrollIntoView({ behavior: 'instant', block: 'center' });
    } else {
      window.scrollBy(0, 1500); // fallback
    }
  });
  
  await new Promise(r => setTimeout(r, 1000));
  
  const screenshotPath = 'c:\\Users\\Usuário\\.gemini\\antigravity\\brain\\0b828768-5190-411f-97c1-09993fa174cf\\dynamic_pricing_verification.png';
  console.log(`Taking screenshot at ${screenshotPath}...`);
  await page.screenshot({ path: screenshotPath });
  
  await browser.close();
  console.log('Done!');
})();
