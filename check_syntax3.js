const fs = require('fs');
const c = fs.readFileSync('C:/Users/Administrator/Desktop/site/modules/home.html', 'utf8');

// Extract all script blocks properly
const scriptRegex = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi;
let match;
let idx = 0;
while ((match = scriptRegex.exec(c)) !== null) {
  const content = match[1].trim();
  if (!content) { idx++; continue; } // skip external scripts
  try {
    new Function(content);
    console.log('Script block ' + idx + ': OK (' + content.split('\n').length + ' lines)');
  } catch(e) {
    console.log('Script block ' + idx + ': ERROR - ' + e.message.substring(0, 150));
    // Find approximate line
    const lines = content.split('\n');
    let low = 0, high = lines.length;
    while (high - low > 1) {
      const mid = Math.floor((low + high) / 2);
      try {
        new Function(lines.slice(0, mid).join('\n'));
        low = mid;
      } catch(e2) {
        high = mid;
      }
    }
    console.log('  Error near line', high, ':', JSON.stringify(lines[high-1]).substring(0, 150));
    console.log('  Prev:', JSON.stringify(lines[high-2]).substring(0, 150));
  }
  idx++;
}
