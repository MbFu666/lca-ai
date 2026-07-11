const https = require('https');
https.get('https://lca-ai.ru/cabinet', r => {
  let d = '';
  r.on('data', c => d += c);
  r.on('end', () => {
    // Extract inline script
    const s1 = d.indexOf('<script>\n        const SB_URL');
    const e1 = d.indexOf('</script>', s1);
    const script = d.substring(s1 + 8, e1);
    
    // Check for duplicate const declarations
    const constMatches = script.match(/^const \w+/gm) || [];
    const duplicates = constMatches.filter((v, i, a) => a.indexOf(v) !== i);
    if (duplicates.length) console.log('DUPLICATE CONSTS:', duplicates);
    else console.log('No duplicate consts');
    
    // Check for duplicate function declarations
    const funcMatches = script.match(/^function \w+|^async function \w+/gm) || [];
    const funcDups = funcMatches.filter((v, i, a) => a.indexOf(v) !== i);
    if (funcDups.length) console.log('DUPLICATE FUNCTIONS:', funcDups);
    else console.log('No duplicate functions');
    
    // Check if getSB uses window.supabase
    console.log('getSB check:', script.substring(script.indexOf('function getSB'), script.indexOf('function getSB') + 200));
  });
}).on('error', e => console.log(e.message));
