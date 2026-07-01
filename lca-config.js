/**
 * LCA·AI — Configuration Module
 * Centralized configuration and constants
 */

export const CONFIG = {
  API_URL: '/api/lca',
  MODEL: 'deepseek-v4-flash',
  STAGE_COLORS: ['#2C4A3E', '#5B7860', '#B8753C', '#8B6F47', '#3D5A6C', '#7A3B2D'],
  MAX_HISTORY: 20,
  CACHE_TTL: 24 * 60 * 60 * 1000, // 24 hours
  MAX_CACHE_SIZE: 50
};

export const STORAGE_KEYS = {
  HISTORY: 'lca-history',
  PROJECTS: 'lca-projects',
  CACHE: 'lca-cache',
  THEME: 'lca-theme',
  LANG: 'lca-lang'
};
