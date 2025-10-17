const fs = require('fs');
const s = fs.readFileSync('c:/Users/kkhan/Downloads/clean - Copy/src/pages/imports.page.js','utf8');
const lines = s.split('\n');
let balance = 0;
for (let i=0;i<lines.length;i++){
  const line = lines[i];
  for (let ch of line){
    if (ch === '{') balance++;
    else if (ch === '}') balance--;
  }
  if (balance < 0){
    console.log('Balance negative at line', i+1, 'line:', line);
    process.exit(0);
  }
}
console.log('Final balance', balance);
// If positive, show last 20 lines with counts per line
if (balance > 0){
  for (let i=0;i<lines.length;i++){
    const open = (lines[i].match(/{/g)||[]).length;
    const close = (lines[i].match(/}/g)||[]).length;
    if (open || close) console.log(i+1, 'o', open, 'c', close, lines[i].slice(0,200));
  }
}
