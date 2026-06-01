import fs from 'fs';
const p = 'package.json';
let t = fs.readFileSync(p, 'utf8');
t = t.replace(
  /"frases:enrich:phase2": "tsx scripts\/enrich-acervo-phase2\.ts",[^\n]*"frases:seo:phase3"/,
  '"frases:enrich:phase2": "tsx scripts/enrich-acervo-phase2.ts",\n    "frases:seo:phase3"'
);
fs.writeFileSync(p, t);
console.log('fixed');
