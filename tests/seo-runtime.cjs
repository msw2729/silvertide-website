// Run with Node and Playwright installed. All external requests are intercepted.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const endpoint = 'https://formspree.io/f/xppqljkw';
const server = http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname); }
  catch (_) { res.writeHead(400).end(); return; }
  let filename = path.resolve(root, '.' + pathname);
  const relative = path.relative(root, filename);
  if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) { res.writeHead(403).end(); return; }
  fs.stat(filename, (err, stat) => {
    if (err) { res.writeHead(404).end(); return; }
    if (stat.isDirectory()) filename = path.join(filename, 'index.html');
    fs.readFile(filename, (readError, data) => {
      if (readError) { res.writeHead(404).end(); return; }
      const ext = path.extname(filename);
      res.setHeader('Content-Type', ({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2'})[ext] || 'application/octet-stream');
      res.end(data);
    });
  });
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = process.env.BASE_URL || `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({headless:true, executablePath:process.env.CHROME_PATH});
  try {
    const page = await browser.newPage();
    const errors=[]; page.on('pageerror', e=>errors.push(e.message));
    await page.route('https://formspree.io/**', r=>r.abort());
    for (const route of ['/', '/es/']) {
      await page.goto(base + route);
      await page.waitForSelector('#dc-root .hcard');
      const cards=page.locator('#dc-root .hcard');
      assert.equal(await cards.count(),4);
      for(let i=0;i<4;i++) {
        await page.locator('#dc-root .dotb').nth(i).click();
        const active=page.locator('#dc-root .hcard[aria-hidden="false"]');
        assert.equal(await active.count(),1);
        assert.equal(await active.getAttribute('tabindex'),'0');
        assert.equal(await active.getAttribute('href'),(route==='/'?['/what-we-do/','#network','/about/#conduct','/careers/']:['/es/que-hacemos/','#network','/es/quienes-somos/#conduct','/es/trabaja-con-nosotros/'])[i]);
        assert(!(await active.innerText()).includes('{{'));
      }
      for(const width of [1440,390]) {
        await page.setViewportSize({width,height:900});
        assert(await page.locator('#dc-root h1').isVisible());
        assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)));
      }
    }
    assert.deepEqual(errors,[]);
    console.log('PASS: EN/ES four rotating teaser cards, actual destinations, focus and visibility state, desktop/mobile layout, no runtime errors');
  } finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});