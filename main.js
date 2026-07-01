/**
 * LCA·AI — Main Entry Point
 * Modular architecture inspired by ECC
 */

import { CONFIG } from './lca-config.js';
import { getHistory, saveToHistory, getProjects, saveProject, createProject, addToProject, getCached, setCache, getTheme, setTheme } from './lca-storage.js';
import { apiCall, parseJsonResponse } from './lca-api.js';
import { renderDonut, getDonutImage, renderRanking } from './lca-charts.js';
import { exportPdf, downloadWord, downloadExcel, downloadJson } from './lca-export.js';

// ─── State ──────────────────────────────────────────────
let currentLang = 'zh';
let currentMode = 'full';
let lastReport = null;
let originalProduct = '';
let agentRefinements = '';
let isAgentRefining = false;
let agentQuestions = [];
let agentChatHistory = [];
let agentChatMode = false;
let compareList = [];

// ─── i18n ───────────────────────────────────────────────
const I18N = {
  ru: {
    eyebrow: 'оценка жизненного цикла · AI',
    h1: 'Углеродный след<br>продукта <em>за секунду</em>.',
    mode_full: 'Полный цикл',
    mode_factor: 'Приоритет факторов',
    placeholder: 'Например: 1 кг наноцеллюлозы из жома сладкого сорго…',
    submit: 'Рассчитать',
    examples_label: 'пример:',
    loader_status: 'расчёт',
    step1: 'Модель процессов',
    step2: 'Результаты и анализ',
    view_tree: 'Граф',
    view_list: 'Список',
    compare: 'Сравнить',
    history: 'История',
    projects: 'Проекты',
    save_to_project: 'В проект',
    edit_model: 'Edit Model',
    export_excel: 'Excel',
    export_word: 'Word',
    export_json: 'JSON',
    export_pdf: 'PDF',
    export_print: 'Отчёт',
    back_to_search: 'Новый расчёт',
    m_fu: 'Функц. единица',
    m_cycle: 'Период учёта',
    m_method: 'Метод',
    m_region: 'Регион',
    m_date: 'Дата',
    res_label: 'Углеродный след (kgCO₂e):',
    scope_full: 'Полный жизненный цикл',
    contrib_h: 'Состав выбросов',
    rank_h: 'Рейтинг выбросов',
    ai_suggest: 'Рекомендации ИИ',
    n_assump: 'Допущения',
    n_limit: 'Ограничения',
    n_rec: 'Рекомендации',
    agent_name: 'AI Agent',
    chat_mode: 'Чат',
    agent_details: 'Детализация модели',
    agent_empty: 'Сделайте первый расчёт',
    agent_msg_ph: 'Дополнить описание…'
  },
  en: {
    eyebrow: 'life cycle assessment · AI',
    h1: 'A product carbon footprint,<br><em>in seconds</em>.',
    mode_full: 'Full life cycle',
    mode_factor: 'Factor preference',
    placeholder: 'e.g. 1 kg of nanocellulose from sweet sorghum bagasse…',
    submit: 'Calculate',
    examples_label: 'try:',
    loader_status: 'computing',
    step1: 'Process model',
    step2: 'Results & analysis',
    view_tree: 'Graph',
    view_list: 'List',
    compare: 'Compare',
    history: 'History',
    projects: 'Projects',
    save_to_project: 'Save to project',
    edit_model: 'Edit Model',
    export_excel: 'Excel',
    export_word: 'Word',
    export_json: 'JSON',
    export_pdf: 'PDF',
    export_print: 'Report',
    back_to_search: 'New calculation',
    m_fu: 'Functional unit',
    m_cycle: 'Accounting cycle',
    m_method: 'Method',
    m_region: 'Region',
    m_date: 'Date',
    res_label: 'Product carbon footprint (kgCO₂e):',
    scope_full: 'Full lifecycle',
    contrib_h: 'Emission composition',
    rank_h: 'Emission ranking',
    ai_suggest: 'AI Recommendations',
    n_assump: 'Assumptions',
    n_limit: 'Limitations',
    n_rec: 'Recommendations',
    agent_name: 'AI Agent',
    chat_mode: 'Chat',
    agent_details: 'Model refinement',
    agent_empty: 'Run a calculation first',
    agent_msg_ph: 'Add a note…'
  },
  zh: {
    eyebrow: '生命周期评价 · 人工智能',
    h1: '产品碳足迹，<br>秒级生成。',
    mode_full: '全生命周期',
    mode_factor: '因子优先',
    placeholder: '例如:1 kg 由甜高粱渣制备的纳米纤维素…',
    submit: '开始计算',
    examples_label: '示例:',
    loader_status: '计算中',
    step1: '过程模型',
    step2: '结果与分析',
    view_tree: '图谱',
    view_list: '列表',
    compare: '对比',
    history: '历史',
    projects: '项目',
    save_to_project: '保存到项目',
    edit_model: '编辑模型',
    export_excel: 'Excel',
    export_word: 'Word',
    export_json: 'JSON',
    export_pdf: 'PDF',
    export_print: '报告',
    back_to_search: '新建计算',
    m_fu: '功能单位',
    m_cycle: '核算周期',
    m_method: '方法',
    m_region: '地区',
    m_date: '日期',
    res_label: '产品碳足迹 (kgCO₂e):',
    scope_full: '全生命周期',
    contrib_h: '排放组成',
    rank_h: '排放排名',
    ai_suggest: 'AI 减排建议',
    n_assump: '关键假设',
    n_limit: '局限性',
    n_rec: '减排建议',
    agent_name: 'AI 助手',
    chat_mode: '聊天',
    agent_details: '模型细化',
    agent_empty: '请先完成计算',
    agent_msg_ph: '补充说明…'
  }
};

function applyLanguage(lang) {
  currentLang = lang;
  document.documentElement.lang = lang;
  const t = I18N[lang];
  if (!t) return;

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

  $$('.lang button').forEach(b =>
    b.classList.toggle('active', b.dataset.lang === lang)
  );
}

// ─── DOM Helpers ────────────────────────────────────────
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function fmtNum(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  const num = Number(n);
  if (Math.abs(num) >= 100) return num.toFixed(0);
  if (Math.abs(num) >= 10)  return num.toFixed(1);
  if (Math.abs(num) >= 1)   return num.toFixed(2);
  return num.toFixed(3);
}

function total(d) { return Number(d?.total_co2eq) || 0; }

function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// ─── Theme ──────────────────────────────────────────────
function initTheme() {
  const themeToggle = document.getElementById('themeToggle');
  const savedTheme = getTheme();
  
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
    themeToggle.textContent = '☀️';
  }
  
  themeToggle.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    themeToggle.textContent = isDark ? '☀️' : '🌙';
    setTheme(isDark ? 'dark' : 'light');
  });
}

// ─── Main Calculation Flow ──────────────────────────────
async function run() {
  const product = $('#productInput').value.trim();
  if (!product) {
    showError('Опишите продукт');
    return;
  }
  
  originalProduct = product;
  hideError();
  $('#submitBtn').disabled = true;
  $('#loader').classList.add('show');
  
  setTimeout(() => $('#loader').scrollIntoView({behavior:'smooth', block:'center'}), 50);
  const phaseTimer = cyclePhases();

  try {
    const fullText = agentRefinements 
      ? product + '\n\n' + agentRefinements 
      : product;
    
    let data = getCached(fullText);
    if (!data) {
      data = await callLCA(fullText);
      setCache(fullText, data);
    }
    clearInterval(phaseTimer);

    if (data && data.error === 'not_lca') {
      showError('Этот инструмент рассчитывает только LCA');
      return;
    }
    
    saveToHistory(data);
    renderReport(data);
  } catch (err) {
    clearInterval(phaseTimer);
    showError('Ошибка: ' + err.message);
  } finally {
    $('#loader').classList.remove('show');
    $('#submitBtn').disabled = false;
  }
}

async function callLCA(productText) {
  const systemPrompt = `LCA expert (ISO 14067, PAS 2050). Reply with VALID JSON ONLY.
If input is not a product for LCA → reply: {"error":"not_lca","message":"reason"}
Else reply with this schema:
{
  "product_title": "...",
  "functional_unit": "...",
  "system_boundary": "cradle-to-grave",
  "method": "IPCC AR6 GWP100",
  "region": "...",
  "accounting_cycle": "YYYY-MM-DD ~ YYYY-MM-DD",
  "total_co2eq": <number>,
  "stages": [
    {
      "name": "<stage name>",
      "co2eq": <number>,
      "share_pct": <number>,
      "description": "<12 words>",
      "key_inputs": ["..."],
      "factor_source": "Ecoinvent 3.10",
      "sub_processes": [
        {"name":"...", "amount":<n>, "unit":"kg", "factor":<n>, "factor_unit":"kg CO2-eq/kg", "factor_source":"...", "co2eq":<n>}
      ]
    }
  ]
}
5 stages required: Raw material, Manufacturing, Distribution, Use phase, End of life.
Each stage = exactly 2 sub_processes. Numbers in kg CO2-eq. share_pct sums to 100.`;

  const text = await apiCall(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: productText }
    ],
    { max_tokens: 8000, temperature: 0.2, label: 'lca-calc' }
  );
  return parseJsonResponse(text);
}

function cyclePhases() {
  const phases = [
    'формируем функциональную единицу…',
    'подбираем коэффициенты…',
    'моделируем стадии…',
    'считаем итоги…'
  ];
  let i = 0;
  $('#loaderMsg').textContent = phases[0];
  return setInterval(() => {
    i = (i + 1) % phases.length;
    const el = $('#loaderMsg');
    el.style.opacity = 0;
    setTimeout(() => {
      el.textContent = phases[i];
      el.style.transition = 'opacity .25s';
      el.style.opacity = 1;
    }, 200);
  }, 1500);
}

// ─── Render Report ──────────────────────────────────────
function renderReport(d) {
  lastReport = d;
  
  $('#crumbProduct').textContent = d.product_title || '—';
  $('#metaFU').textContent = d.functional_unit || '—';
  $('#metaSBPill').textContent = d.system_boundary || '—';
  $('#resName').textContent = d.product_title || '—';
  $('#resValue').textContent = fmtNum(d.total_co2eq);
  $('#resCycle').textContent = d.accounting_cycle || '—';
  $('#resFU').textContent = d.functional_unit || '—';
  $('#resMethod').textContent = d.method || '—';
  $('#resRegion').textContent = d.region || '—';
  $('#resDate').textContent = new Date().toLocaleDateString();
  $('#aiOverview').textContent = d.total_description || '';

  renderFlow(d);
  renderFlowTable(d);
  renderRanking(d, fmtNum);
  renderDonut(d, fmtNum, total);

  fillList('#assumptions', d.assumptions);
  fillList('#limitations', d.limitations);
  fillList('#recommendations', d.recommendations);

  $('#detailPanel').classList.remove('show');
  switchStep(1);
  switchView('tree');

  $('#pageHome').classList.add('hidden');
  $('#pageResults').classList.add('show');
  setTimeout(() => $('#pageResults').scrollIntoView({behavior:'smooth', block:'start'}), 80);
}

function fillList(sel, arr) {
  const el = $(sel); 
  if (!el) return;
  el.innerHTML = '';
  (arr || []).forEach(x => {
    const li = document.createElement('li');
    li.textContent = x;
    el.appendChild(li);
  });
}

function renderFlow(d) {
  const tot = total(d);
  const stages = d.stages || [];

  $('#flowRoot').innerHTML = `
    <div class="flow-root-left">
      <div class="name">
        <span class="icon">1</span>
        ${escapeHtml(d.functional_unit || '1')} ${escapeHtml(d.product_title || '—')}
      </div>
      <div class="scope"><span class="pill">${escapeHtml(d.system_boundary || '—')}</span></div>
    </div>
    <div class="flow-root-right">
      <div class="label">Total emissions (kgCO₂e)</div>
      <div class="value">${fmtNum(d.total_co2eq)}</div>
    </div>
  `;

  const stagesEl = $('#flowStages'); stagesEl.innerHTML = '';
  stages.forEach((s, i) => {
    const c = CONFIG.STAGE_COLORS[i % CONFIG.STAGE_COLORS.length];
    const card = document.createElement('div');
    card.className = 'stage-card';
    card.style.setProperty('--c-color', c);
    card.innerHTML = `
      <div class="stage-card-head">
        <span class="dot">${i + 1}</span>
        <span class="name">${escapeHtml(s.name)}</span>
        <span class="pct">${fmtNum(s.share_pct)}%</span>
      </div>
      <div class="value">${fmtNum(s.co2eq)}<span class="unit">kgCO₂e</span></div>
    `;
    stagesEl.appendChild(card);
  });

  const colsEl = $('#flowColumns'); colsEl.innerHTML = '';
  stages.forEach((s, i) => {
    const c = CONFIG.STAGE_COLORS[i % CONFIG.STAGE_COLORS.length];
    const col = document.createElement('div');
    col.className = 'flow-col';
    (s.sub_processes || []).forEach((p, j) => {
      const pshare = tot ? (p.co2eq / tot) * 100 : 0;
      const card = document.createElement('div');
      card.className = 'proc-card';
      card.style.setProperty('--c-color', c);
      card.innerHTML = `
        <div class="proc-card-head">
          <span class="name">${escapeHtml(p.name)}</span>
          <span class="pct">${fmtNum(pshare)}%</span>
        </div>
        <div class="value">${fmtNum(p.co2eq)}<span class="unit">kgCO₂e</span></div>
      `;
      col.appendChild(card);
    });
    colsEl.appendChild(col);
  });
}

function renderFlowTable(d) {
  const tot = total(d);
  let html = `
    <thead><tr>
      <th>Process</th><th class="num">Qty</th><th class="num">Factor</th>
      <th>Source</th><th class="num">CO₂-eq</th><th class="num">Share</th>
    </tr></thead><tbody>
  `;
  (d.stages || []).forEach((s, i) => {
    const color = CONFIG.STAGE_COLORS[i % CONFIG.STAGE_COLORS.length];
    html += `<tr class="stage-row"><td><span class="stage-dot" style="background:${color}"></span>${escapeHtml(s.name)}</td><td class="num">—</td><td class="num">—</td><td class="src">${escapeHtml(s.factor_source || '—')}</td><td class="num">${fmtNum(s.co2eq)}</td><td class="num">${fmtNum(s.share_pct)}%</td></tr>`;
    (s.sub_processes || []).forEach(p => {
      const pshare = tot ? (p.co2eq / tot) * 100 : 0;
      html += `<tr class="proc-row"><td>${escapeHtml(p.name)}</td><td class="num">${fmtNum(p.amount)} ${escapeHtml(p.unit || '')}</td><td class="num">${fmtNum(p.factor)} ${escapeHtml(p.factor_unit || '')}</td><td class="src">${escapeHtml(p.factor_source || '—')}</td><td class="num">${fmtNum(p.co2eq)}</td><td class="num">${fmtNum(pshare)}%</td></tr>`;
    });
  });
  html += `<tr class="total-row"><td>Total</td><td class="num">—</td><td class="num">—</td><td class="src">—</td><td class="num">${fmtNum(tot)}</td><td class="num">100%</td></tr></tbody>`;
  $('#flowTable').innerHTML = html;
}

// ─── Step/View Switching ────────────────────────────────
function switchStep(n) {
  $$('.cs-step').forEach(b => {
    const sn = parseInt(b.dataset.step);
    b.classList.toggle('active', sn === parseInt(n));
    b.classList.toggle('done', sn < parseInt(n));
  });
  $('#step1').classList.toggle('active', n == 1);
  $('#step2').classList.toggle('active', n == 2);
  $('.cs-toolbar').style.display = n == 1 ? '' : 'none';
}

function switchView(v) {
  $$('.cs-view button').forEach(b => b.classList.toggle('active', b.dataset.view === v));
  $('#flowView').style.display = v === 'tree' ? 'flex' : 'none';
  $('#listView').style.display = v === 'list' ? 'block' : 'none';
}

// ─── UI Helpers ─────────────────────────────────────────
function showError(msg) {
  const e = $('#errorBox');
  e.innerHTML = msg;
  e.classList.add('show');
}

function hideError() {
  $('#errorBox').classList.remove('show');
}

// ─── Event Listeners ────────────────────────────────────
function initEventListeners() {
  // Language switcher
  $$('.lang button').forEach(b => {
    b.addEventListener('click', () => applyLanguage(b.dataset.lang));
  });

  // Submit
  $('#submitBtn').addEventListener('click', run);
  $('#productInput').addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') run();
  });

  // Step/View switching
  document.addEventListener('click', e => {
    const stepBtn = e.target.closest('.cs-step');
    if (stepBtn) switchStep(stepBtn.dataset.step);
    const viewBtn = e.target.closest('.cs-view button');
    if (viewBtn) switchView(viewBtn.dataset.view);
  });

  // Back to home
  $('#backToHome')?.addEventListener('click', () => {
    $('#pageResults').classList.remove('show');
    $('#pageHome').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Export buttons
  $('#exportExcel')?.addEventListener('click', () => {
    if (lastReport) downloadExcel(lastReport, currentLang, fmtNum);
  });
  $('#exportWord')?.addEventListener('click', () => {
    if (lastReport) downloadWord(lastReport, currentLang, fmtNum, total);
  });
  $('#exportJson')?.addEventListener('click', () => {
    if (lastReport) downloadJson(lastReport);
  });
  $('#exportPdf')?.addEventListener('click', () => {
    exportPdf(fmtNum, total);
  });
  $('#exportPrint')?.addEventListener('click', () => window.print());

  // Agent
  $('#agentClose')?.addEventListener('click', () => {
    $('#agent').classList.remove('show');
    $('#agentFab').classList.add('show');
  });
  $('#agentFab')?.addEventListener('click', () => {
    $('#agent').classList.add('show');
    $('#agentFab').classList.remove('show');
  });
  $('#agentSend')?.addEventListener('click', () => {
    const msg = $('#agentMsg').value.trim();
    if (agentChatMode) {
      sendChatMessage(msg);
    } else {
      applyAgentAnswers();
    }
  });

  // Modes
  $$('.modes button').forEach(b => {
    b.addEventListener('click', () => {
      $$('.modes button').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      currentMode = b.dataset.mode;
    });
  });
}

// ─── Agent Functions ────────────────────────────────────
async function sendChatMessage(message) {
  if (!message || !lastReport) return;
  
  addChatMessage('user', message);
  $('#agentMsg').value = '';
  
  try {
    const system = `LCA expert. Answer about the model. Current: ${lastReport.product_title}, ${lastReport.total_co2eq} kgCO2e.`;
    const text = await apiCall([
      { role: 'system', content: system },
      { role: 'user', content: message }
    ], { max_tokens: 500, temperature: 0.7, label: 'chat', json: false });
    
    addChatMessage('assistant', text);
  } catch (e) {
    addChatMessage('assistant', 'Error: ' + e.message);
  }
}

function addChatMessage(role, text) {
  agentChatHistory.push({ role, text });
  renderChatHistory();
}

function renderChatHistory() {
  const body = $('#agentBody');
  if (!agentChatMode) return;
  
  let html = '<div class="agent-chat">';
  agentChatHistory.forEach(msg => {
    const isUser = msg.role === 'user';
    html += `<div class="chat-msg ${isUser ? 'chat-user' : 'chat-ai'}"><div class="chat-avatar">${isUser ? '👤' : 'AI'}</div><div class="chat-bubble">${escapeHtml(msg.text)}</div></div>`;
  });
  html += '</div>';
  body.innerHTML = html;
  body.scrollTop = body.scrollHeight;
}

async function applyAgentAnswers() {
  const answered = agentQuestions.filter(q => q.selectedIdx >= 0);
  const note = $('#agentMsg').value.trim();
  if (!answered.length && !note) return;

  const lines = answered.map(q => `— ${q.text} → ${q.options[q.selectedIdx]}`);
  if (note) lines.push(`— ${note}`);

  agentRefinements = 'Уточнения:\n' + lines.join('\n');
  $('#agentMsg').value = '';

  run();
}

// ─── Init ───────────────────────────────────────────────
function init() {
  applyLanguage('zh');
  initTheme();
  initEventListeners();
  
  // Example chips (Chinese)
  const examples = [
    { l: '黑麦面包, 1 kg', v: '1 kg 波兰烘焙的黑麦面包,牛皮纸包装' },
    { l: 'T恤, 200g', v: '1件200g棉质T恤,孟加拉国生产' },
    { l: '1 kWh 煤电', v: '1 kWh来自燃煤电厂的电力' },
    { l: '牛奶, 1L', v: '1升2.5%牛奶,白俄罗斯牧场' }
  ];
  
  const host = $('#exampleChips');
  if (host) {
    examples.forEach(ex => {
      const b = document.createElement('button');
      b.textContent = ex.l;
      b.addEventListener('click', () => {
        $('#productInput').value = ex.v;
        $('#productInput').focus();
      });
      host.appendChild(b);
    });
  }
}

// Start
document.addEventListener('DOMContentLoaded', init);
