import fs from 'fs';

// FraseDetalhe.tsx
let fd = fs.readFileSync('src/views/FraseDetalhe.tsx', 'utf8');
fd = fd.replace('<<CardTooltip', '<CardTooltip');
fd = fd.replace(
  /const \[imageQuote, setImageQuote\] = useState<ItemConteudo \| null>\(null\);/,
  "const [imageQuote, setImageQuote] = useState<{ id: string; texto: string; autor: string } | null>(null);"
);
fd = fd.replace(
  /\s*toast=\{toast\}\s*temaGlobal=\{tema\}\s*\/>\s*\)\}\s*(\s*<\/motion\.div>)/,
  '$1'
);
fs.writeFileSync('src/views/FraseDetalhe.tsx', fd);

// TagCategoria.tsx
let tag = fs.readFileSync('src/views/TagCategoria.tsx', 'utf8');
tag = tag.replace(
  /^import React, \{ lazy, Suspense \}, \{ useMemo, useState \} from 'react';/m,
  "import React, { lazy, Suspense, useMemo, useState } from 'react';"
);
tag = tag.replace(/\nimport \{ lazy, Suspense \} from 'react';\nconst ImageGeneratorModal/, '\nconst ImageGeneratorModal');
tag = tag.replace(
  /const \[imageQuote, setImageQuote\] = useState<ItemConteudo \| null>\(null\);/,
  "const [imageQuote, setImageQuote] = useState<{ id: string; texto: string; autor: string } | null>(null);"
);
fs.writeFileSync('src/views/TagCategoria.tsx', tag);

// App.tsx — Suspense around lazy modal
let app = fs.readFileSync('src/App.tsx', 'utf8');
if (!app.includes('<Suspense fallback={null}>\n        <ImageGeneratorModal')) {
  app = app.replace(
    /\{imageQuote && \(\s*<ImageGeneratorModal/g,
    '{imageQuote && (\n        <Suspense fallback={null}>\n        <ImageGeneratorModal'
  );
  app = app.replace(
    /tema=\{tema\}\s*\/>/g,
    (m, offset) => {
      const slice = app.slice(Math.max(0, offset - 200), offset + 50);
      if (slice.includes('ImageGeneratorModal') && !slice.includes('</Suspense>')) {
        return 'tema={tema}\n        />\n        </Suspense>';
      }
      return m;
    }
  );
}
// Safer: only two occurrences in HomeView and FrasesView
app = app.replace(
  `{imageQuote && (
        <ImageGeneratorModal
          open
          quote={imageQuote}
          onClose={() => setImageQuote(null)}
          toast={toast}
          tema={tema}
        />
      )}`,
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
fs.writeFileSync('src/App.tsx', app);

// vite.config — chunk html-to-image
let vite = fs.readFileSync('vite.config.ts', 'utf8');
if (!vite.includes('html-to-image')) {
  vite = vite.replace(
    "if (id.includes('modern-screenshot') || id.includes('html2canvas')) return 'vendor-screenshot';",
    "if (id.includes('modern-screenshot') || id.includes('html2canvas') || id.includes('html-to-image')) return 'vendor-screenshot';"
  );
  fs.writeFileSync('vite.config.ts', vite);
}

console.log('fix-image-generator-integration OK');
