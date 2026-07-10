const fs = require('fs');
const src = fs.readFileSync('C:/Users/Administrator/Desktop/site/modules/index.html', 'utf8');
const L = src.split('\n');

// Helper: extract line range (1-indexed, inclusive)
function lines(a, b) {
  return L.slice(a - 1, b).join('\n');
}

// Find line number by content search (returns 1-indexed)
function findLine(pattern, startFrom = 1) {
  const re = new RegExp(pattern);
  for (let i = startFrom - 1; i < L.length; i++) {
    if (re.test(L[i])) return i + 1;
  }
  throw new Error('Not found: ' + pattern);
}

// Find end of a function/block by tracking braces
function findBlockEnd(startLine) {
  let depth = 0;
  for (let i = startLine - 1; i < L.length; i++) {
    for (const ch of L[i]) {
      if (ch === '{') depth++;
      if (ch === '}') depth--;
    }
    if (depth === 0) return i + 1;
  }
  throw new Error('Block not closed from line ' + startLine);
}

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

// API constants
parts.push(lines(6004, 6007));

// I18N dictionary
parts.push(lines(6009, 6517));

// State variables + selectors
parts.push(lines(6519, 6531));

// Modal helpers
parts.push(lines(6533, 6553));

// History functions
parts.push(lines(6555, 6620));

// Cache functions
parts.push(lines(6635, 6675));

// applyLanguage (modified - remove renderReport and bindResetLink calls)
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

// renderExampleChips
parts.push(lines(6716, 6729));

// Drag & Drop
parts.push(lines(6749, 6825));

// run() function (MODIFIED: navigate after save instead of renderReport)
const runStart = findLine('async function run\\(\\)');
const runEnd = findBlockEnd(runStart);
let runFunc = lines(runStart, runEnd);
// Replace saveToHistory + renderReport with saveToHistory + navigate
runFunc = runFunc.replace(
  /saveToHistory\(data\);\s*\n\s*renderReport\(data\);/,
  `await saveToHistory(data);
    // Navigate to results page with history ID
    const historyId = data._supabaseId || Date.now();
    window.location.href = '/?history=' + historyId;
    return;`
);
parts.push(runFunc);

// cyclePhases
const cycleStart = findLine('function cyclePhases\\(\\)');
const cycleEnd = findBlockEnd(cycleStart);
parts.push(lines(cycleStart, cycleEnd));

// apiCall
const apiStart = findLine('async function apiCall\\(');
const apiEnd = findBlockEnd(apiStart);
parts.push(lines(apiStart, apiEnd));

// JSON parsing functions (jsonWorker, parseJsonWithWorker, parseJsonResponseSync, escapeInlineNewlines, repairTruncatedJson, parseJsonResponse)
const jsonWorkerStart = findLine('let jsonWorker = null;');
const jsonRespEnd = findLine('\\/\\/ Keep original function', jsonWorkerStart);
parts.push(lines(jsonWorkerStart, jsonRespEnd - 1));

// callClaude
const claudeStart = findLine('async function callClaude\\(');
const claudeEnd = findBlockEnd(claudeStart);
parts.push(lines(claudeStart, claudeEnd));

// escapeInlineNewlines
const escStart = findLine('function escapeInlineNewlines\\(');
const escEnd = findBlockEnd(escStart);
parts.push(lines(escStart, escEnd));

// repairTruncatedJson
const repairStart = findLine('function repairTruncatedJson\\(');
const repairEnd = findBlockEnd(repairStart);
parts.push(lines(repairStart, repairEnd));

// fmtNum, escape, showError, hideError
parts.push(lines(8044, 8065));

// showToast
const toastStart = findLine('function showToast\\(');
const toastEnd = findBlockEnd(toastStart);
parts.push(lines(toastStart, toastEnd));

// Projects functions (getProjects through deleteCalcFromProject)
const projStart = findLine('const PROJECTS_KEY');
const projEnd = findLine('function deleteCalcFromProject');
const projEndBlock = findBlockEnd(projEnd);
parts.push(lines(projStart, projEndBlock));

// createProject, addToProject
const createProjStart = findLine('async function createProject\\(');
const addToProjEnd = findBlockEnd(findLine('async function addToProject\\('));
parts.push(lines(createProjStart, addToProjEnd));

// saveProjectLocal
const saveProjLocalStart = findLine('function saveProjectLocal\\(');
const saveProjLocalEnd = findBlockEnd(saveProjLocalStart);
parts.push(lines(saveProjLocalStart, saveProjLocalEnd));

// initJsonWorker
const initWorkerStart = findLine('function initJsonWorker\\(\\)');
const initWorkerEnd = findBlockEnd(initWorkerStart);
parts.push(lines(initWorkerStart, initWorkerEnd));

// parseJsonWithWorker
const parseWorkerStart = findLine('function parseJsonWithWorker\\(');
const parseWorkerEnd = findBlockEnd(parseWorkerStart);
parts.push(lines(parseWorkerStart, parseWorkerEnd));

// DOMContentLoaded handler (MODIFIED: no URL param handling)
const domStart = findLine("document\\.addEventListener\\('DOMContentLoaded'");
const domEnd = findBlockEnd(domStart);
let domHandler = lines(domStart, domEnd);
// Remove the URL parameter IIFE
domHandler = domHandler.replace(
  /\n\s*\/\/ URL parameter handler[\s\S]*?\(function\(\)\s*\{[\s\S]*?\}\)\(\);/,
  '\n    // URL params (?history=, ?project=) handled by index.html only'
);
// Remove backToHome listener (element doesn't exist)
domHandler = domHandler.replace(
  /document\.getElementById\('backToHome'\)\.addEventListener[\s\S]*?behavior: 'smooth' \}\);\s*\n\s*\}\);/,
  '// backToHome removed - no home page in this file'
);
parts.push(domHandler);

// Example chips from DOMContentLoaded (the hardcoded ones at the end)
const exStart = findLine("var examples = \\[", domStart);
const exEnd = findLine("console\\.log\\('\\[LCA\\] Init complete'\\)", domStart);
parts.push(lines(exStart, exEnd));

parts.push('</script>');

// === PARTICLES SCRIPT === (lines 9460-9534)
parts.push(lines(9460, 9534));

// Close body/html
parts.push('\n\n</body>\n</html>');

const result = parts.join('\n');
fs.writeFileSync('C:/Users/Administrator/Desktop/site/modules/home.html', result, 'utf8');
console.log('home.html: ' + result.split('\n').length + ' lines');
