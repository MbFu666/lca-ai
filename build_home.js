const fs = require('fs');
const content = fs.readFileSync('C:/Users/Administrator/Desktop/site/modules/index.html', 'utf8');
const lines = content.split('\n');

// Build home.html: keep head/CSS/body/header/homePage + footer/agent/modals/script (with modifications)
// Skip: results page HTML (lines 5580-5753, 0-indexed: 5579-5752)
const parts = [];
// Lines 1-5579 (head + CSS + body + header + home page) - keep all (0-indexed: 0-5578)
for (let i = 0; i < 5579; i++) parts.push(lines[i]);
// Skip lines 5580-5753 (results page) (0-indexed: 5579-5752)
// Lines 5754-end (footer through end) - keep all (0-indexed: 5753-end)
for (let i = 5753; i < lines.length; i++) parts.push(lines[i]);

let result = parts.join('\n');

// 1. Modify run(): after saveToHistory, navigate to /?history=<id> instead of renderReport
result = result.replace(
  /(\s+)saveToHistory\(data\);\s*\n(\s+)renderReport\(data\);/,
  '$1await saveToHistory(data);\n$1const historyId = data._supabaseId || data._historyId || Date.now();\n$1window.location.href = "/?history=" + historyId;\n$1return;'
);

// 2. Remove the URL parameter handler IIFE from DOMContentLoaded
// Match from "// URL parameter handler" to the closing })(); of the IIFE
result = result.replace(
  /\n\s*\/\/ URL parameter handler for opening saved calculations[\s\S]*?\(function\(\)\s*\{[\s\S]*?\}\)\(\);/,
  '\n    // URL params (?history=, ?project=) handled by index.html only'
);

// 3. Remove renderReport and all rendering functions (they belong in index.html only)
// These are large blocks - we'll remove the key ones

// Remove renderReport function
result = result.replace(
  /\n\/\* ── Renderer ───────────────────────────────────────── \*\/\nfunction renderReport[\s\S]*?setTimeout\(\(\) => \$\('#pageResults'\)\.scrollIntoView\(\{behavior:'smooth', block:'start'\}\), 80\);\n\}/,
  '\n// renderReport lives in index.html only'
);

// Remove renderFlow function
result = result.replace(
  /\n\/\* ── PROCESS FLOW[\s\S]*?colsEl\.appendChild\(col\);\s*\n\s*\}\);\n\}/,
  '\n// renderFlow lives in index.html only'
);

// Remove clearSelected, formatCycle, total functions
result = result.replace(
  /\nfunction clearSelected\(\)\s*\{[\s\S]*?output\.appendChild\(panel\);\s*\n\s*\}\n\}/,
  '\n// clearSelected, formatCycle, total live in index.html only'
);

// Remove selectNode function
result = result.replace(
  /\n\/\* ── NODE SELECTION[\s\S]*?editData: \{[\s\S]*?\}\s*\n\s*\}, cardEl\);\s*\n\s*\}\n\}/,
  '\n// selectNode lives in index.html only'
);

// Remove showNodeDetail function
result = result.replace(
  /\nfunction showNodeDetail\(o, cardEl\)\s*\{[\s\S]*?document\.getElementById\(\'detailEditReset\'\)[\s\S]*?\}\s*\n\s*\}\n\}/,
  '\n// showNodeDetail lives in index.html only'
);

// Remove applyDetailEdit function
result = result.replace(
  /\nfunction applyDetailEdit\(\)\s*\{[\s\S]*?showToast\(currentLang[\s\S]*?\);\n\}/,
  '\n// applyDetailEdit lives in index.html only'
);

// Remove renderFlowTable function
result = result.replace(
  /\n\/\* ── FLOW TABLE[\s\S]*?\$\(\'#flowTable\'\)\.innerHTML = html;\n\}/,
  '\n// renderFlowTable lives in index.html only'
);

// Remove tab switching, renderRanking, renderDonut, getDonutImage
result = result.replace(
  /\n\/\* ── TAB SWITCHING[\s\S]*?return canvas\.toDataURL\(\'image\/png\'\);\n\}/,
  '\n// Tabs, ranking, donut live in index.html only'
);

// Remove switchStep, loadAnalysis, showAnalysisLoading, showAnalysisError, applyAnalysisToDom, switchView
result = result.replace(
  /\n\/\* ── STEP \/ VIEW switching[\s\S]*?function switchView\(v\)\s*\{[\s\S]*?\$\('#listView'\)\.style\.display = v === 'list' \? 'block' : 'none';\n\}/,
  '\n// switchStep, switchView, loadAnalysis live in index.html only'
);

// Remove the delegated click handler for step/view/detail
result = result.replace(
  /\n\/\/ wire step \+ view \+ detail close[\s\S]*?window\.scrollTo\(\{ top: 0, behavior: 'smooth' \}\);\s*\n\s*\}\);\s*\n\);/,
  '\n// Step/view/detail click handlers live in index.html only'
);

// Remove export JSON/print delegated handler
result = result.replace(
  /\n\/\* ── EXPORT JSON \/ PRINT[\s\S]*?\}\);\s*\n\);/,
  '\n// Export handlers live in index.html only'
);

// Remove fillList function
result = result.replace(
  /\nfunction fillList\(sel, arr\)\s*\{[\s\S]*?\}\s*\n\}/,
  '\n// fillList lives in index.html only'
);

// Remove showPdfPreview and exportPdf
result = result.replace(
  /\nasync function showPdfPreview\(\)\s*\{[\s\S]*?\$\('#pdfDownload\'\)[\s\S]*?doc\.save\(fileName\);\s*\n\s*\}\);\n\}/,
  '\n// PDF export lives in index.html only'
);

// Remove AI Agent functions (generateAgentQuestions, renderAgent, etc.)
result = result.replace(
  /\n\/\* ════════════════════════════════════════════════════════\n\s+AI AGENT[\s\S]*?\$\('#chatModeToggle'\)\.addEventListener[\s\S]*?\}\);\s*\n\);/,
  '\n// AI Agent functions live in index.html only'
);

// Remove EDIT MODEL MODAL section
result = result.replace(
  /\n\/\* ════════════════════════════════════════════════════════\n\s+EDIT MODEL MODAL[\s\S]*?row\.querySelector\(\'\.em-factor-remove\'\)\.addEventListener[\s\S]*?\}\);\s*\n\);/,
  '\n// Edit Model modal lives in index.html only'
);

// Remove COMPARE & HISTORY section
result = result.replace(
  /\n\/\* ════════════════════════════════════════════════════════\n\s+COMPARE & HISTORY[\s\S]*?\$\('#clearHistory\'\)\.addEventListener[\s\S]*?\}\);\s*\n\);/,
  '\n// Compare & History UI live in index.html only'
);

// Remove PROJECTS section
result = result.replace(
  /\n\/\* ════════════════════════════════════════════════════════\n\s+PROJECTS[\s\S]*?\$\('#saveToProjectBtn\'\)[\s\S]*?\}\);\s*\n\);/,
  '\n// Projects UI lives in index.html only'
);

// Remove showNewProjectModalForSave
result = result.replace(
  /\nfunction showNewProjectModalForSave\(\)\s*\{[\s\S]*?\}\s*\n\}/,
  '\n// showNewProjectModalForSave lives in index.html only'
);

// Remove EXCEL EXPORT section
result = result.replace(
  /\n\/\* ════════════════════════════════════════════════════════\n\s+EXCEL EXPORT[\s\S]*?\$\('#wordDownload\'\)\.addEventListener[\s\S]*?\}\);\s*\n\);/,
  '\n// Excel export UI lives in index.html only'
);

// Remove showWordPreview, excelRows, buildExcelPreview, downloadJson, downloadExcel, downloadWord
result = result.replace(
  /\nfunction showWordPreview\(d\)\s*\{[\s\S]*?a\.click\(\);\s*\n\s*URL\.revokeObjectURL\(url\);\n\}\s*\n/,
  '\n// showWordPreview lives in index.html only\n'
);

result = result.replace(
  /\nfunction excelRows\(d\)\s*\{[\s\S]*?return rows;\n\}\s*\n/,
  '\n// excelRows lives in index.html only\n'
);

result = result.replace(
  /\nfunction buildExcelPreview\(d\)\s*\{[\s\S]*?\$\('#xlsSheetName\'\)\.textContent[\s\S]*?\n\}\s*\n/,
  '\n// buildExcelPreview lives in index.html only\n'
);

result = result.replace(
  /\nfunction downloadJson\(d\)\s*\{[\s\S]*?URL\.revokeObjectURL\(url\);\n\}\s*\n/,
  '\n// downloadJson lives in index.html only\n'
);

result = result.replace(
  /\nasync function downloadExcel\(d\)\s*\{[\s\S]*?XLSX\.writeFile\(wb, name\);\n\}\s*\n/,
  '\n// downloadExcel lives in index.html only\n'
);

result = result.replace(
  /\n\/\* ════════════════════════════════════════════════════════\n\s+WORD EXPORT[\s\S]*?a\.remove\(\);\s*\n\s*URL\.revokeObjectURL\(url\);\n\}\s*\n/,
  '\n// Word export lives in index.html only\n'
);

// Remove the Theme Toggle section comment
result = result.replace(
  /\n\/\* ============================================================\n\s+Theme Toggle \+ Auto-detect[\s\S]*?═══════════════════════════════════ \*\//,
  ''
);

// Fix the DOMContentLoaded to remove submitBtn/productInput backToHome listeners that reference missing elements
// Actually these will just silently fail since the elements don't exist, so leave them

fs.writeFileSync('C:/Users/Administrator/Desktop/site/modules/home.html', result, 'utf8');
const lineCount = result.split('\n').length;
console.log('home.html written, ' + lineCount + ' lines');
