const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'route-manifest.json'), 'utf8'));
const origin = 'https://www.silvertideglobal.com';
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const titles = new Set(), descriptions = new Set();
assert.equal(manifest.origin, origin);
assert.equal((sitemap.match(/<loc>/g) || []).length, 10);
assert.equal((sitemap.match(/<xhtml:link /g) || []).length, 20);
for (const route of manifest.routes) {
  const html = fs.readFileSync(path.join(root, route.file), 'utf8');
  assert.equal(Buffer.byteLength(html), route.bytes);
  assert(html.includes('<link rel="canonical" href="' + origin + route.route + '">'));
  assert(sitemap.includes('<loc>' + origin + route.route + '</loc>'));
  assert(!/href="[^\"]*{{/.test(html), route.route + ': source links must be real URLs');
  assert(!html.includes('https://silvertideglobal.com'));
  const pair = manifest.routes.filter(r => r.source.replace('.es.', '.') === route.source.replace('.es.', '.'));
  for (const r of pair) assert(html.includes('hreflang="' + r.locale + '" href="' + origin + r.route + '"'));
  const title = html.match(/<title>(.*?)<\/title>/)[1];
  const description = html.match(/<meta name="description" content="([^"]+)"/)[1];
  assert(!titles.has(title)); titles.add(title);
  assert(!descriptions.has(description)); descriptions.add(description);
  for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
    if (/^(mailto:|tel:|https?:)/.test(href)) continue;
    const url = new URL(href, origin + route.route);
    const target = path.join(root, url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname);
    assert(fs.existsSync(target), route.route + ': missing ' + href);
    if (url.hash) assert(fs.readFileSync(target, 'utf8').includes('id="' + url.hash.slice(1) + '"'), href);
  }
}
assert(fs.readFileSync(path.join(root, 'robots.txt'), 'utf8').includes('Sitemap: ' + origin + '/sitemap.xml'));
console.log('PASS: ten routes, canonical/hreflang pairs, sitemap, robots, unique metadata, real links and fragment destinations');
