import fs from 'fs';

let app = fs.readFileSync('src/App.tsx', 'utf8');
if (!app.includes('PREFIX_LOCALES')) {
  app = app.replace(
    "import { buildTagRegistry, pathFromTag } from './lib/tagsSeo';",
    "import { buildTagRegistry, pathFromTag } from './lib/tagsSeo';\nimport { PREFIX_LOCALES } from './lib/i18nRoutes';"
  );
}
if (!app.includes('PREFIX_LOCALES.map')) {
  app = app.replace(
    '<Route path="/frases/:slug" element={<FraseDetalheView tema={tema} toast={mostrarToast} />} />',
    `<Route path="/frases/:slug" element={<FraseDetalheView tema={tema} toast={mostrarToast} />} />
                {PREFIX_LOCALES.map((lang) => (
                  <Route
                    key={lang}
                    path={\`/\${lang}/frases/:slug\`}
                    element={<FraseDetalheView tema={tema} toast={mostrarToast} />}
                  />
                ))}`
  );
}
fs.writeFileSync('src/App.tsx', app);

let cc = fs.readFileSync('src/components/ContentCard.tsx', 'utf8');
if (!cc.includes('frasePath')) {
  cc = cc.replace(
    "import { pathFromTag } from '../lib/tagsSeo';",
    "import { pathFromTag } from '../lib/tagsSeo';\nimport { frasePath } from '../lib/i18nRoutes';"
  );
  cc = cc.replace(
    '? `/frases/${item.slug || normalizarParaSlug(item.texto)}`',
    "? frasePath(item.slug || normalizarParaSlug(item.texto), 'pt')"
  );
}
fs.writeFileSync('src/components/ContentCard.tsx', cc);
console.log('OK');
