/* Keep language changes on the same section and make the compact menu dismissible. */
document.addEventListener('click', function (event) {
  var language = event.target.closest('.language-switch a');
  if (language && window.location.hash) language.href = language.href.split('#')[0] + window.location.hash;
  var toggle = document.querySelector('.site-nav button[aria-controls="sitemenu"]');
  if (toggle && toggle.getAttribute('aria-expanded') === 'true' && !event.target.closest('.site-nav')) toggle.click();
});
document.addEventListener('keydown', function (event) {
  var toggle = document.querySelector('.site-nav button[aria-controls="sitemenu"]');
  if (event.key === 'Escape' && toggle && toggle.getAttribute('aria-expanded') === 'true') {
    toggle.click();
    toggle.focus();
  }
});

/* The exported component mounts after navigation; restore deep links once ready. */
if (window.location.hash) {
  var sectionObserver;
  var restoreSection = function () {
    var id;
    try { id = decodeURIComponent(window.location.hash.slice(1)); } catch (_) { return false; }
    var section = document.getElementById(id);
    if (!section || section.closest('x-dc')) return false;
    if (sectionObserver) sectionObserver.disconnect();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { section.scrollIntoView({ block: 'start', behavior: 'instant' }); });
    });
    return true;
  };
  sectionObserver = new MutationObserver(restoreSection);
  sectionObserver.observe(document.documentElement, { childList: true, subtree: true });
  restoreSection();
  setTimeout(function () { sectionObserver.disconnect(); }, 10000);
}
