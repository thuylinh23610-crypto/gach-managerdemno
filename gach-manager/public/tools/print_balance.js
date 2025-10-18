const fs = require('fs');
const s = fs.readFileSync('c:/Users/kkhan/Downloads/clean - Copy/src/pages/imports.page.js','utf8');
const lines = s.split('\n');
let balance = 0;
for (let i=0;i<lines.length;i++){
  const line = lines[i];
  const opens = (line.match(/\{/g)||[]).length;
  const closes = (line.match(/\}/g)||[]).length;
  balance += opens - closes;
  if ((i+1) >= 1000) console.log(i+1, 'o', opens, 'c', closes, 'balance', balance, line.slice(0,200));
}
console.log('final balance', balance);