const { chromium } = require(process.cwd() + '/node_modules/playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' });
  await p.goto(process.argv[2], { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForTimeout(6000);
  const d = await p.evaluate(() => [...document.querySelectorAll('iframe, blockquote.instagram-media, a[href*="instagram.com"], a[href*="gofundme"]')].map(e => e.tagName+' '+(e.src||e.href||e.getAttribute('data-instgrm-permalink')||'')));
  console.log(d.join('\n'));
  await b.close();
})();
