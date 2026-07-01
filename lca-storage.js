/**
 * LCA·AI — Storage Module
 * LocalStorage management for history, projects, cache
 */

import { CONFIG, STORAGE_KEYS } from './lca-config.js';

// ─── History ────────────────────────────────────────────
export function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY)) || [];
  } catch { return []; }
}

export function saveToHistory(report) {
  const history = getHistory();
  const entry = {
    id: Date.now(),
    date: new Date().toISOString(),
    product: report.product_title,
    fu: report.functional_unit,
    total: report.total_co2eq,
    data: report
  };
  history.unshift(entry);
  if (history.length > CONFIG.MAX_HISTORY) history.pop();
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
}

export function loadFromHistory(id) {
  const history = getHistory();
  return history.find(h => h.id === id);
}

export function clearHistory() {
  localStorage.removeItem(STORAGE_KEYS.HISTORY);
}

// ─── Projects ───────────────────────────────────────────
export function getProjects() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS)) || [];
  } catch { return []; }
}

export function saveProject(project) {
  const projects = getProjects();
  const existing = projects.findIndex(p => p.id === project.id);
  if (existing >= 0) {
    projects[existing] = project;
  } else {
    projects.push(project);
  }
  localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
}

export function createProject(name) {
  const project = {
    id: Date.now(),
    name,
    createdAt: new Date().toISOString(),
    calculations: []
  };
  saveProject(project);
  return project;
}

export function addToProject(projectId, report) {
  const projects = getProjects();
  const project = projects.find(p => p.id === projectId);
  if (project) {
    project.calculations.push({
      id: Date.now(),
      product: report.product_title,
      total: report.total_co2eq,
      data: report,
      addedAt: new Date().toISOString()
    });
    saveProject(project);
  }
}

export function deleteProject(projectId) {
  const projects = getProjects().filter(p => p.id !== projectId);
  localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
}

export function deleteCalcFromProject(projectId, calcId) {
  const projects = getProjects();
  const project = projects.find(p => p.id === projectId);
  if (project) {
    project.calculations = project.calculations.filter(c => c.id !== calcId);
    saveProject(project);
  }
}

// ─── Cache ──────────────────────────────────────────────
function getCacheKey(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i);
    hash |= 0;
  }
  return 'lca_' + Math.abs(hash).toString(36);
}

export function getCached(text) {
  try {
    const cache = JSON.parse(localStorage.getItem(STORAGE_KEYS.CACHE)) || {};
    const key = getCacheKey(text);
    const entry = cache[key];
    if (entry && Date.now() - entry.ts < CONFIG.CACHE_TTL) {
      console.log('[LCA] Cache hit');
      return entry.data;
    }
  } catch {}
  return null;
}

export function setCache(text, data) {
  try {
    const cache = JSON.parse(localStorage.getItem(STORAGE_KEYS.CACHE)) || {};
    const key = getCacheKey(text);
    cache[key] = { ts: Date.now(), data };
    const keys = Object.keys(cache);
    if (keys.length > CONFIG.MAX_CACHE_SIZE) {
      delete cache[keys[0]];
    }
    localStorage.setItem(STORAGE_KEYS.CACHE, JSON.stringify(cache));
  } catch {}
}

// ─── Theme ──────────────────────────────────────────────
export function getTheme() {
  return localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
}

export function setTheme(theme) {
  localStorage.setItem(STORAGE_KEYS.THEME, theme);
}

// ─── Language ───────────────────────────────────────────
export function getLanguage() {
  return localStorage.getItem(STORAGE_KEYS.LANG) || 'zh';
}

export function setLanguage(lang) {
  localStorage.setItem(STORAGE_KEYS.LANG, lang);
}
