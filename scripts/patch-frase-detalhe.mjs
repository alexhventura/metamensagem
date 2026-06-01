import fs from 'fs';

let f = fs.readFileSync('src/views/FraseDetalhe.tsx', 'utf8');

if (!f.includes('useLocation')) {
  f = f.replace(
    "import { Link, useParams } from 'react-router-dom';",
    "import { Link, useLocation, useParams } from 'react-router-dom';"
  );
}

const imports = `import {
  fraseCanonicalUrl,
  fraseHreflangAlternates,
  resolveFraseLocale,
} from '../lib/i18nRoutes';
import { availableLanguagesFromMeta, loadFraseI18nMeta } from '../lib/globalSeoClient';
import { pickTitleDescription } from '../../lib/seo/i18nTemplates';
import { applyHreflangLinks } from '../lib/seoHreflang';
import type { SeoLocale } from '../../lib/i18n/locales';`;

if (!f.includes('fraseCanonicalUrl')) {
  f = f.replace(
    "import { DEFAULT_DESCRIPTION, SITE_ORIGIN } from '../lib/seo';",
    "import { DEFAULT_DESCRIPTION } from '../lib/seo';"
  );
  f = f.replace("import { pathFromTag } from '../lib/tagsSeo';", `import { pathFromTag } from '../lib/tagsSeo';\n${imports}`);
}

if (f.includes('description={description}') && f.includes('descriptionFallback')) {
  f = f.replace(
    /title=\{frase\.frase_original\.slice\(0, 70\)\}\s*\n\s*description=\{description\}/,
    'title={seoPack.title}\n        description={seoPack.description}'
  );
}

if (!f.includes('hreflangLinks={hreflangLinks}')) {
  f = f.replace('canonical={canonical}\n      />', 'canonical={canonical}\n        hreflangLinks={hreflangLinks}\n      />');
}

fs.writeFileSync('src/views/FraseDetalhe.tsx', f);
console.log('FraseDetalhe patched');
