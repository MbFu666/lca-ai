const fs = require('fs');
const c = fs.readFileSync('C:/Users/Administrator/Desktop/site/modules/home.html', 'utf8');
const lines = c.split('\n');
const scriptContent = lines.slice(5811, 7352).join('\n');

// Try to narrow down the error
const scriptLines = scriptContent.split('\n');
let low = 0, high = scriptLines.length;
while (high - low > 1) {
  const mid = Math.floor((low + high) / 2);
  const chunk = scriptLines.slice(0, mid).join('\n');
  try {
    new Function(chunk);
    low = mid;
  } catch(e) {
    if (e.message.includes('<')) {
      high = mid;
    } else {
      low = mid;
    }
  }
}
console.log('Error around script line', high, '(file line', high + 5811, ')');
console.log('Content:', scriptLines[high - 1]);
console.log('Previous:', scriptLines[high - 2]);
console.log('Next:', scriptLines[high]);
