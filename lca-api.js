/**
 * LCA·AI — API Module
 * DeepSeek API communication
 */

import { CONFIG } from './lca-config.js';

/**
 * Make API call to DeepSeek
 * @param {Array} messages - Chat messages
 * @param {Object} opts - Options { max_tokens, temperature, label, json }
 * @returns {Promise<string>} Response text
 */
export async function apiCall(messages, opts = {}) {
  const body = {
    model: CONFIG.MODEL,
    messages,
    max_tokens: opts.max_tokens || 5000,
    temperature: opts.temperature ?? 0.2,
    stream: false
  };
  
  // response_format only for JSON requests (not for chat)
  if (opts.json !== false) {
    body.response_format = { type: 'json_object' };
  }

  const t0 = Date.now();
  const res = await fetch(CONFIG.API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  const raw = await res.text();
  let data;
  try { data = JSON.parse(raw); } catch { data = { error: raw.slice(0, 500) }; }

  console.log(`[LCA] ${opts.label || 'call'} ${elapsed}s, status=${res.status}`);

  if (!res.ok) {
    const upstream = data.upstream_body || data.error || raw.slice(0, 200);
    let hint = '';
    if (res.status === 401 || /insufficient|balance|payment/i.test(upstream)) {
      hint = ' — возможно, закончился баланс на DeepSeek.';
    } else if (res.status === 504 || /timeout/i.test(upstream)) {
      hint = ' — попробуйте более короткое описание.';
    } else if (res.status === 404 || /model.*not.*found/i.test(upstream)) {
      hint = ' — модель не найдена.';
    }
    throw new Error(`API ${res.status}${hint}`);
  }

  const text = data?.choices?.[0]?.message?.content || '';
  if (!text) {
    const reason = data?.choices?.[0]?.finish_reason || 'unknown';
    if (reason === 'length') {
      throw new Error('DeepSeek обрезал ответ по лимиту длины.');
    }
    if (reason === 'content_filter') {
      throw new Error('DeepSeek заблокировал ответ по фильтру контента.');
    }
    throw new Error(`DeepSeek вернул пустой ответ (finish_reason: ${reason}).`);
  }
  return text;
}

/**
 * Parse JSON response with repair attempts
 * @param {string} text - Raw response text
 * @returns {Object} Parsed JSON
 */
export function parseJsonResponse(text) {
  const cleaned = String(text).replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  const first = cleaned.indexOf('{');
  if (first < 0) {
    throw new Error('Нет JSON в ответе');
  }

  const body = cleaned.slice(first);

  // Try 1 — as is
  try {
    const last = body.lastIndexOf('}');
    return JSON.parse(body.slice(0, last + 1));
  } catch (e1) {}

  // Try 2 — escape newlines
  try {
    return JSON.parse(escapeInlineNewlines(body));
  } catch (e2) {}

  // Try 3 — repair truncated
  try {
    return JSON.parse(repairTruncatedJson(escapeInlineNewlines(body)));
  } catch (e3) {}

  // Try 4 — just repair
  try {
    return JSON.parse(repairTruncatedJson(body));
  } catch (e4) {}

  // Try 5 — jsonrepair library
  if (typeof window !== 'undefined' && window.JSONRepair && window.JSONRepair.jsonrepair) {
    try {
      const repaired = window.JSONRepair.jsonrepair(body);
      return JSON.parse(repaired);
    } catch (e5) {}
  }

  throw new Error('Не удалось распарсить JSON');
}

function escapeInlineNewlines(s) {
  let out = '';
  let inStr = false;
  let esc = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (esc) { out += ch; esc = false; continue; }
    if (ch === '\\') { out += ch; esc = true; continue; }
    if (ch === '"')  { out += ch; inStr = !inStr; continue; }
    if (inStr) {
      if (ch === '\n')      out += '\\n';
      else if (ch === '\r') out += '\\r';
      else if (ch === '\t') out += '\\t';
      else if (ch.charCodeAt(0) < 0x20) out += '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0');
      else out += ch;
    } else {
      out += ch;
    }
  }
  return out;
}

function repairTruncatedJson(s) {
  s = s.replace(/,\s*$/, '');
  const lastQuote = s.lastIndexOf('"');
  const lastClose = Math.max(s.lastIndexOf('}'), s.lastIndexOf(']'));
  if (lastQuote > lastClose) {
    s = s.slice(0, lastClose + 1);
  }
  s = s.replace(/,(\s*[}\]])/g, '$1').replace(/,\s*$/, '');

  let depthObj = 0, depthArr = 0, inStr = false, esc = false;
  for (const ch of s) {
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (ch === '"')  { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === '{') depthObj++;
    else if (ch === '}') depthObj--;
    else if (ch === '[') depthArr++;
    else if (ch === ']') depthArr--;
  }
  while (depthArr-- > 0) s += ']';
  while (depthObj-- > 0) s += '}';
  return s;
}
