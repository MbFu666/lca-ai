const c = require('fs').readFileSync('C:/Users/Administrator/Desktop/site/modules/cabinet.html', 'utf8');
console.log('Has brand dot gradient:', c.includes('linear-gradient(135deg, var(--jade), #0A8567)'));
console.log('Has dark dot bg:', c.includes('.brand .dot { background: var(--jade-dark)'));
console.log('Has btn-sm border-radius 0:', c.includes('border-radius: 0') && c.includes('btn-sm'));
console.log('Has fmtDate locale:', c.includes('toLocaleDateString(cabinetLang'));
