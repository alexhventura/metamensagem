import fs from 'fs';

// ContentCard
let cc = fs.readFileSync('src/components/ContentCard.tsx', 'utf8');
cc = cc.replace(
  "import { BookOpen, Copy, Image as ImageIcon, Share2 } from 'lucide-react';",
  "import { BookOpen, Copy, Share2, Sparkles } from 'lucide-react';"
);
cc = cc.replace(/onEditImage/g, 'onGenerateImage');
cc = cc.replace(
  "text={t('common.edit_image')}",
  "text={t('common.generate_image', 'Gerar Imagem')}"
);
cc = cc.replace(/<ImageIcon/g, '<Sparkles');
cc = cc.replace(
  'onClick={() => onGenerateImage(item)}',
  `onClick={() => onGenerateImage(item)}
                aria-label={t('common.generate_image', 'Gerar Imagem')}`
);
fs.writeFileSync('src/components/ContentCard.tsx', cc);

// App.tsx
let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(
  "const CustomModalGeradorPost = lazy(() => import('./components/ModalGeradorPost'));",
  "const ImageGeneratorModal = lazy(() => import('./components/image-generator'));"
);
app = app.replace(
  /const \[itemPost, setItemPost\] = useState<ItemConteudo \| null>\(null\);/g,
  `const [imageQuote, setImageQuote] = useState<{ id: string; texto: string; autor: string } | null>(null);`
);
app = app.replace(
  /onEditImage=\{item\.tipo === 'frase' \? setItemPost : undefined\}/g,
  `onGenerateImage={
                  item.tipo === 'frase'
                    ? (i) => setImageQuote({ id: i.id, texto: i.texto, autor: i.autor })
                    : undefined
                }`
);
app = app.replace(/onEditImage=\{setItemPost\}/g, `onGenerateImage={(i) => setImageQuote({ id: i.id, texto: i.texto, autor: i.autor })}`);
app = app.replace(
  /\{itemPost && \(\s*<CustomModalGeradorPost[\s\S]*?\/>\s*\)\}/g,
  `{imageQuote && (
        <ImageGeneratorModal
          open
          quote={imageQuote}
          onClose={() => setImageQuote(null)}
          toast={toast}
          tema={tema}
        />
      )}`
);
fs.writeFileSync('src/App.tsx', app);

// FraseDetalhe
let fd = fs.readFileSync('src/views/FraseDetalhe.tsx', 'utf8');
fd = fd.replace(
  "import CustomModalGeradorPost from '../components/ModalGeradorPost';",
  "import { lazy, Suspense } from 'react';\nconst ImageGeneratorModal = lazy(() => import('../components/image-generator'));"
);
fd = fd.replace("import React, { useEffect, useMemo, useState } from 'react';", "import React, { useEffect, useMemo, useState, lazy, Suspense } from 'react';");
// fix duplicate lazy import
fd = fd.replace(
  "import { lazy, Suspense } from 'react';\nconst ImageGeneratorModal = lazy(() => import('../components/image-generator'));",
  ''
);
if (!fd.includes('ImageGeneratorModal')) {
  fd = fd.replace(
    "import React, { useEffect, useMemo, useState, lazy, Suspense } from 'react';",
    "import React, { useEffect, useMemo, useState, lazy, Suspense } from 'react';\nconst ImageGeneratorModal = lazy(() => import('../components/image-generator'));"
  );
}
fd = fd.replace(
  'import { ChevronLeft, Copy, Image as ImageIcon, Share2 } from \'lucide-react\';',
  "import { ChevronLeft, Copy, Share2, Sparkles } from 'lucide-react';"
);
fd = fd.replace('const [itemPost, setItemPost]', 'const [imageQuote, setImageQuote]');
fd = fd.replace(
  /CardTooltip text=\{t\('common\.edit_image'\)\}[\s\S]*?<\/CardTooltip>/,
  `<CardTooltip text={t('common.generate_image', 'Gerar Imagem')} tema={tema}>
                <button
                  type="button"
                  onClick={() =>
                    setImageQuote({
                      id: frase.id,
                      texto: frase.frase_original,
                      autor: frase.autor_original,
                    })
                  }
                  className={cardImageBtnClass('purple')}
                  aria-label={t('common.generate_image', 'Gerar Imagem')}
                >
                  <Sparkles size={18} />
                </button>
              </CardTooltip>`
);
fd = fd.replace(
  /\{itemPost && \([\s\S]*?CustomModalGeradorPost[\s\S]*?\)\}/,
  `{imageQuote && (
        <Suspense fallback={null}>
          <ImageGeneratorModal
            open
            quote={imageQuote}
            onClose={() => setImageQuote(null)}
            toast={toast}
            tema={tema}
          />
        </Suspense>
      )}`
);
fs.writeFileSync('src/views/FraseDetalhe.tsx', fd);

// TagCategoria
let tag = fs.readFileSync('src/views/TagCategoria.tsx', 'utf8');
tag = tag.replace(
  "import CustomModalGeradorPost from '../components/ModalGeradorPost';",
  "import { lazy, Suspense } from 'react';\nconst ImageGeneratorModal = lazy(() => import('../components/image-generator'));"
);
tag = tag.replace(/^import React/m, 'import React, { lazy, Suspense }');
tag = tag.replace(
  "import React, { lazy, Suspense } from 'react';\nconst ImageGeneratorModal = lazy(() => import('../components/image-generator'));",
  ''
);
if (!tag.includes('ImageGeneratorModal')) {
  tag = tag.replace(
    'import React, {',
    "import React, { lazy, Suspense,"
  );
  tag = tag.replace(
    "} from 'react';",
    "} from 'react';\nconst ImageGeneratorModal = lazy(() => import('../components/image-generator'));"
  );
}
tag = tag.replace(/itemPost/g, 'imageQuote');
tag = tag.replace(/setItemPost/g, 'setImageQuote');
tag = tag.replace(/onEditImage=\{item\.tipo === 'frase' \? setImageQuote : undefined\}/g,
  `onGenerateImage={
                    item.tipo === 'frase'
                      ? (i) =>
                          setImageQuote({ id: i.id, texto: i.texto, autor: i.autor })
                      : undefined
                  }`);
tag = tag.replace(/CustomModalGeradorPost/g, 'ImageGeneratorModal');
tag = tag.replace(
  /<ImageGeneratorModal\s+item=\{imageQuote\}/,
  '<ImageGeneratorModal\n          open\n          quote={imageQuote}'
);
tag = tag.replace(/temaGlobal=\{tema\}/, 'tema={tema}');
if (!tag.includes('<Suspense')) {
  tag = tag.replace(
    '{imageQuote && (',
    '{imageQuote && (\n        <Suspense fallback={null}>'
  );
  tag = tag.replace(
    /tema=\{tema\}\s*\/>/,
    'tema={tema}\n        />\n        </Suspense>'
  );
}
fs.writeFileSync('src/views/TagCategoria.tsx', tag);

// i18n
let i18n = fs.readFileSync('src/i18n.ts', 'utf8');
if (!i18n.includes('generate_image')) {
  i18n = i18n.replace(
    '"edit_image": "Editar Imagem",',
    '"edit_image": "Editar Imagem",\n        "generate_image": "Gerar Imagem",'
  );
  i18n = i18n.replace(
    '"edit_image": "Edit Image",',
    '"edit_image": "Edit Image",\n        "generate_image": "Generate Image",'
  );
  i18n = i18n.replace(
    '"edit_image": "Editar Imagen",',
    '"edit_image": "Editar Imagen",\n        "generate_image": "Generar Imagen",'
  );
  i18n = i18n.replace(
    '"edit_image": "Modifier l\'image",',
    '"edit_image": "Modifier l\'image",\n        "generate_image": "Générer une image",'
  );
}
fs.writeFileSync('src/i18n.ts', i18n);

console.log('patch-image-generator OK');
