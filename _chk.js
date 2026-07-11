const https = require('https');
// Check if Supabase CDN is accessible
https.get('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2', { timeout: 10000 }, r => {
  console.log('Supabase SDK CDN status:', r.statusCode);
  r.on('data', () => {});
}).on('error', e => console.log('Supabase SDK CDN error:', e.message));

// Check if the page loads properly
https.get('https://lca-ai.ru/cabinet', r => {
  let d = '';
  r.on('data', c => d += c);
  r.on('end', () => {
    // Check if Supabase SDK is loaded
    console.log('Has supabase CDN:', d.includes('supabase-js'));
    
    // Check if init() is wrapped in DOMContentLoaded
    console.log('Has DOMContentLoaded:', d.includes('DOMContentLoaded'));
    
    // Check if init() is called at script level (not inside DOMContentLoaded)
    const scriptStart = d.indexOf('<script>\n        const SB_URL');
    const scriptContent = d.substring(scriptStart, d.indexOf('</script>', scriptStart));
    const initLine = scriptContent.split('\n').find(l => l.trim() === 'init();');
    console.log('init() at script level:', initLine ? 'YES' : 'NO');
    
    // Check if there's a try-catch around init
    console.log('Has try-catch around init:', scriptContent.includes('try') && scriptContent.includes('init()'));
  });
}).on('error', e => console.log(e.message));
