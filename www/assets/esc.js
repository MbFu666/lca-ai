// Shared HTML-escaping (review #15: one esc() instead of five divergent copies).
// Exposed as window.escHtml. Pages must use this for any untrusted/AI content.
(function () {
  function escHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  window.escHtml = escHtml;
  // Back-compat alias used by older inline code.
  if (!window.escapeHtml) window.escapeHtml = escHtml;
})();
