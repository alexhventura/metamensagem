import fs from 'fs';

const path = 'src/i18n.ts';
let s = fs.readFileSync(path, 'utf8');
if (!s.includes('extraLocales')) {
  s = s.replace(
    "import LanguageDetector from 'i18next-browser-languagedetector';",
    "import LanguageDetector from 'i18next-browser-languagedetector';\nimport { de, hi, it, ja } from './i18n/extraLocales';"
  );
  fs.writeFileSync(path, s);
  console.log('import added');
} else {
  console.log('already ok');
}
