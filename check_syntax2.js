const fs = require('fs');
const c = fs.readFileSync('C:/Users/Administrator/Desktop/site/modules/home.html', 'utf8');
const lines = c.split('\n');

// Extract only the JS content between <script> and </script> tags
// Main script block starts at line 5812 (<script>), content from 5813
// Ends at line 7352 (</script>), content until 7351
const scriptContent = lines.slice(5812, 7351).join('\n');

try {
  new Function(scriptContent);
  console.log('Main script: OK');
} catch(e) {
  console.log('Main script ERROR:', e.message.substring(0, 200));
  
  // Binary search for the line
  const scriptLines = scriptContent.split('\n');
  let low = 0, high = scriptLines.length;
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    const chunk = scriptLines.slice(0, mid).join('\n');
    try {
      new Function(chunk);
      low = mid;
    } catch(e2) {
      high = mid;
    }
  }
  console.log('Error at script line', high, '(file line', high + 5812, ')');
  console.log('Content:', JSON.stringify(scriptLines[high - 1]).substring(0, 200));
  console.log('Previous:', JSON.stringify(scriptLines[high - 2]).substring(0, 200));
  console.log('Next:', JSON.stringify(scriptLines[high]).substring(0, 200));
}

// Also check head script block (lines 16-291)
const headScript = lines.slice(15, 290).join('\n');
try {
  new Function(headScript);
  console.log('Head script: OK');
} catch(e) {
  console.log('Head script ERROR:', e.message.substring(0, 200));
}

// Particles script (lines 7353-7426)
const particlesScript = lines.slice(7353, 7426).join('\n');
try {
  new Function(particlesScript);
  console.log('Particles script: OK');
} catch(e) {
  console.log('Particles script ERROR:', e.message.substring(0, 200));
}
