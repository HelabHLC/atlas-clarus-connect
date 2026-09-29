/* Android-only adapter. The browser bundle and its reference logic stay intact. */
(function () {
  'use strict';
  if (!window.AndroidExport) return;
  function saveBlob(anchor) {
    fetch(anchor.href).then(function (response) {
      if (!response.ok) throw new Error('Export could not be read');
      return response.blob();
    }).then(function (blob) {
      if (blob.size > 64 * 1024 * 1024) throw new Error('Export exceeds 64 MB test limit');
      const reader = new FileReader();
      reader.onload = function () {
        const data = String(reader.result || '');
        const separator = data.indexOf(',');
        if (separator < 0) { window.AndroidExport.error('Export encoding failed'); return; }
        window.AndroidExport.save(anchor.download || 'atlas-export',
          blob.type || 'application/octet-stream', data.slice(separator + 1));
      };
      reader.onerror = function () { window.AndroidExport.error('Export encoding failed'); };
      reader.readAsDataURL(blob);
    }).catch(function (error) {
      window.AndroidExport.error(error.message || 'Export failed');
    });
  }
  // Bundle exports use detached anchors: a.click() never bubbles to document.
  const originalClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.download && this.href.startsWith('blob:')) {
      saveBlob(this);
      return;
    }
    return originalClick.call(this);
  };
  document.addEventListener('click', function (event) {
    const anchor = event.target.closest && event.target.closest('a[download]');
    if (!anchor || !anchor.href.startsWith('blob:')) return;
    event.preventDefault();
    saveBlob(anchor);
  }, true);
}());
