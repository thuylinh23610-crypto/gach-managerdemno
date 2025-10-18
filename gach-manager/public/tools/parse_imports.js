const fs = require('fs');
const path = 'c:/Users/kkhan/Downloads/clean - Copy/src/pages/imports.page.js';
try {
  const s = fs.readFileSync(path, 'utf8');
  new Function(s);
  console.log('Parse OK: no syntax errors');
} catch (e) {
  console.error('Parse error:');
  console.error(e && e.stack ? e.stack : e);
  process.exit(1);
}
