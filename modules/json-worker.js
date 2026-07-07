// Web Worker for JSON parsing
// Handles heavy JSON parsing in a separate thread

self.addEventListener('message', function(e) {
  const { id, action, data } = e.data;
  
  try {
    let result;
    
    switch (action) {
      case 'parse':
        result = parseJson(data.text);
        break;
      case 'stringify':
        result = JSON.stringify(data.value, null, data.indent || 0);
        break;
      case 'repair':
        result = repairJson(data.text);
        break;
      default:
        throw new Error('Unknown action: ' + action);
    }
    
    self.postMessage({ id, success: true, result });
  } catch (error) {
    self.postMessage({ id, success: false, error: error.message });
  }
});

function parseJson(text) {
  const cleaned = String(text).replace(/^```json\s*/i, '').replace(/```$/, '').trim();
  const first = cleaned.indexOf('{');
  if (first < 0) {
    throw new Error('No JSON object in response');
  }
  
  const body = cleaned.slice(first);
  
  // Try 1 - as is
  try {
    const last = body.lastIndexOf('}');
    return JSON.parse(body.slice(0, last + 1));
  } catch (e1) {}
  
  // Try 2 - escape newlines
  try {
    return JSON.parse(escapeInlineNewlines(body));
  } catch (e2) {}
  
  // Try 3 - repair truncated
  try {
    return JSON.parse(repairTruncatedJson(escapeInlineNewlines(body)));
  } catch (e3) {}
  
  // Try 4 - just repair
  try {
    return JSON.parse(repairTruncatedJson(body));
  } catch (e4) {}
  
  throw new Error('Failed to parse JSON');
}

function escapeInlineNewlines(s) {
  let out = '';
  let inStr = false;
  let esc = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (esc) { out += ch; esc = false; continue; }
    if (ch === '\\') { out += ch; esc = true; continue; }
    if (ch === '"')  { out += ch; inStr = !inStr; continue; }
    if (inStr) {
      if (ch === '\n')      out += '\\n';
      else if (ch === '\r') out += '\\r';
      else if (ch === '\t') out += '\\t';
      else if (ch.charCodeAt(0) < 0x20) out += '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0');
      else out += ch;
    } else {
      out += ch;
    }
  }
  return out;
}

function repairTruncatedJson(s) {
  s = s.replace(/,\s*$/, '');
  const lastQuote = s.lastIndexOf('"');
  const lastClose = Math.max(s.lastIndexOf('}'), s.lastIndexOf(']'));
  if (lastQuote > lastClose) {
    s = s.slice(0, lastClose + 1);
  }
  s = s.replace(/,(\s*[}\]])/g, '$1').replace(/,\s*$/, '');
  
  let depthObj = 0, depthArr = 0, inStr = false, esc = false;
  for (const ch of s) {
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (ch === '"')  { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === '{') depthObj++;
    else if (ch === '}') depthObj--;
    else if (ch === '[') depthArr++;
    else if (ch === ']') depthArr--;
  }
  while (depthArr-- > 0) s += ']';
  while (depthObj-- > 0) s += '}';
  return s;
}

function repairJson(text) {
  // Simple JSON repair
  let s = text.trim();
  
  // Remove trailing commas
  s = s.replace(/,(\s*[}\]])/g, '$1');
  
  // Fix missing quotes on keys
  s = s.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
  
  // Fix single quotes
  s = s.replace(/'/g, '"');
  
  return s;
}
