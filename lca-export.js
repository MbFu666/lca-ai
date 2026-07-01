/**
 * LCA·AI — Export Module
 * PDF, Word, Excel, JSON export functions
 */

import { CONFIG } from './lca-config.js';
import { getDonutImage } from './lca-charts.js';

/**
 * Export to PDF using html2canvas + jsPDF
 */
export async function exportPdf(fmtNum, total) {
  // Load required libraries
  await Promise.all([loadLib('jspdf'), loadLib('html2canvas')]);
  
  const step2 = document.getElementById('step2');
  if (!step2) return;
  
  const { jsPDF } = window.jspdf;
  
  const canvas = await html2canvas(step2, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false
  });
  
  const imgData = canvas.toDataURL('image/png');
  const imgWidth = 190;
  const pageHeight = 277;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let heightLeft = imgHeight;
  let position = 10;
  
  const doc = new jsPDF('p', 'mm', 'a4');
  
  doc.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;
  
  while (heightLeft > 0) {
    position = heightLeft - imgHeight + 10;
    doc.addPage();
    doc.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }
  
  const fileName = (lastReport?.product_title || 'lca-report')
    .replace(/[^\w\-\u0400-\u04FF\u4e00-\u9fff]+/g, '_') + '.pdf';
  doc.save(fileName);
}

/**
 * Export to Word with donut diagram
 */
export function downloadWord(d, lang, fmtNum, total) {
  const donutImg = getDonutImage(d, fmtNum, total);
  const stages = d.stages || [];
  
  const t = getTranslations(lang);
  
  const html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; color: #0E2E27; }
        h1 { color: #0E2E27; font-size: 24px; }
        h2 { color: #14C997; border-bottom: 1px solid #E5E8EB; padding-bottom: 8px; font-size: 18px; }
        h3 { color: #0E2E27; font-size: 14px; margin-top: 20px; }
        table { border-collapse: collapse; width: 100%; margin: 16px 0; }
        th, td { border: 1px solid #E5E8EB; padding: 8px 12px; text-align: left; }
        th { background: #F8FAFA; font-weight: 600; font-size: 11px; text-transform: uppercase; }
        .total { background: #ECFAF4; font-weight: 700; }
        .value { font-family: 'Courier New', monospace; text-align: right; }
        .meta { color: #4D5E61; font-size: 13px; }
        .donut-section { display: flex; align-items: flex-start; gap: 30px; margin: 20px 0; }
        .legend { font-size: 12px; }
        .legend-item { display: flex; align-items: center; gap: 8px; margin: 6px 0; }
        .legend-color { width: 12px; height: 12px; display: inline-block; }
        .footer { color: #93A0A6; font-size: 10px; margin-top: 30px; border-top: 1px solid #E5E8EB; padding-top: 10px; }
      </style>
    </head>
    <body>
      <h1>LCA Report: ${esc(d.product_title || '-')}</h1>
      <div class="meta">
        <p><strong>${t.fu}:</strong> ${esc(d.functional_unit || '-')}</p>
        <p><strong>${t.sb}:</strong> ${esc(d.system_boundary || '-')}</p>
        <p><strong>${t.method}:</strong> ${esc(d.method || '-')}</p>
        <p><strong>${t.region}:</strong> ${esc(d.region || '-')}</p>
        <p><strong>${t.total}:</strong> <span class="value">${fmtNum(d.total_co2eq)} kgCO₂e</span></p>
      </div>
      
      <h2>${t.composition}</h2>
      <div class="donut-section">
        <img src="${donutImg}" width="200" height="200" alt="Donut chart">
        <div class="legend">
          ${stages.map((s, i) => `<div class="legend-item"><span class="legend-color" style="background:${CONFIG.STAGE_COLORS[i % CONFIG.STAGE_COLORS.length]}"></span> ${esc(s.name)} — ${fmtNum(s.share_pct)}%</div>`).join('')}
        </div>
      </div>
      
      <h2>${t.breakdown}</h2>
      <table>
        <tr><th>${t.stage}</th><th>${t.co2}</th><th>${t.share}</th></tr>
        ${stages.map(s => `<tr><td>${esc(s.name)}</td><td class="value">${fmtNum(s.co2eq)}</td><td class="value">${fmtNum(s.share_pct)}%</td></tr>`).join('')}
        <tr class="total"><td>${t.total}</td><td class="value">${fmtNum(d.total_co2eq)}</td><td class="value">100%</td></tr>
      </table>
      
      ${stages.map(s => `
        <h3>${esc(s.name)}</h3>
        <table>
          <tr><th>${t.process}</th><th>${t.amount}</th><th>${t.factor}</th><th>${t.source}</th><th>${t.co2}</th></tr>
          ${(s.sub_processes || []).map(p => `<tr><td>${esc(p.name)}</td><td>${fmtNum(p.amount)} ${esc(p.unit || '')}</td><td>${fmtNum(p.factor)} ${esc(p.factor_unit || '')}</td><td>${esc(p.factor_source || '-')}</td><td class="value">${fmtNum(p.co2eq)}</td></tr>`).join('')}
        </table>
      `).join('')}
      
      ${d.total_description ? `<h2>${t.analysis}</h2><p>${esc(d.total_description)}</p>` : ''}
      
      ${d.assumptions?.length ? `<h3>${t.assumptions}</h3><ul>${d.assumptions.map(a => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}
      ${d.limitations?.length ? `<h3>${t.limitations}</h3><ul>${d.limitations.map(l => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}
      ${d.recommendations?.length ? `<h3>${t.recommendations}</h3><ul>${d.recommendations.map(r => `<li>${esc(r)}</li>`).join('')}</ul>` : ''}
      
      <div class="footer">Generated by LCA·AI on ${new Date().toLocaleDateString()}</div>
    </body>
    </html>
  `;
  
  const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (d.product_title || 'lca-report')
    .replace(/[^\w\-\u0400-\u04FF\u4e00-\u9fff]+/g, '_') + '.doc';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Export to Excel
 */
export function downloadExcel(d, lang, fmtNum) {
  if (typeof XLSX === 'undefined') {
    alert('XLSX library not loaded');
    return;
  }
  const rows = excelRows(d, lang, fmtNum);
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{wch: 40}, {wch: 16}, {wch: 20}, {wch: 20}, {wch: 16}, {wch: 10}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'LCA');
  const name = (d.product_title || 'lca-report')
    .replace(/[^\w\-\u0400-\u04FF\u4e00-\u9fff]+/g, '_').slice(0, 50) + '.xlsx';
  XLSX.writeFile(wb, name);
}

/**
 * Export to JSON
 */
export function downloadJson(d) {
  const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (d.product_title || 'lca-report')
    .replace(/[^\w\-\u0400-\u04FF\u4e00-\u9fff]+/g, '_') + '.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ─── Helpers ─────────────────────────────────────────────

function excelRows(d, lang, fmtNum) {
  const t = getTranslations(lang);
  const rows = [];
  rows.push(['LCA Report', d.product_title || '', '', '', '', '']);
  rows.push([t.fu, d.functional_unit || '', '', '', '', '']);
  rows.push([t.sb, d.system_boundary || '', '', '', '', '']);
  rows.push([t.method, d.method || '', '', '', '', '']);
  rows.push([t.region, d.region || '', '', '', '', '']);
  rows.push([]);
  rows.push([t.stage, t.co2, t.share]);
  (d.stages || []).forEach(s => {
    rows.push([s.name, s.co2eq, s.share_pct]);
    (s.sub_processes || []).forEach(p => {
      rows.push(['  ' + p.name, p.co2eq, '']);
    });
  });
  rows.push([t.total, d.total_co2eq, 100]);
  return rows;
}

function getTranslations(lang) {
  const translations = {
    ru: { fu: 'Функц. единица', sb: 'Границы системы', method: 'Метод', region: 'Регион', total: 'Итого', composition: 'Состав выбросов', breakdown: 'Разбивка по стадиям', stage: 'Стадия', co2: 'CO₂-экв', share: 'Доля', process: 'Процесс', amount: 'Кол-во', factor: 'Фактор', source: 'Источник', analysis: 'Анализ ИИ', assumptions: 'Допущения', limitations: 'Ограничения', recommendations: 'Рекомендации' },
    en: { fu: 'Functional unit', sb: 'System boundary', method: 'Method', region: 'Region', total: 'Total', composition: 'Emission Composition', breakdown: 'Stage Breakdown', stage: 'Stage', co2: 'CO₂-eq', share: 'Share', process: 'Process', amount: 'Amount', factor: 'Factor', source: 'Source', analysis: 'AI Analysis', assumptions: 'Assumptions', limitations: 'Limitations', recommendations: 'Recommendations' },
    zh: { fu: '功能单位', sb: '系统边界', method: '方法', region: '地区', total: '合计', composition: '排放组成', breakdown: '阶段分解', stage: '阶段', co2: 'CO₂当量', share: '占比', process: '过程', amount: '数量', factor: '因子', source: '来源', analysis: 'AI分析', assumptions: '假设', limitations: '局限性', recommendations: '建议' }
  };
  return translations[lang] || translations.en;
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function loadLib(name) {
  const libs = {
    xlsx: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    html2canvas: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
  };
  if (!libs[name]) return;
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = libs[name];
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}
