(function () {
  'use strict';
  if (document.getElementById('digital-colour-entry')) return;
  const startup = Boolean(document.querySelector('#kit-language-bar'));
  const mainNav = document.querySelector('#primary-nav');
  const host = mainNav || (startup ? document.querySelector('.intro .actions') :
    (document.querySelector('.atlas-advice-launch') || document.querySelector('.library-toolbar')));
  if (!host) return;
  const link = document.createElement('a');
  link.id = 'digital-colour-entry';
  link.className = mainNav ? '' : (startup ? 'button secondary' : 'btn');
  link.target = '_blank'; link.rel = 'noopener';
  const base = new URL('index.html', document.currentScript.src);
  const label = () => {
    const en = (window.ATLAS_LANGUAGE?.language || document.documentElement.lang) === 'en';
    link.textContent = en ? 'P3 / ProPhoto · Preview 0.1.8 ↗' : 'P3 / ProPhoto · Testversion 0.1.8 ↗';
    base.searchParams.set('lang', en ? 'en' : 'de');
    link.href = base.href;
  };
  host.append(link);
  addEventListener('atlas-language-change', label);
  new MutationObserver(label).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  label();
})();
