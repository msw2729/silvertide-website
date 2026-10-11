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
  const baseURL = (process.env.BASE_URL || `http://127.0.0.1:${server.address().port}`).replace(/\/+$/, '');
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) });
  try {
    // Legacy flat HTML files are redirects now. Compare each real route with
    // its original page, so redirects cannot silently skip the email checks.
    const routes = JSON.parse(fs.readFileSync(path.join(root, 'route-manifest.json'), 'utf8')).routes;
    const expectedPages = ['Main', 'WhatWeDo', 'About', 'Careers', 'Contact'].flatMap(page => [`${page}.dc.html`, `${page}.es.dc.html`]);
    assert.deepEqual(routes.map(route => route.source).sort(), expectedPages.sort(), 'every original EN/ES page has a clean route');
    for (const route of routes) {
      const original = execFileSync('git', ['show', '4361451:' + route.source], { cwd: root, encoding: 'utf8' });
      const current = fs.readFileSync(path.join(root, route.file), 'utf8');
      const links = s => s.match(/href="mailto:[^"]*"/g) || [];
      assert.deepEqual(links(current), links(original), route.route + ' direct emails unchanged');
    }
    console.log('PASS: all existing direct email links unchanged');
    for (const lang of ['en', 'es']) {
      const page = await browser.newPage();
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      let requests = [], mode = 'success', release;
      await page.route('**/*', async route => {
        const req = route.request();
        if (req.url().startsWith(baseURL + '/')) return route.continue();
        if (req.url() !== endpoint) return route.abort();
        requests.push(req);
        if (mode === 'pending') await new Promise(resolve => { release = resolve; });
        if (mode === 'network') return route.abort('failed');
        return route.fulfill({ status: mode === '422' ? 422 : mode === 'error' ? 500 : 200, contentType: mode === 'error' ? 'text/html' : 'application/json', body: mode === 'error' ? '<h1>Unavailable</h1>' : mode === '422' ? '{"errors":[{"field":"email","message":"Invalid"}]}' : '{"ok":true}' });
      });
      await page.goto(baseURL + (lang === 'en' ? '/contact/' : '/es/contacto/'));
      await page.waitForSelector('body > div form');
      const form = page.locator('form');
      const submit = form.locator('[type=submit]');
      const status = page.locator('#enquiry-status');
      assert.equal(await form.getAttribute('action'), endpoint);
      assert.equal(await form.getAttribute('method'), 'POST');
      assert.equal(await submit.isEnabled(), true);
      await submit.click();
      assert.equal(requests.length, 0);
      for (const [name, value] of Object.entries({ name: 'Test Person', company: 'Test Company', email: 'invalid', phone: '+1 555 0100', volume: 'Test volume', message: 'Mock only — no actual inquiry' })) await form.locator(`[name="${name}"]`).fill(value);
      await submit.click();
      assert.equal(requests.length, 0);
      await form.locator('[name=email]').fill('test@example.com');
      await form.locator('[name=product]').selectOption({ index: 1 });
      // Required fields are checked individually, including synthetic submits.
      for (const name of ['name', 'email', 'message']) {
        const field = form.locator(`[name="${name}"]`), value = await field.inputValue();
        await field.fill('');
        await form.evaluate(f => f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
        assert.equal(requests.length, 0);
        await field.fill(value);
      }
      mode = 'pending';
      await form.evaluate(f => { for (let i = 0; i < 3; i++) f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
      await page.waitForFunction(() => document.querySelector('form').getAttribute('aria-busy') === 'true');
      while (!release) await new Promise(r => setTimeout(r, 20));
      assert.equal(requests.length, 1);
      assert.equal(await submit.isDisabled(), true);
      assert.match(await status.textContent(), lang === 'en' ? /Sending/ : /Enviando/);
      assert.equal(requests[0].method(), 'POST');
      assert.equal(requests[0].headers().accept, 'application/json');
      const payload = requests[0].postData();
      for (const field of ['name','company','email','phone','product','volume','message','_subject','language']) assert.ok(payload.includes(`name="${field}"`), field);
      assert.ok(!payload.includes('michael@'));
      mode = 'success'; release();
      await page.waitForFunction(() => document.querySelector('form').getAttribute('aria-busy') === 'false');
      assert.match(await status.textContent(), lang === 'en' ? /Thank you/ : /Gracias/);
      assert.equal(await submit.isDisabled(), true);
      await form.evaluate(f => f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
      assert.equal(requests.length, 1);
      await form.locator('button[type=button]').click();
      assert.equal(await form.locator('[name=name]').inputValue(), '');
      assert.equal(await submit.isEnabled(), true);
      for (const name of ['name','email','message']) await form.locator(`[name="${name}"]`).fill(name === 'email' ? 'test@example.com' : 'Preserve this');
      for (const scenario of ['422', 'error', 'network']) {
        mode = scenario;
        await submit.click();
        await page.waitForFunction(() => document.querySelector('form').getAttribute('aria-busy') === 'false');
        assert.equal(await submit.isEnabled(), true);
        assert.equal(await form.locator('[name=message]').inputValue(), 'Preserve this');
        assert.match(await status.textContent(), lang === 'en' ? /Please|could not/ : /Revisa|No pudimos/);
        assert.equal(await page.evaluate(() => document.activeElement.id), 'enquiry-status');
      }
      // DCLogic re-renders caused by the menu must preserve entered fields.
      const menu = page.locator('.site-nav button[aria-controls=sitemenu]');
      await menu.click(); await menu.click();
      assert.equal(await form.locator('[name=message]').inputValue(), 'Preserve this');
      mode = 'success'; await submit.click();
      await page.waitForFunction(() => document.querySelector('form').getAttribute('aria-busy') === 'false');
      assert.match(await status.textContent(), lang === 'en' ? /Thank you/ : /Gracias/);
      await page.setViewportSize({ width: 390, height: 844 });
      await form.scrollIntoViewIfNeeded();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      if (process.env.QA_SCREENSHOTS) await page.screenshot({ path: path.join(process.env.QA_SCREENSHOTS, `form-${lang}.png`), fullPage: true });
      assert.deepEqual(errors, []);
      console.log(`PASS ${lang}: required/email validation, payload, localized pending/success/422/500/network errors, duplicate prevention, retry, reset, focus, menu re-render, mobile width; no runtime errors`);
      await page.close();
    }
    console.log('Browser: Chromium ' + browser.version() + '; all Formspree requests mocked.');
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
