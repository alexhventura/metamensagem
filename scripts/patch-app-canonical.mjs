import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const app = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'App.tsx');
let s = fs.readFileSync(app, 'utf8');
s = s.replace(
  'canonical={`${SITE_ORIGIN}/frases`}',
  "canonical={absoluteUrl('/frases')}"
);
s = s.replace(
  'canonical={`${SITE_ORIGIN}/metaforas`}',
  "canonical={absoluteUrl('/metaforas')}"
);
fs.writeFileSync(app, s);
console.log('✅ App.tsx canonical URLs patched');
