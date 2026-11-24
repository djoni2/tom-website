const { chromium } = require(process.cwd() + '/node_modules/playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36' });
  await p.goto(process.argv[2], { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForTimeout(5000);
  const d = await p.evaluate(() => {
    const h1 = document.querySelector('h1');
    let el = h1; while (el && el.innerText.length < 400) el = el.parentElement;
    const meta = [...document.querySelectorAll('meta[property^="article:"], meta[name="author"], meta[property="og:image"]')].map(m => (m.getAttribute('property')||m.getAttribute('name')) + '=' + m.content);
    return { meta, text: el?.innerText.slice(0, 5000) };
  });
  console.log(d.meta.join('\n')); console.log(d.text);
  await b.close();
})();
