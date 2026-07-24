const fs = require('fs');
const c = fs.readFileSync('C:/Users/Administrator/Desktop/site/modules/index.html', 'utf8');

// 1. Check if scrub CSS is inside a <style> block (not template literal)
const styleBlocks = [];
let idx = 0;
while ((idx = c.indexOf('<style>', idx)) !== -1) {
  const end = c.indexOf('</style>', idx);
  const content = c.substring(idx + 7, end);
  const hasScrub = content.includes('.scrub-track');
  const startLine = c.substring(0, idx).split('\n').length;
  const endLine = c.substring(0, end).split('\n').length;
  styleBlocks.push({ startLine, endLine, hasScrub, len: content.length });
  idx = end + 8;
}

console.log('=== STYLE BLOCKS ===');
styleBlocks.forEach((b, i) => {
  console.log(`Block ${i+1}: lines ${b.startLine}-${b.endLine}, scrub: ${b.hasScrub}, len: ${b.len}`);
});

// 2. Check if scrub HTML exists
const scrubHtml = c.indexOf('scrub-track');
console.log('\n=== SCRUB HTML ===');
console.log('scrub-track at line:', c.substring(0, scrubHtml).split('\n').length);

// 3. Check if scrub JS exists and compiles
const scrubJs = c.indexOf('scrubWrap');
console.log('\n=== SCRUB JS ===');
console.log('scrubWrap at line:', c.substring(0, scrubJs).split('\n').length);

// 4. Check for JS errors in main script
const scriptStart = c.indexOf('<script>', c.indexOf('</style>'));
const scriptEnd = c.indexOf('</script>', scriptStart);
const js = c.substring(scriptStart + 8, scriptEnd);
try {
  new Function(js);
  console.log('\nJS compiles: OK');
} catch (e) {
  console.log('\nJS ERROR:', e.message);
}

// 5. Check if scrub section is hidden
const scrubSection = c.substring(scrubHtml, c.indexOf('</section>', scrubHtml));
console.log('\n=== SCRUB SECTION ===');
console.log('Has scrub-bg:', scrubSection.includes('scrub-bg'));
console.log('Has scrub-copy:', scrubSection.includes('scrub-copy'));
console.log('Has scrub-vis:', scrubSection.includes('scrub-vis'));
console.log('Has scrub-stage:', scrubSection.includes('scrub-stage'));
