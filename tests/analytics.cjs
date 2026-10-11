// All Google and Formspree requests are intercepted, including the confirmed production ID.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..');
const confirmedId='G-MP521GB8WR';
assert.match(fs.readFileSync(path.join(root,'assets/analytics-config.js'),'utf8'), /measurementId: 'G-MP521GB8WR'/);
const server=http.createServer((req,res)=>{
 let file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403).end();return;}
 try{if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');
 res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}
 catch{res.writeHead(404).end();}
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  for(const locale of ['en','es']){
   const context=await browser.newContext({viewport:{width:390,height:844}});
   const page=await context.newPage();
   let enabled=false,google=0,posts=0,status=500;const errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await context.route('**/*',async r=>{
    const url=r.request().url();
    if(url===base+'/assets/analytics-config.js'&&enabled)return r.fulfill({contentType:'text/javascript',body:'window.silverTideAnalyticsConfig={enabled:true,measurementId:"G-MP521GB8WR",privacyNoticeEn:"/privacy/",privacyNoticeEs:"/es/privacidad/"};'});
    if(url.startsWith(base+'/'))return r.continue();
    if(url.startsWith('https://www.googletagmanager.com/gtag/js')){google++;return r.fulfill({contentType:'text/javascript',body:'/* mock Google tag; deliberately no network or cookies */'});}
    if(url==='https://formspree.io/f/xppqljkw'){posts++;return r.fulfill({status,contentType:'application/json',body:JSON.stringify({ok:status===200})});}
    return r.abort();
   });
   const route=locale==='en'?'/contact/':'/es/contacto/';
   const visit=async()=>{await page.goto('about:blank');await page.goto(base+route+'?email=PRIVATE_QUERY#PRIVATE_FRAGMENT',{referer:'https://example.org/PRIVATE_REFERRER?email=PRIVATE_EMAIL'});await page.waitForSelector('body > div form');};
   const events=()=>page.evaluate(()=>Array.from(window.dataLayer||[],a=>Array.from(a)).filter(a=>a[0]==='event'));
   await visit();assert.equal(google,0);assert.equal(await page.locator('#analytics-consent').count(),0);
   enabled=true;await visit();
   assert.equal(google,0);assert.deepEqual(await context.cookies(),[]);
   const panel=page.locator('#analytics-consent');
   assert.equal(await panel.isVisible(),true,JSON.stringify(await page.evaluate(()=>({config:window.silverTideAnalyticsConfig,installed:window.__silverTideAnalyticsInstalled,root:document.querySelector('#dc-root')?.outerHTML.slice(0,200),panel:document.querySelector('#analytics-consent')?.outerHTML,storage:localStorage.length})))+' errors:'+errors.join(','));
   assert.match(await panel.textContent(),locale==='en'?/Analytics cookies/:/Cookies de analítica/);
   if(process.env.QA_SCREENSHOTS)await panel.screenshot({path:path.join(process.env.QA_SCREENSHOTS,'consent-'+locale+'.png')});
   await panel.locator('button').nth(1).click();
   await visit();assert.equal(google,0);assert.equal(await panel.isVisible(),false);
   // A successful inquiry without consent is neither sent nor buffered to analytics.
   await page.locator('[name=name]').fill('PRIVATE_NAME');
   await page.locator('[name=email]').fill('private@example.com');
   await page.locator('[name=message]').fill('PRIVATE_MESSAGE');
   status=200;await page.locator('form [type=submit]').click();
   await page.waitForFunction(()=>document.querySelector('form').getAttribute('aria-busy')==='false');
   assert.deepEqual(await events(),[]);
   await page.locator('#analytics-settings').click();await panel.locator('button').first().click();
   await page.waitForFunction(()=>!!window.dataLayer);
   assert.equal((await events()).filter(x=>x[1]==='page_view').length,1);
   assert.equal((await events()).filter(x=>x[1]==='generate_lead').length,0);
   await page.locator('#analytics-settings').click();await panel.locator('button').first().click();
   assert.equal((await events()).filter(x=>x[1]==='page_view').length,1);
   const commands=await page.evaluate(()=>Array.from(window.dataLayer,a=>Array.from(a)));
   assert.equal(commands.filter(a=>a[0]==='config').length,1);
   assert.equal(commands.find(a=>a[0]==='config')[1],confirmedId);
   assert.equal(await page.locator('script[src="https://www.googletagmanager.com/gtag/js?id='+confirmedId+'"]').count(),1);
   assert.ok(commands.filter(a=>a[0]==='event').every(a=>a[2].send_to===confirmedId));
   const cfg=commands.find(a=>a[0]==='config')[2];
   assert.equal(cfg.send_page_view,false);assert.equal(cfg.allow_google_signals,false);assert.equal(cfg.allow_ad_personalization_signals,false);
   assert.equal(cfg.page_location,base+route);
   assert.equal(cfg.page_referrer,'https://example.org/');
   assert.equal(commands.find(a=>a[0]==='consent'&&a[1]==='update')[2].ad_user_data,'denied');
   await page.locator('form button[type=button]').click();
   await page.locator('form [type=submit]').click();
   assert.equal((await events()).filter(x=>x[1]==='generate_lead').length,0);
   for(const [name,value]of Object.entries({name:'PRIVATE_NAME',email:'private@example.com',company:'PRIVATE_COMPANY',phone:'PRIVATE_PHONE',volume:'PRIVATE_VOLUME',message:'PRIVATE_MESSAGE'}))await page.locator('[name='+name+']').fill(value);
   status=500;await page.locator('form [type=submit]').click();
   await page.waitForFunction(()=>document.querySelector('form').getAttribute('aria-busy')==='false');
   assert.equal((await events()).filter(x=>x[1]==='generate_lead').length,0);
   status=200;await page.locator('form').evaluate(f=>{for(let i=0;i<3;i++)f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});
   await page.waitForFunction(()=>document.querySelector('form').getAttribute('aria-busy')==='false');
   assert.equal((await events()).filter(x=>x[1]==='generate_lead').length,1);
   assert.equal(posts,3);
   await page.evaluate(()=>{
    document.addEventListener('click',e=>e.preventDefault(),{once:true});
    document.querySelector('a[href^="mailto:"]').click();
   });
   assert.equal((await events()).filter(x=>x[1]==='email_click').length,1);
   await page.evaluate(()=>{
    const a=document.createElement('a');a.href='https://example.com/PRIVATE_PATH?email=PRIVATE_EMAIL';document.body.appendChild(a);
    document.addEventListener('click',e=>e.preventDefault(),{once:true});a.click();a.remove();
   });
   assert.equal((await events()).find(x=>x[1]==='outbound_click')[2].link_domain,'example.com');
   await page.evaluate(()=>{
    document.addEventListener('click',e=>e.preventDefault(),{once:true});
    document.querySelector('.language-switch a:not([aria-current="page"])').click();
   });
   assert.equal((await events()).filter(x=>x[1]==='language_switch').length,1);
   await page.evaluate(()=>{
    const a=document.createElement('a');a.href='/about/?email=PRIVATE_NAV#PRIVATE_SECTION';document.body.appendChild(a);
    document.addEventListener('click',e=>e.preventDefault(),{once:true});a.click();a.remove();
   });
   assert.equal((await events()).find(x=>x[1]==='internal_navigation')[2].destination_page,'about');
   const payload=await page.evaluate(()=>JSON.stringify(window.dataLayer));
   assert.ok(!/PRIVATE_|private@example|mailto:|info@/.test(payload));
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   const beforeReload=google;await visit();
   await page.waitForFunction(()=>!!window.dataLayer);
   assert.equal((await events()).filter(x=>x[1]==='page_view').length,1);
   await page.locator('#analytics-settings').click();
   await page.locator('#analytics-consent button').nth(1).click();
   await page.waitForLoadState('load');await page.waitForSelector('body > div form');
   const afterRevoke=google;await visit();assert.equal(google,afterRevoke);
   assert.deepEqual(await events(),[]);
   assert.deepEqual(await context.cookies(),[]);
   assert.deepEqual(errors,[]);
   console.log(`PASS ${locale}: disabled/no ID gate; no requests/cookies before consent or after rejection; consent persistence/revocation; one pageview; success-only lead; no form/URL personal values; equal localized controls/mobile width; no runtime errors`);
   await context.close();
  }
  const context=await browser.newContext();
  await context.addInitScript(()=>localStorage.setItem('silvertide-analytics-consent-v1',JSON.stringify({choice:'granted',expires:Date.now()+60000})));
  await context.route('**/*',r=>{
   const u=r.request().url();
   if(u===base+'/assets/analytics-config.js')return r.fulfill({contentType:'text/javascript',body:'window.silverTideAnalyticsConfig={enabled:true,measurementId:"G-MP521GB8WR",privacyNoticeEn:"/privacy/",privacyNoticeEs:"/es/privacidad/"};'});
   if(u.startsWith(base+'/'))return r.continue();
   if(u.startsWith('https://www.googletagmanager.com/gtag/js'))return r.fulfill({contentType:'text/javascript',body:'/* mock */'});
   return r.abort();
  });
  const page=await context.newPage();
  for(const route of JSON.parse(fs.readFileSync(path.join(root,'route-manifest.json'),'utf8')).routes){
   await page.goto(base+route.route);
   await page.waitForFunction(()=>!!window.dataLayer);
   const data=await page.evaluate(()=>Array.from(window.dataLayer,a=>Array.from(a)));
   assert.equal(data.filter(a=>a[0]==='config').length,1);
   assert.equal(data.find(a=>a[0]==='config')[1],confirmedId);
   assert.equal(data.filter(a=>a[0]==='event'&&a[1]==='page_view').length,1);
   assert.equal(data.find(a=>a[0]==='config')[2].page_location,base+route.route);
   assert.equal(data.find(a=>a[0]==='config')[2].site_language,route.locale);
  }
  await context.close();
  console.log('PASS: exactly one sanitized pageview and correct language on all ten clean routes');
  console.log('All Google and Formspree traffic mocked; no live analytics or inquiries sent.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
