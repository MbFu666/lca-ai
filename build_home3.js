const fs = require('fs');
const src = fs.readFileSync('C:/Users/Administrator/Desktop/site/modules/index.html', 'utf8');
const L = src.split('\n');

function lines(a, b) { return L.slice(a - 1, b).join('\n'); }

const parts = [];

// === HEAD + CSS + BODY + HEADER + HOME PAGE === (lines 1-5579)
parts.push(lines(1, 5579));

// === FOOTER + CLOSE FRAME === (lines 5755-5764)
parts.push(lines(5755, 5764));

// === AGENT SIDEBAR + FAB === (lines 5766-5800)
parts.push(lines(5766, 5800));

// === MODALS === (lines 5802-5988)
parts.push(lines(5802, 5988));

// === MAIN SCRIPT ===
parts.push('<script>');

// Lines 6004-6007: API constants
parts.push(lines(6004, 6007));

// Lines 6009-6517: I18N dictionary
parts.push(lines(6009, 6517));

// Lines 6519-6531: state variables + selectors
parts.push(lines(6519, 6531));

// Lines 6533-6553: modal helpers
parts.push(lines(6533, 6553));

// Lines 6555-6633: history functions + cache
parts.push(lines(6555, 6633));

// Lines 6635-6675: caching
parts.push(lines(6635, 6675));

// Custom applyLanguage (no renderReport or bindResetLink)
parts.push(`function applyLanguage(lang) {
  currentLang = lang;
  document.documentElement.lang = lang;
  const t = I18N[lang];
  $$('[data-i18n]').forEach(el => {
    const k = el.dataset.i18n;
    if (t[k] !== undefined) el.textContent = t[k];
  });
  $$('[data-i18n-html]').forEach(el => {
    const k = el.dataset.i18nHtml;
    if (t[k] !== undefined) el.innerHTML = t[k];
  });
  $$('[data-i18n-placeholder]').forEach(el => {
    const k = el.dataset.i18nPlaceholder;
    if (t[k] !== undefined) el.placeholder = t[k];
  });
  renderExampleChips();
  $$('.lang button').forEach(b =>
    b.classList.toggle('active', b.dataset.lang === lang)
  );
}`);

// Lines 6716-6729: renderExampleChips
parts.push(lines(6716, 6729));

// Lines 6749-6825: Drag & Drop + processExcelFile
parts.push(lines(6749, 6825));

// Modified run() function: navigate to /?history= instead of renderReport
parts.push(`async function run() {
  const product = $('#productInput').value.trim();
  const t = I18N[currentLang];

  if (!product) {
    showError(t.err_empty);
    return;
  }
  
  originalProduct = product;
  
  hideError();
  $('#submitBtn').disabled = true;
  $('#loader').classList.add('show');

  setTimeout(() => $('#loader').scrollIntoView({behavior:'smooth', block:'center'}), 50);
  phaseTimer = cyclePhases();

  try {
    const fullText = agentRefinements 
      ? product + '\\n\\n' + agentRefinements 
      : product;
    
    let data = getCached(fullText);
    if (!data) {
      data = await callClaude(fullText);
      setCache(fullText, data);
    }
    clearInterval(phaseTimer);

    if (data && data.error === 'not_lca') {
      showError(t.err_not_lca + (data.message ? '<br><i>' + escape(data.message) + '</i>' : ''));
      return;
    }
    
    await saveToHistory(data);
    const historyId = data._supabaseId || Date.now();
    window.location.href = '/?history=' + historyId;
    return;
  } catch (err) {
    clearInterval(phaseTimer);
    console.error(err);
    showError(t.err_api + ' <b>' + (err.message || err) + '</b>');
  } finally {
    $('#loader').classList.remove('show');
    $('#submitBtn').disabled = false;
  }
}`);

// Lines 6883-6897: cyclePhases
parts.push(lines(6883, 6897));

// Lines 6909-6973: apiCall
parts.push(lines(6909, 6973));

// Lines 6976-7080: JSON parsing (jsonWorker, parseJsonWithWorker, parseJsonResponseSync, escapeInlineNewlines, repairTruncatedJson)
// BUT skip the "// Keep original function" line and parseJsonResponse duplicate
parts.push(lines(6976, 7080));

// Lines 7107-7168: callClaude
parts.push(lines(7107, 7168));

// Lines 8044-8065: fmtNum, escape, showError, hideError
parts.push(lines(8044, 8065));

// Lines 8411-8423: showToast
parts.push(lines(8411, 8423));

// Projects functions (needed for history/project modals in home.html)
// Lines 8554-8708: getProjects through deleteCalcFromProject
parts.push(lines(8554, 8708));

// Lines 8573-8603: createProject (already included above - skip duplicate)
// Lines 8605-8639: addToProject (already included above)

// Lines 8562-8571: saveProjectLocal
// Already included in 8554-8708 block

// Lines 6981-6998: initJsonWorker
parts.push(lines(6981, 6998));

// Lines 7001-7030: parseJsonWithWorker
// Already included in 6976-7080 block - skip

// Modified DOMContentLoaded handler
// Lines 9271-9456 from original, but remove URL param handler
parts.push(`document.addEventListener('DOMContentLoaded', async function() {
  console.log('[LCA] Initializing...');

  await checkAuth();

  // URL params (?history=, ?project=) handled by index.html only

  var savedTheme = localStorage.getItem('lca-theme');
  var themeToggle = document.getElementById('themeToggle');

  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else if (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.classList.add('dark');
  }
  if (themeToggle) {
    var isDark = document.documentElement.classList.contains('dark');
    themeToggle.textContent = isDark ? String.fromCodePoint(0x2600, 0xFE0F) : String.fromCodePoint(0x1F319);
    themeToggle.addEventListener('click', function() {
      document.documentElement.classList.toggle('dark');
      var isDark = document.documentElement.classList.contains('dark');
      themeToggle.textContent = isDark ? String.fromCodePoint(0x2600, 0xFE0F) : String.fromCodePoint(0x1F319);
      localStorage.setItem('lca-theme', isDark ? 'dark' : 'light');
    });
  }

  var browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
  var savedLang = localStorage.getItem('lca-lang');
  if (savedLang && savedLang !== 'zh') {
    applyLanguage(savedLang);
  } else if (browserLang.startsWith('ru')) {
    applyLanguage('ru');
  } else if (browserLang.startsWith('en')) {
    applyLanguage('en');
  } else {
    applyLanguage('ru');
  }

  document.querySelectorAll('.lang button').forEach(function(b) {
    b.addEventListener('click', function() {
      applyLanguage(b.dataset.lang);
      localStorage.setItem('lca-lang', b.dataset.lang);
    });
  });
  
  document.getElementById('submitBtn').addEventListener('click', run);
  document.getElementById('productInput').addEventListener('keydown', function(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') run();
  });
  
  document.querySelectorAll('.modes button').forEach(function(b) {
    b.addEventListener('click', function() {
      document.querySelectorAll('.modes button').forEach(function(x) { x.classList.remove('active'); });
      b.classList.add('active');
      currentMode = b.dataset.mode;
    });
  });

  console.log('[LCA] Init complete');
});`);

parts.push('</script>');

// === PARTICLES SCRIPT === (lines 9460-9534)
parts.push(lines(9460, 9534));

// Close
parts.push('\n</body>\n</html>');

const result = parts.join('\n');
fs.writeFileSync('C:/Users/Administrator/Desktop/site/modules/home.html', result, 'utf8');
console.log('home.html: ' + result.split('\n').length + ' lines');

// Syntax check
const vm = require('vm');
const scriptRegex = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi;
let match;
let idx = 0;
while ((match = scriptRegex.exec(result)) !== null) {
  const content = match[1].trim();
  if (!content) { idx++; continue; }
  try {
    vm.compileFunction(content);
    console.log('Script ' + idx + ': OK (' + content.split('\n').length + ' lines)');
  } catch(e) {
    console.log('Script ' + idx + ': ERROR - ' + e.message.substring(0, 200));
  }
  idx++;
}
