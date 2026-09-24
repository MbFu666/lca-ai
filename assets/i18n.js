// Shared language bootstrap (review #15/#29): one persistence + autodetect implementation.
// Exposes window.LcaLang = { get(), set(lang), autodetect(supported) }.
// Unified storage key: 'lca-lang'. Dictionaries stay per-page; this only owns the choice.
(function () {
  var KEY = 'lca-lang';
  function read() {
    try { return localStorage.getItem(KEY) || localStorage.getItem('lca_lang'); } catch (e) { return null; }
  }
  function get(supported) {
    supported = supported || ['ru', 'en', 'zh'];
    var saved = read();
    if (saved && supported.indexOf(saved) >= 0) return saved;
    var b = (navigator.language || navigator.userLanguage || 'ru').toLowerCase();
    if (b.indexOf('zh') === 0 && supported.indexOf('zh') >= 0) return 'zh';
    if (b.indexOf('en') === 0 && supported.indexOf('en') >= 0) return 'en';
    if (b.indexOf('ru') === 0 && supported.indexOf('ru') >= 0) return 'ru';
    return supported[0];
  }
  function set(lang) {
    try { localStorage.setItem(KEY, lang); } catch (e) {}
  }
  window.LcaLang = { get: get, set: set, KEY: KEY };
})();
