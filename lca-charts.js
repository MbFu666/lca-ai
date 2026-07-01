/**
 * LCA·AI — Charts Module
 * Canvas-based donut chart and other visualizations
 */

import { CONFIG } from './lca-config.js';

/**
 * Render donut chart on canvas
 * @param {Object} d - Report data
 * @param {Function} fmtNum - Number formatter
 * @param {Function} total - Total calculator
 */
export function renderDonut(d, fmtNum, total) {
  const canvas = document.getElementById('donutCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const cx = 85, cy = 85, outerR = 80, innerR = 55;
  const stages = (d.stages || []).filter(s => (s.share_pct || 0) > 0);
  
  ctx.clearRect(0, 0, 170, 170);
  
  if (stages.length === 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2, true);
    ctx.fillStyle = '#E5E8EB';
    ctx.fill();
  } else {
    let startAngle = -Math.PI / 2;
    stages.forEach((s) => {
      const origIdx = (d.stages || []).indexOf(s);
      const c = CONFIG.STAGE_COLORS[origIdx % CONFIG.STAGE_COLORS.length];
      const sliceAngle = (s.share_pct / 100) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, startAngle, startAngle + sliceAngle);
      ctx.arc(cx, cy, innerR, startAngle + sliceAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = c;
      ctx.fill();
      startAngle += sliceAngle;
    });
  }
  
  // Update CSS fallback
  const donutEl = document.getElementById('donut');
  if (donutEl) donutEl.style.background = 'transparent';
  
  const totalEl = document.getElementById('donutTotal');
  if (totalEl) totalEl.textContent = fmtNum(total(d));

  // Render legend
  const leg = document.getElementById('donutLegend');
  if (leg) {
    leg.innerHTML = '';
    (d.stages || []).forEach((s, i) => {
      const c = CONFIG.STAGE_COLORS[i % CONFIG.STAGE_COLORS.length];
      const row = document.createElement('div');
      row.className = 'donut-legend-row';
      row.innerHTML = `
        <span class="sw" style="background:${c}"></span>
        <span class="lbl">${escapeHtml(s.name)}</span>
        <span class="pct">${fmtNum(s.share_pct)}%</span>
      `;
      leg.appendChild(row);
    });
  }
}

/**
 * Generate donut image as base64 PNG
 * @param {Object} d - Report data
 * @param {Function} fmtNum - Number formatter
 * @param {Function} total - Total calculator
 * @returns {string} Data URL
 */
export function getDonutImage(d, fmtNum, total) {
  const canvas = document.createElement('canvas');
  canvas.width = 340;
  canvas.height = 340;
  const ctx = canvas.getContext('2d');
  const cx = 170, cy = 170, outerR = 160, innerR = 110;
  const stages = (d.stages || []).filter(s => (s.share_pct || 0) > 0);
  
  if (stages.length === 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2, true);
    ctx.fillStyle = '#E5E8EB';
    ctx.fill();
  } else {
    let startAngle = -Math.PI / 2;
    stages.forEach((s) => {
      const origIdx = (d.stages || []).indexOf(s);
      const c = CONFIG.STAGE_COLORS[origIdx % CONFIG.STAGE_COLORS.length];
      const sliceAngle = (s.share_pct / 100) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, startAngle, startAngle + sliceAngle);
      ctx.arc(cx, cy, innerR, startAngle + sliceAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = c;
      ctx.fill();
      startAngle += sliceAngle;
    });
  }
  
  // Center text
  ctx.fillStyle = '#0E2E27';
  ctx.font = 'bold 36px Manrope, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(fmtNum(total(d)), cx, cy - 8);
  ctx.font = '12px Manrope, sans-serif';
  ctx.fillStyle = '#93A0A6';
  ctx.fillText('kgCO₂e', cx, cy + 18);
  
  return canvas.toDataURL('image/png');
}

/**
 * Render ranking bar chart
 * @param {Object} d - Report data
 * @param {Function} fmtNum - Number formatter
 */
export function renderRanking(d, fmtNum) {
  const stages = (d.stages || []).slice().sort((a, b) => (b.co2eq || 0) - (a.co2eq || 0));
  const max = Math.max(...stages.map(s => s.co2eq || 0), 0.0001);
  const host = document.getElementById('ranking');
  if (!host) return;
  host.innerHTML = '';
  
  stages.forEach((s, i) => {
    const origIdx = (d.stages || []).indexOf(s);
    const c = CONFIG.STAGE_COLORS[origIdx % CONFIG.STAGE_COLORS.length];
    const w = ((s.co2eq || 0) / max) * 100;
    const row = document.createElement('div');
    row.className = 'rank-row';
    row.innerHTML = `
      <div class="lbl">${escapeHtml(s.name)}</div>
      <div class="rank-bar"><div class="rank-bar-fill" style="width:0%;background:${c}"></div></div>
      <div class="val">${fmtNum(s.co2eq)}</div>
    `;
    host.appendChild(row);
    requestAnimationFrame(() =>
      row.querySelector('.rank-bar-fill').style.width = w + '%'
    );
  });
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
