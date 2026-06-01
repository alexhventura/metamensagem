import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function patch(file, fn) {
  const p = path.join(root, file);
  const before = fs.readFileSync(p, 'utf8');
  const after = fn(before);
  if (after === before) {
    console.warn(`⚠ sem alteração: ${file}`);
    return;
  }
  fs.writeFileSync(p, after, 'utf8');
  console.log(`✅ ${file}`);
}

patch('src/i18n.ts', (s) => {
  let out = s;
  if (!s.includes('"tagline_before": "Mente, Mensaje')) {
    out = out.replace(
      `"tagline": "Mente, Mensaje y Cambio."\n      },`,
      `"tagline": "Mente, Mensaje y Cambio.",
        "tagline_before": "Mente, Mensaje y",
        "tagline_highlight": "Cambio.",
        "slogan": "Palabras que cruzan fronteras y acercan personas."
      },`
    );
  }
  if (!s.includes('"tagline_before": "Esprit')) {
    out = out.replace(
      `"tagline": "Esprit, Message et Changement."\n      },`,
      `"tagline": "Esprit, Message et Changement.",
        "tagline_before": "Esprit, Message et",
        "tagline_highlight": "Changement.",
        "slogan": "Des mots qui traversent les frontières et rapprochent les gens."
      },`
    );
  }
  return out;
});

patch('src/i18n/extraLocales.ts', (s) => {
  if (s.includes('tagline_before') && s.includes('हिन्दी') === false) {
    // hi block
  }
  if (!s.includes("slogan: 'शब्द")) {
    return s.replace(
      "app: { title: 'Metamensagem', tagline: 'मन, संदेश और परिवर्तन।' },",
      `app: {
      title: 'Metamensagem',
      tagline: 'मन, संदेश और परिवर्तन।',
      tagline_before: 'मन, संदेश और',
      tagline_highlight: 'परिवर्तन।',
      slogan: 'शब्द जो सीमाएँ पार करते हैं और लोगों को करीब लाते हैं।',
    },`
    );
  }
  return s;
});

patch('src/App.tsx', (s) => {
  let out = s;

  out = out.replace(
    /setBancoRandom\(shuffleArray\(boot\.items\)\)/g,
    'setBancoRandom(shuffleArray(boot.items.filter((i) => i.tipo === \'frase\')))'
  );
  out = out.replace(
    /setBancoRandom\(shuffleArray\(full\.items\)\)/g,
    'setBancoRandom(shuffleArray(full.items.filter((i) => i.tipo === \'frase\')))'
  );

  out = out.replace(
    '<Route path="/" element={<HomeView tema={tema} toast={mostrarToast} banco={bancoTotal} tags={tagsUnicas} bancoRandom={bancoRandom} />} />',
    '<Route path="/" element={<HomeView tema={tema} toast={mostrarToast} banco={bancoTotal} bancoRandom={bancoRandom} />} />'
  );

  out = out.replace(
    /function HomeView\(\{ tema, toast, banco, tags, bancoRandom \}[^)]+\)/,
    'function HomeView({ tema, toast, banco, bancoRandom }: { tema: string; toast: any; banco: ItemConteudo[]; bancoRandom: ItemConteudo[] })'
  );

  if (!out.includes('bancoFrases')) {
    out = out.replace(
      `  const [busca, setBusca] = useState('');
  const [itensVisiveis, setItensVisiveis] = useState(10);
  const [imageQuote, setImageQuote] = useState<{ id: string; texto: string; autor: string } | null>(null);
  const resultadosFiltrados = useMemo(() => {
    if (!busca.trim()) return bancoRandom;
    return searchBancoSemantico(banco, busca);
  }, [busca, banco, bancoRandom]);`,
      `  const [busca, setBusca] = useState('');
  const [itensVisiveis, setItensVisiveis] = useState(10);
  const [imageQuote, setImageQuote] = useState<{ id: string; texto: string; autor: string } | null>(null);
  const bancoFrases = useMemo(() => banco.filter((i) => i.tipo === 'frase'), [banco]);
  const bancoRandomFrases = useMemo(
    () => bancoRandom.filter((i) => i.tipo === 'frase'),
    [bancoRandom]
  );
  const tagsFrases = useMemo(
    () =>
      Array.from(new Set(bancoFrases.flatMap((f) => f.tags || [])))
        .sort()
        .slice(0, 12),
    [bancoFrases]
  );
  const resultadosFiltrados = useMemo(() => {
    if (!busca.trim()) return bancoRandomFrases;
    return searchBancoSemantico(bancoFrases, busca);
  }, [busca, bancoFrases, bancoRandomFrases]);`
    );
  }

  out = out.replace(
    /<section className="text-center py-12">[\s\S]*?<\/section>\s*\n\s*<div className=\{GRID_CONTENT\}>/,
    `<section className="text-center pt-2 pb-6 md:pt-4 md:pb-8">
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-5xl md:text-7xl font-black mb-3 tracking-tighter leading-none"
        >
          {t('app.tagline_before')} <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#8B5CF6] via-[#A855F7] to-[#D946EF]">
            {t('app.tagline_highlight')}
          </span>
        </motion.h1>
        <p
          className={\`text-sm md:text-[15px] font-medium tracking-wide max-w-md mx-auto mb-8 \${
            tema === 'light' ? 'text-zinc-500' : 'text-zinc-400/90'
          }\`}
        >
          {t('app.slogan')}
        </p>

        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
          <input
            type="text"
            placeholder={t('home.search_placeholder')}
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setItensVisiveis(10);
            }}
            className={\`w-full py-5 pl-14 pr-6 rounded-[2rem] border-2 font-medium outline-none transition-all shadow-xl \${
              tema === 'light'
                ? 'bg-white border-zinc-100 text-black focus:border-[#A855F7] shadow-zinc-200'
                : 'bg-zinc-900 border-zinc-800 text-white focus:border-[#A855F7] shadow-black/50'
            }\`}
          />
        </div>

        <div className="flex flex-wrap justify-center gap-2 mt-8 max-w-2xl mx-auto">
          {tagsFrases.map((tag) => (
            <Link
              key={tag}
              to={pathFromTag(tag)}
              className={\`px-3.5 py-1.5 rounded-full text-[11px] font-bold border transition-colors \${
                tema === 'light'
                  ? 'bg-zinc-100 border-zinc-200 text-zinc-600 hover:border-[#A855F7] hover:text-[#A855F7]'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-[#A855F7] hover:text-[#A855F7]'
              }\`}
            >
              #{tag}
            </Link>
          ))}
        </div>
      </section>

      <div className={GRID_CONTENT}>`
  );

  out = out.replace(
    '              Frases\n            </Link>\n            <Link to="/metaforas"',
    "              {t('nav.quotes')}\n            </Link>\n            <Link to=\"/metaforas\""
  );
  out = out.replace(
    /              Met[^\n]+\n            <\/Link>/,
    "              {t('nav.metaforas')}\n            </Link>"
  );

  return out;
});
