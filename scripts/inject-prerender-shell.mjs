/**
 * Injeta shell estático no index.html pós-build (FCP/LCP + crawlers).
 * O React substitui #root na hidratação — layout final inalterado.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const distIndex = 'dist/index.html';
const html = readFileSync(distIndex, 'utf8');

const shell = `
<div class="mm-prerender-shell mm-app-shell min-h-screen flex flex-col font-sans" data-prerender="1">
  <div class="max-w-7xl w-full mx-auto px-4 py-8 flex-1">
    <section class="text-center pt-2 pb-6">
      <h1 class="text-5xl md:text-7xl font-black mb-3 tracking-tighter leading-none">
        Mente, Mensagem <br /><span style="color:#A855F7">e Mudança</span>
      </h1>
      <p class="text-sm font-medium tracking-wide max-w-md mx-auto mb-8 opacity-70">
        Frases inspiradoras e metáforas terapêuticas para reflexão e compartilhamento.
      </p>
    </section>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-hidden="true">
      ${Array.from({ length: 6 })
        .map(
          () =>
            '<div class="rounded-[2.5rem] border border-zinc-800/40 min-h-[320px] bg-zinc-950/80 animate-pulse"></div>'
        )
        .join('')}
    </div>
  </div>
</div>`;

if (html.includes('mm-prerender-shell')) {
  console.log('prerender shell already present');
  process.exit(0);
}

const next = html.replace(
  /<div id="root"><\/div>/,
  `<div id="root">${shell}</div>`
);

if (next === html) {
  console.warn('inject-prerender-shell: #root placeholder not found');
  process.exit(1);
}

writeFileSync(distIndex, next, 'utf8');
console.log('OK: prerender shell injected into dist/index.html');
