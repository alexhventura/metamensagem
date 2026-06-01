import fs from 'fs';

const p = 'src/components/CardTranslateMenu.tsx';
let s = fs.readFileSync(p, 'utf8');
s = s.replace(
  `import {
  CARD_LANG_OPTIONS,
  CARD_LANG_SUCCESS_LABEL,
  type CardContentDisplay,
  type CardContentSource,
  type CardLang,
} from '../lib/translation/types';`,
  `import { CARD_LANG_OPTIONS, CARD_LANG_SUCCESS_LABEL } from '../lib/translation/cardLanguages';
import type { CardContentDisplay, CardContentSource, CardLang } from '../lib/translation/types';`
);
fs.writeFileSync(p, s);
console.log('OK');
