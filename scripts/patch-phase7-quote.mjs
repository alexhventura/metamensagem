import fs from 'fs';

const quoteImport = "import { quoteFromItem } from './components/image-generator/utils/quoteFromItem';";

// App.tsx
let app = fs.readFileSync('src/App.tsx', 'utf8');
if (!app.includes('quoteFromItem')) {
  app = app.replace(
    "const ImageGeneratorModal = lazy(() => import('./components/image-generator'));",
    `const ImageGeneratorModal = lazy(() => import('./components/image-generator'));\n${quoteImport}`
  );
  app = app.replace(
    /setImageQuote\(\{ id: i\.id, texto: i\.texto, autor: i\.autor \}\)/g,
    'setImageQuote(quoteFromItem(i))'
  );
  fs.writeFileSync('src/App.tsx', app);
}

// TagCategoria
let tag = fs.readFileSync('src/views/TagCategoria.tsx', 'utf8');
if (!tag.includes('quoteFromItem')) {
  tag = tag.replace(
    "const ImageGeneratorModal = lazy(() => import('../components/image-generator'));",
    `import { quoteFromItem } from '../components/image-generator/utils/quoteFromItem';\nconst ImageGeneratorModal = lazy(() => import('../components/image-generator'));`
  );
  tag = tag.replace(
    /setImageQuote\(\{ id: i\.id, texto: i\.texto, autor: i\.autor \}\)/,
    'setImageQuote(quoteFromItem(i))'
  );
  fs.writeFileSync('src/views/TagCategoria.tsx', tag);
}

// FraseDetalhe
let fd = fs.readFileSync('src/views/FraseDetalhe.tsx', 'utf8');
if (!fd.includes('palavras_chave: frase')) {
  fd = fd.replace(
    /setImageQuote\(\{\s*id: frase\.id,\s*texto: frase\.frase_original,\s*autor: frase\.autor_original,\s*\}\)/s,
    `setImageQuote({
                      id: frase.id,
                      texto: frase.frase_original,
                      autor: frase.autor_original,
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

console.log('patch-phase7-quote OK');
