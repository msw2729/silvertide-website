/* Basic consent mode: no Google code, requests or analytics cookies before opt-in. */
(function () {
  'use strict';
  function initialize() {
  if (window.__silverTideAnalyticsInstalled) return;
  window.__silverTideAnalyticsInstalled = true;
  var config = window.silverTideAnalyticsConfig || {};
  var id = config.measurementId;
  var es = document.documentElement.lang === 'es';
  var notice = es ? config.privacyNoticeEs : config.privacyNoticeEn;
  if (!config.enabled || !/^G-[A-Z0-9]+$/.test(id || '') || !notice || !notice.startsWith('/') || notice.startsWith('//')) return;

  var routes = {
    '/': ['home', 'en'], '/es/': ['home', 'es'],
    '/about/': ['about', 'en'], '/es/quienes-somos/': ['about', 'es'],
    '/what-we-do/': ['services', 'en'], '/es/que-hacemos/': ['services', 'es'],
    '/careers/': ['careers', 'en'], '/es/trabaja-con-nosotros/': ['careers', 'es'],
    '/contact/': ['contact', 'en'], '/es/contacto/': ['contact', 'es']
  };
  var aliases = {
    '/index.html': '/', '/Main.dc.html': '/', '/index.es.html': '/es/', '/Main.es.dc.html': '/es/',
    '/About.dc.html': '/about/', '/About.es.dc.html': '/es/quienes-somos/',
    '/WhatWeDo.dc.html': '/what-we-do/', '/WhatWeDo.es.dc.html': '/es/que-hacemos/',
    '/Careers.dc.html': '/careers/', '/Careers.es.dc.html': '/es/trabaja-con-nosotros/',
    '/Contact.dc.html': '/contact/', '/Contact.es.dc.html': '/es/contacto/'
  };
  function safePath(path) {
    path = aliases[path] || path.replace(/index\.html$/, '');
    return routes[path] ? path : '';
  }
  var path = safePath(location.pathname);
  if (!path) return; // Unknown routes and arbitrary URL parameters never enter analytics.
  var key = 'silvertide-analytics-consent-v1';
  var granted = false, loaded = false, pageSent = false, scrolled = false;
  var copy = es ? {
    heading: 'Cookies de analítica',
    body: 'Con tu permiso, utilizamos Google Analytics para medir las visitas, las fuentes de tráfico, la navegación y las consultas enviadas. No enviamos a Analytics los datos que escribes en el formulario. Puedes rechazar las cookies de analítica y seguir utilizando el sitio y el formulario.',
    accept: 'Aceptar analítica', reject: 'Rechazar analítica', settings: 'Preferencias de cookies', privacy: 'Aviso de privacidad'
  } : {
    heading: 'Analytics cookies',
    body: 'With your permission, we use Google Analytics to measure visits, traffic sources, navigation and submitted inquiries. We do not send the details you type into the form to Analytics. You can reject analytics cookies and still use the site and inquiry form.',
    accept: 'Accept analytics', reject: 'Reject analytics', settings: 'Cookie settings', privacy: 'Privacy notice'
  };
  function readChoice() {
    try {
      var value = JSON.parse(localStorage.getItem(key));
      return value && value.expires > Date.now() && ['granted', 'denied'].includes(value.choice) ? value.choice : null;
    } catch (_) { return null; }
  }
  function persist(choice) {
    try { localStorage.setItem(key, JSON.stringify({choice: choice, expires: Date.now() + 180 * 86400000})); } catch (_) {}
  }
  function tag() { window.dataLayer.push(arguments); }
  function event(name, parameters) {
    if (!granted || !loaded) return;
    tag('event', name, Object.assign({page_id: routes[path][0], site_language: es ? 'es' : 'en', send_to: id}, parameters));
  }
  function safeReferrer() {
    try {
      var url = new URL(document.referrer);
      if (!['https:', 'http:'].includes(url.protocol)) return '';
      if (url.origin === location.origin) return url.origin + (safePath(url.pathname) || '/');
      return url.origin + '/'; // No referrer query, fragment, credentials or personal path.
    } catch (_) { return ''; }
  }
  function safeCampaign() {
    // Explicit blanks override raw UTM fallback. Never forward free-form query text.
    var result = {campaign_source: '', campaign_medium: '', campaign_name: '', campaign_id: '', campaign_term: '', campaign_content: ''};
    var query = new URLSearchParams(location.search);
    function single(name) {
      var values = query.getAll(name);
      return values.length === 1 ? values[0].toLowerCase() : '';
    }
    var source = single('utm_source'), medium = single('utm_medium');
    var sources = ['google', 'bing', 'linkedin', 'facebook', 'instagram', 'youtube', 'newsletter'];
    var mediums = ['organic', 'cpc', 'ppc', 'email', 'referral', 'social', 'paid_social', 'display', 'affiliate'];
    // Require a valid pair to avoid misleading partial campaign attribution.
    if (!sources.includes(source) || !mediums.includes(medium)) return result;
    result.campaign_source = source; result.campaign_medium = medium;
    var names = Array.isArray(config.campaignNames) ? config.campaignNames : [];
    var name = single('utm_campaign');
    var approved = names.find(function (label) {
      return typeof label === 'string' && /^[a-z][a-z0-9_-]{0,63}$/.test(label) && label === name;
    });
    if (approved) result.campaign_name = approved;
    return result;
  }
  function start() {
    granted = true;
    if (loaded) return;
    loaded = true;
    window['ga-disable-' + id] = false;
    window.dataLayer = window.dataLayer || [];
    tag('consent', 'default', {analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'});
    tag('consent', 'update', {analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'});
    tag('js', new Date());
    tag('config', id, Object.assign({
      send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false,
      page_location: location.origin + path, page_referrer: safeReferrer(),
      page_title: 'Silver Tide | ' + routes[path][0], site_language: es ? 'es' : 'en',
      cookie_domain: location.hostname, cookie_path: '/', cookie_expires: 180 * 86400
    }, safeCampaign()));
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    script.referrerPolicy = 'no-referrer';
    document.head.appendChild(script);
    if (!pageSent) { pageSent = true; event('page_view'); }
  }
  function deleteCookies() {
    var domains = [location.hostname];
    var parts = location.hostname.split('.');
    while (parts.length > 2) { parts.shift(); domains.push(parts.join('.')); }
    document.cookie.split(';').forEach(function (cookie) {
      var name = cookie.split('=')[0].trim();
      if (!/^_ga(?:_|$)/.test(name)) return;
      var expired = name + '=; Max-Age=0; path=/; SameSite=Lax';
      document.cookie = expired;
      domains.forEach(function (domain) { document.cookie = expired + '; domain=' + domain; });
    });
  }
  var panel = document.createElement('section');
  panel.id = 'analytics-consent'; panel.className = 'analytics-consent';
  panel.setAttribute('aria-labelledby', 'analytics-consent-title');
  var title = document.createElement('h2'); title.id = 'analytics-consent-title'; title.textContent = copy.heading;
  var description = document.createElement('p'); description.textContent = copy.body;
  var link = document.createElement('a'); link.href = notice; link.textContent = copy.privacy;
  var actions = document.createElement('div'); actions.className = 'analytics-actions';
  function button(label, action) { var b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.addEventListener('click', action); return b; }
  function close() { panel.hidden = true; settings.hidden = false; settings.focus({preventScroll: true}); }
  var accept = button(copy.accept, function () { persist('granted'); start(); close(); });
  var reject = button(copy.reject, function () {
    persist('denied'); granted = false;
    window['ga-disable-' + id] = true;
    deleteCookies(); close();
    // Unload the previously consented Google runtime; the next page will not load it.
    if (loaded) location.reload();
  });
  actions.append(accept, reject, link); panel.append(title, description, actions);
  var settings = button(copy.settings, function () { panel.hidden = false; settings.hidden = true; accept.focus(); });
  settings.id = 'analytics-settings'; settings.className = 'analytics-settings';
  document.body.append(panel, settings);
  var choice = readChoice();
  panel.hidden = !!choice; settings.hidden = !choice;
  if (choice === 'granted') start();
  if (choice === 'denied') deleteCookies();
  window.addEventListener('storage', function (e) {
    if (e.key === key && readChoice() !== 'granted' && loaded) {
      granted = false; window['ga-disable-' + id] = true; deleteCookies(); location.reload();
    }
  });
  document.addEventListener('click', function (e) {
    if (!granted) return;
    var a = e.target.closest('a');
    if (!a || a.closest('#analytics-consent')) return;
    var url;
    try { url = new URL(a.href, location.href); } catch (_) { return; }
    if (url.protocol === 'mailto:') { event('email_click'); return; }
    if (!['http:', 'https:'].includes(url.protocol)) return;
    if (url.origin !== location.origin) { event('outbound_click', {link_domain: url.hostname}); return; }
    var destination = safePath(url.pathname);
    if (!destination) return;
    if (a.closest('.language-switch')) event('language_switch', {destination_language: routes[destination][1]});
    else event('internal_navigation', {destination_page: routes[destination][0], navigation_type: destination === path && url.hash ? 'section' : 'page'});
  });
  document.addEventListener('silvertide:enquiry-success', function () {
    event('generate_lead', {form_id: 'supply_enquiry'});
  });
  window.addEventListener('scroll', function () {
    if (!granted || scrolled) return;
    if ((scrollY + innerHeight) / document.documentElement.scrollHeight >= 0.9) {
      scrolled = true; event('scroll_depth', {percent_scrolled: 90});
    }
  }, {passive: true});
  }
  // The exported DC runtime replaces the initial body while mounting. Attach UI
  // only after its real component exists, so React boot cannot remove the banner.
  function ready() {
    if (!document.querySelector('#dc-root .sc-host')) return false;
    initialize(); return true;
  }
  if (!ready()) {
    var observer = new MutationObserver(function () { if (ready()) observer.disconnect(); });
    observer.observe(document.body, {childList: true, subtree: true});
  }
})();
