import fs from 'fs';

// ContentCard — image quote with translated text
let cc = fs.readFileSync('src/components/ContentCard.tsx', 'utf8');
if (!cc.includes('quoteFromItem')) {
  cc = cc.replace(
    "import type { ItemConteudo } from '../types/content';",
    "import type { ItemConteudo } from '../types/content';\nimport { quoteFromItem } from './image-generator/utils/quoteFromItem';\nimport type { ImageGeneratorQuote } from './image-generator/types';"
  );
  cc = cc.replace(
    'onGenerateImage?: (item: ItemConteudo) => void;',
    'onGenerateImage?: (quote: ImageGeneratorQuote) => void;'
  );
  cc = cc.replace(
    'onClick={() => onGenerateImage(item)}',
    `onClick={() =>
                  onGenerateImage(
                    quoteFromItem(item, {
                      texto: display.texto,
                      autor: display.autor ?? item.autor,
                    })
                  )
                }`
  );
  fs.writeFileSync('src/components/ContentCard.tsx', cc);
}

// App — quoteFromItem in callbacks
let app = fs.readFileSync('src/App.tsx', 'utf8');
if (!app.includes('quoteFromItem')) {
  app = app.replace(
    "import { quoteFromItem } from './components/image-generator/utils/quoteFromItem';",
    "import { quoteFromItem } from './components/image-generator/utils/quoteFromItem';\nimport type { ImageGeneratorQuote } from './components/image-generator/types';"
  );
  if (!app.includes("import type { ImageGeneratorQuote }")) {
    app = app.replace(
      "import { quoteFromItem } from './components/image-generator/utils/quoteFromItem';",
      "import { quoteFromItem } from './components/image-generator/utils/quoteFromItem';\nimport type { ImageGeneratorQuote } from './components/image-generator/types';"
    );
  }
  app = app.replace(
    /useState<\{ id: string; texto: string; autor: string \} \| null>\(null\)/g,
    'useState<ImageGeneratorQuote | null>(null)'
  );
  app = app.replace(
    /setImageQuote\(quoteFromItem\(i\)\)/g,
    'setImageQuote(quoteFromItem(i))'
  );
  fs.writeFileSync('src/App.tsx', app);
}

// FraseDetalhe
let fd = fs.readFileSync('src/views/FraseDetalhe.tsx', 'utf8');
if (!fd.includes('useTranslatedViewMeta')) {
  fd = fd.replace(
    "import { pickTitleDescription } from '../../lib/seo/i18nTemplates';",
    "import { pickTitleDescription } from '../../lib/seo/i18nTemplates';\nimport { useTranslatedViewMeta } from '../lib/useTranslatedViewMeta';\nimport { SEO_LOCALES } from '../lib/i18nRoutes';"
  );
  fd = fd.replace(
    "if (locale && i18n.language !== locale && ['pt', 'en', 'es', 'fr'].includes(locale)) {",
    'if (locale && i18n.language !== locale && (SEO_LOCALES as readonly string[]).includes(locale)) {'
  );
  fd = fd.replace(
    'const quoteText = display.texto || frase?.frase_original || \'\';',
    'const quoteText = display.texto || frase?.frase_original || \'\';\n  const authorLine = display.autor || frase?.autor_original || \'\';\n  useTranslatedViewMeta(display.isTranslated);'
  );
  fd = fd.replace(
    '— {frase.autor_original}',
    '— {authorLine}'
  );
  fd = fd.replace(
    /source=\{translateSource\}/,
    `source={
                    frase
                      ? {
                          texto: frase.frase_original,
                          autor: frase.autor_original,
                          explicacao: frase.explicacao ?? undefined,
                        }
                      : translateSource
                  }`
  );
  fd = fd.replace(
    /setImageQuote\(\{[\s\S]*?locale,\s*\}\)/,
    `setImageQuote({
                      id: frase.id,
                      texto: display.texto || frase.frase_original,
                      autor: display.autor || frase.autor_original,
                      tags: frase.palavras_chave.length
                        ? frase.palavras_chave
                        : [frase.categoria, ...frase.contextos],
                      categoria: frase.categoria,
                      slug: frase.slug,
                      locale,
                    })`
  );
  fs.writeFileSync('src/views/FraseDetalhe.tsx', fd);
}

// Metafora App - useTranslatedViewMeta
if (!app.includes('useTranslatedViewMeta')) {
  app = fs.readFileSync('src/App.tsx', 'utf8');
  app = app.replace(
    "import { type CardContentDisplay } from './lib/translation';",
    "import { type CardContentDisplay } from './lib/translation';\nimport { useTranslatedViewMeta } from './lib/useTranslatedViewMeta';"
  );
  app = app.replace(
    '  const [translating, setTranslating] = useState(false);\n\n  const navigation = useMemo(() => {',
    '  const [translating, setTranslating] = useState(false);\n  useTranslatedViewMeta(display.isTranslated);\n\n  const navigation = useMemo(() => {'
  );
  fs.writeFileSync('src/App.tsx', app);
}

console.log('patch-i18n-global OK');
