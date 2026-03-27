const puppeteer = require('puppeteer');

(async () => {
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        
        // Simulate Android Chrome
        await page.setUserAgent('Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36');
        
        await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
        
        // Wait a bit for setTimeout injected by Vue or PwaPrompt
        await new Promise(r => setTimeout(r, 4000));
        
        const pwaPrompt = await page.evaluate(() => {
            const el = document.getElementById('pwa-prompt-container');
            return el ? el.innerHTML : null;
        });
        
        console.log('pwa-prompt-container DOM:');
        console.log(pwaPrompt || 'NOT_FOUND');
        
        await browser.close();
    } catch (e) {
        console.error(e);
    }
})();
