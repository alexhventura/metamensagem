import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function patch(file, fn) {
  const p = path.join(root, file);
  let s = fs.readFileSync(p, 'utf8');
  const next = fn(s);
  if (next === s) {
    console.warn(`⚠ sem alteração: ${file}`);
    return;
  }
  fs.writeFileSync(p, next, 'utf8');
  console.log(`✅ ${file}`);
}

patch('src/views/FraseDetalhe.tsx', (s) =>
  s.replace(
    `      <MudarMetaSEO
        title={seoPack.title}
        description={seoPack.description}
        canonical={canonical}
        hreflangLinks={hreflangLinks}
      />`,
    `      <MudarMetaSEO
        title={seoPack.title}
        description={seoPack.description}
        canonical={canonical}
        hreflangLinks={hreflangLinks}
        htmlLang={pageHtmlLang}
      />`
  )
);

patch('src/components/ContentCard.tsx', (s) => {
  if (s.includes('detectLanguageOriginal(item.texto)')) return s;
  return s.replace(
    `  const detailPath = isFrase
    ? frasePath(item.slug || normalizarParaSlug(item.texto), 'pt')
    : \`/metafora/\${item.id}/\${normalizarParaSlug(item.titulo || '')}\`;`,
    `  const detailPath = isFrase
    ? (() => {
        const slug = item.slug || normalizarParaSlug(item.texto);
        const def = seoLocaleFromLanguageOriginal(detectLanguageOriginal(item.texto));
        return frasePath(slug, def, def);
      })()
    : \`/metafora/\${item.id}/\${normalizarParaSlug(item.titulo || '')}\`;`
  );
});

patch('src/App.tsx', (s) =>
  s.replace('PREFIX_LOCALES.map((lang)', 'SEO_LOCALES.map((lang)')
);

patch('package.json', (s) => {
  if (s.includes('"build": "vite build"')) return s;
  return s.replace(
    `"build": "node scripts/enrich-external-content.mjs && node prepare-data.cjs && node scripts/generate-sitemap.mjs && vite build",`,
    `"build": "vite build",
    "build:local": "node scripts/enrich-external-content.mjs && node prepare-data.cjs && node scripts/generate-sitemap.mjs && vite build",
    "frases:seo:all": "npm run frases:seo:phase6 && npm run frases:sitemap:intl",`
  );
});
