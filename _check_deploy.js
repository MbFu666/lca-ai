const https = require('https');
https.get('https://lca-ai.ru/', r => {
  let d = '';
  r.on('data', c => d += c);
  r.on('end', () => {
    console.log('Size:', d.length);
    console.log('Has pageHome:', d.includes('id="pageHome"'));
    console.log('Has pageResults:', d.includes('id="pageResults"'));
    console.log('Has run() redirect:', d.includes('/report.html?history='));
    console.log('Has renderReport in run():', d.includes('renderReport(data)'));
    console.log('Has auth guard modal:', d.includes('modalAuthRequired'));
    console.log('Has reg_benefits:', d.includes('reg_benefits'));
  });
}).on('error', e => console.log(e.message));
