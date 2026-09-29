/* Offline presentation layer. The pinned workbench and evidence data are unchanged. */
(function () {
  'use strict';
  let language = __ATLAS_LANGUAGE__;
  const translations = __ATLAS_TRANSLATIONS__;
  const entries = Object.entries(translations).sort((a, b) => b[0].length - a[0].length);
  const translatedText = new WeakMap();
  const translatedAttributes = new WeakMap();
  const normalize = value => value.trim().replace(/\s+/g, ' ');
  function translate(value) {
    if (language !== 'en' || !value) return value;
    const key = normalize(value);
    if (Object.prototype.hasOwnProperty.call(translations, key)) {
      return value.replace(value.trim(), translations[key]);
    }
    let result = value;
    for (const [from, to] of entries) {
      if (from.length >= 10 && result.includes(from)) result = result.split(from).join(to);
    }
    return result;
  }
  function translateTree(root) {
    if (!root || root.closest?.('#atlas-language-bar')) return;
    if (root.nodeType === Node.TEXT_NODE) {
      const parent = root.parentElement;
      const reportText = parent?.closest('#reportPreview');
      const reportLabel = ['H1', 'H2', 'H3', 'TH', 'B', 'STRONG'].includes(parent?.tagName);
      if (!['SCRIPT', 'STYLE', 'CODE'].includes(parent?.tagName) &&
          (!reportText || reportLabel)) {
        const prior = translatedText.get(root);
        const original = prior && root.nodeValue === prior.translated ? prior.original : root.nodeValue;
        const result = translate(original);
        if (language === 'en' && result !== original) translatedText.set(root, {original, translated: result});
        else translatedText.delete(root);
        if (result !== root.nodeValue) root.nodeValue = result;
      }
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    if (['SCRIPT', 'STYLE', 'CODE'].includes(root.tagName)) return;
    for (const name of ['placeholder', 'title', 'aria-label', 'alt']) {
      if (root.hasAttribute(name)) {
        const records = translatedAttributes.get(root) || {};
        const value = root.getAttribute(name), prior = records[name];
        const original = prior && value === prior.translated ? prior.original : value;
        const result = translate(original);
        if (language === 'en' && result !== original) records[name] = {original, translated: result};
        else delete records[name];
        translatedAttributes.set(root, records);
        if (value !== result) root.setAttribute(name, result);
      }
    }
    for (const child of root.childNodes) translateTree(child);
  }
  const bar = document.createElement('nav');
  bar.id = 'atlas-language-bar';
  bar.setAttribute('aria-label', 'Language / Sprache');
  bar.innerHTML = '<span>Sprache / Language</span><button type="button" data-lang="de">Deutsch</button><button type="button" data-lang="en">English</button>';
  const style = document.createElement('style');
  style.textContent = '#atlas-language-bar{display:flex;align-items:center;justify-content:flex-end;gap:7px;padding:7px 16px;background:#143246;color:white;font:12px system-ui}#atlas-language-bar button{border:1px solid #7ed6cf;border-radius:6px;padding:5px 9px;background:transparent;color:white}#atlas-language-bar button[aria-current="true"]{background:#7ed6cf;color:#102638;font-weight:700}@media(max-width:500px){#atlas-language-bar{justify-content:center;flex-wrap:wrap}}';
  document.head.appendChild(style);
  document.querySelector('header')?.after(bar);
  bar.querySelectorAll('button').forEach(button => {
    const selected = button.dataset.lang;
    button.setAttribute('aria-current', String(selected === language));
    button.addEventListener('click', () => {
      if (selected === language) return;
      language = selected;
      localStorage.setItem('atlasColourIdLanguage', selected);
      document.documentElement.lang = selected;
      bar.querySelectorAll('button').forEach(item =>
        item.setAttribute('aria-current', String(item.dataset.lang === selected)));
      translateTree(document.body);
    });
  });
  document.documentElement.lang = language;
  const originalAlert = window.alert.bind(window), originalConfirm = window.confirm.bind(window);
  window.alert = message => originalAlert(translate(String(message)));
  window.confirm = message => originalConfirm(translate(String(message)));
  function translateHtml(html) {
    const report = new DOMParser().parseFromString(html, 'text/html');
    // Translate report labels only. Project names and user comments stay exact.
    report.querySelectorAll('h1,h2,h3,th,b,strong').forEach(label => {
      for (const node of label.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          const value = translate(node.nodeValue);
          if (value !== node.nodeValue) node.nodeValue = value;
        }
      }
    });
    return '<!doctype html>\n' + report.documentElement.outerHTML;
  }
  const NativeBlob = window.Blob;
  window.Blob = new Proxy(NativeBlob, {
    construct(target, args) {
      if (String(args[1]?.type || '').startsWith('text/html') &&
          args[0]?.length === 1 && typeof args[0][0] === 'string') {
        args = [[translateHtml(args[0][0])], args[1]];
      }
      return Reflect.construct(target, args);
    }
  });
  translateTree(document.body);
  new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'characterData') translateTree(record.target);
      else for (const node of record.addedNodes) translateTree(node);
    }
  }).observe(document.body, {subtree: true, childList: true, characterData: true});
}());
