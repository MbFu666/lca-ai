const fs = require('fs');
const p = 'C:/Users/Administrator/Desktop/site/modules/index.html';
let c = fs.readFileSync(p, 'utf8');

// Find the scrub CSS block boundaries
const cssStart = c.indexOf('\n/* \u2500\u2500\u2500 Scroll-Scrub');
const styleEnd = c.indexOf('\n</style>', cssStart);
const scrubCss = c.substring(cssStart, styleEnd);

// Remove scrub CSS from its current position
c = c.substring(0, cssStart) + c.substring(styleEnd);

// Now find the FIRST </style> (which is the main style block)
const mainStyleEnd = c.indexOf('</style>');

// Insert scrub CSS right before it
c = c.substring(0, mainStyleEnd) + '\n' + scrubCss.trim() + '\n' + c.substring(mainStyleEnd);

// Verify
const verify = fs.readFileSync(p, 'utf8');
const firstStyleEnd = verify.indexOf('</style>');
const css = verify.substring(0, firstStyleEnd);
const hasScrub = css.includes('.scrub-track');
const hasBg = css.includes('.scrub-bg');
const hasCopy = css.includes('.scrub-copy');

console.log('Scrub CSS in main style block:', hasScrub);
console.log('Has .scrub-bg:', hasBg);
console.log('Has .scrub-copy:', hasCopy);

// Write
fs.writeFileSync(p, c, 'utf8');
console.log('Written. Lines:', c.split('\n').length);
