// Shared Word (.doc) export builder (review #15: single implementation).
// Exposes window.LcaExport = { buildWordHtml(d, opts), downloadWord(d, opts) }.
// opts: { lang, fmtNum?, getDonutImage? }
(function () {
  function dict(lang) {
    var L = {
      ru: { fu: 'Функциональная единица', sb: 'Границы системы', method: 'Метод', region: 'Регион', total: 'Итого выбросы', breakdown: 'Разбивка по стадиям', stage: 'Стадия', co2: 'CO₂-экв', share: 'Доля', process: 'Процесс', amount: 'Кол-во', factor: 'Фактор', source: 'Источник', analysis: 'Анализ ИИ', assumptions: 'Ключевые допущения', limitations: 'Ограничения', recommendations: 'Рекомендации', composition: 'Состав выбросов' },
      en: { fu: 'Functional unit', sb: 'System boundary', method: 'Method', region: 'Region', total: 'Total emissions', breakdown: 'Stage Breakdown', stage: 'Stage', co2: 'CO₂-eq', share: 'Share', process: 'Process', amount: 'Amount', factor: 'Factor', source: 'Source', analysis: 'AI Analysis', assumptions: 'Key Assumptions', limitations: 'Limitations', recommendations: 'Recommendations', composition: 'Emission Composition' },
      zh: { fu: '功能单位', sb: '系统边界', method: '方法', region: '地区', total: '总排放', breakdown: '阶段分解', stage: '阶段', co2: 'CO₂当量', share: '占比', process: '过程', amount: '数量', factor: '因子', source: '来源', analysis: 'AI分析', assumptions: '关键假设', limitations: '局限性', recommendations: '建议', composition: '排放组成' },
    };
    return L[lang] || L.ru;
  }

  function buildWordHtml(d, opts) {
    opts = opts || {};
    var t = dict(opts.lang || 'ru');
    var escW = window.escHtml || function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
    var colors = ['#2C4A3E', '#5B7860', '#B8753C', '#8B6F47', '#3D5A6C', '#7A3B2D'];
    var fn = opts.fmtNum || function (n) { return (n == null || isNaN(n)) ? '—' : Number(n).toFixed(2); };
    var donutImg = (typeof opts.getDonutImage === 'function') ? opts.getDonutImage(d) : '';
    var stages = d.stages || [];

    return `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; color: #0E2E27; }
        h1 { color: #0E2E27; font-size: 24px; }
        h2 { color: #1C1B19; border-bottom: 1px solid #D6D2CB; padding-bottom: 8px; font-size: 18px; }
        h3 { color: #0E2E27; font-size: 14px; margin-top: 20px; }
        table { border-collapse: collapse; width: 100%; margin: 16px 0; }
        th, td { border: 1px solid #D6D2CB; padding: 8px 12px; text-align: left; }
        th { background: #F8FAFA; font-weight: 600; font-size: 11px; text-transform: uppercase; }
        .total { background: #ECFAF4; font-weight: 700; }
        .value { font-family: 'Courier New', monospace; text-align: right; }
        .meta { color: #6B6862; font-size: 13px; }
        .meta strong { color: #0E2E27; }
        .donut-section { margin: 20px 0; }
        .legend-item { margin: 6px 0; font-size: 12px; }
        .legend-color { width: 12px; height: 12px; display: inline-block; margin-right: 8px; vertical-align: middle; }
        .footer { color: #93A0A6; font-size: 10px; margin-top: 30px; border-top: 1px solid #D6D2CB; padding-top: 10px; }
      </style>
    </head>
    <body>
      <h1>LCA Report: ${escW(d.product_title || '-')}</h1>
      <div class="meta">
        <p><strong>${t.fu}:</strong> ${escW(d.functional_unit || '-')}</p>
        <p><strong>${t.sb}:</strong> ${escW(d.system_boundary || '-')}</p>
        <p><strong>${t.method}:</strong> ${escW(d.method || '-')}</p>
        <p><strong>${t.region}:</strong> ${escW(d.region || '-')}</p>
        <p><strong>${t.total}:</strong> <span class="value">${fn(d.total_co2eq)} kgCO₂e</span></p>
      </div>
      ${donutImg ? `<div class="donut-section"><img src="${donutImg}" width="220" height="220" alt="Donut chart"></div>` : ''}
      <h2>${t.composition}</h2>
      ${stages.map((s, i) => `<div class="legend-item"><span class="legend-color" style="background:${colors[i % colors.length]}"></span>${escW(s.name)} — ${fn(s.share_pct)}%</div>`).join('')}
      <h2>${t.breakdown}</h2>
      <table>
        <tr><th>${t.stage}</th><th>${t.co2}</th><th>${t.share}</th></tr>
        ${stages.map(s => `<tr><td>${escW(s.name)}</td><td class="value">${fn(s.co2eq)}</td><td class="value">${fn(s.share_pct)}%</td></tr>`).join('')}
        <tr class="total"><td>${t.total}</td><td class="value">${fn(d.total_co2eq)}</td><td class="value">100%</td></tr>
      </table>
      ${stages.map(s => `
        <h3>${escW(s.name)}</h3>
        <table>
          <tr><th>${t.process}</th><th>${t.amount}</th><th>${t.factor}</th><th>${t.source}</th><th>${t.co2}</th></tr>
          ${(s.sub_processes || []).map(p => `<tr><td>${escW(p.name)}</td><td>${fn(p.amount)} ${escW(p.unit || '')}</td><td>${fn(p.factor)} ${escW(p.factor_unit || '')}</td><td>${escW(p.factor_source || '-')}</td><td class="value">${fn(p.co2eq)}</td></tr>`).join('')}
        </table>
      `).join('')}
      ${d.total_description ? `<h2>${t.analysis}</h2><p>${escW(d.total_description)}</p>` : ''}
      ${d.assumptions && d.assumptions.length ? `<h3>${t.assumptions}</h3><ul>${d.assumptions.map(a => `<li>${escW(a)}</li>`).join('')}</ul>` : ''}
      ${d.limitations && d.limitations.length ? `<h3>${t.limitations}</h3><ul>${d.limitations.map(l => `<li>${escW(l)}</li>`).join('')}</ul>` : ''}
      ${d.recommendations && d.recommendations.length ? `<h3>${t.recommendations}</h3><ul>${d.recommendations.map(r => `<li>${escW(r)}</li>`).join('')}</ul>` : ''}
      <div class="footer">Generated by LCA·AI on ${new Date().toLocaleDateString()}</div>
    </body>
    </html>
  `;
  }

  function downloadWord(d, opts) {
    opts = opts || {};
    var html = buildWordHtml(d, opts);
    var blob = new Blob(['' + html], { type: 'application/msword' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = (d.product_title || 'lca-report').replace(/[^\w\-А-Яа-я\u4e00-\u9fff]+/g, '_') + '.doc';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  window.LcaExport = { buildWordHtml: buildWordHtml, downloadWord: downloadWord };
})();
