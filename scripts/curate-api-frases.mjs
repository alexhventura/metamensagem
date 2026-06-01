/**
 * Curadoria de frases de APIs → schema canônico do CMS (ChatGPT/OpenAI por padrão).
 *
 * Uso:
 *   node scripts/curate-api-frases.mjs --limit 20
 *   node scripts/curate-api-frases.mjs --quote "..." --author "Nome"
 *   node scripts/curate-api-frases.mjs --input data/import/lote.json
 *   node scripts/curate-api-frases.mjs --limit 30 --promote   # grava + split + migrate + rebuild
 *   node scripts/curate-api-frases.mjs --dry-run
 *
 * Requer chave OpenAI (criptografada) ou FRASES_AI_PROVIDER=gemini para curadoria completa.
 * Sem chave: gera estrutura base (sem explicacao rica).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
import {
  normalizeRawInput,
  buildBaseRecord,
  applyAuthorFacts,
  mergeAiCuration,
  loadAuthorFacts,
  loadExistingTextKeys,
} from './lib/curate-frase.mjs';
import { fetchAllSources } from './lib/quote-sources.mjs';
import { loadCuradoriaApiKey, getCuradoriaAiProvider } from '../lib/secrets/loadCuradoriaApiKey.ts';
import { enrichBatchWithCuradoria } from '../lib/ai/enrichBatch.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'data', 'import');
const DEFAULT_OUT = path.join(OUT_DIR, 'api-curated.json');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const PROMOTE = args.includes('--promote');
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) || 20 : 20;
const inputIdx = args.indexOf('--input');
const INPUT_FILE = inputIdx >= 0 ? path.resolve(args[inputIdx + 1]) : null;
const quoteIdx = args.indexOf('--quote');
const authorIdx = args.indexOf('--author');
const SINGLE_QUOTE = quoteIdx >= 0 ? args[quoteIdx + 1] : null;
const SINGLE_AUTHOR = authorIdx >= 0 ? args[authorIdx + 1] : 'Anônimo';
const outIdx = args.indexOf('--out');
const OUT_FILE = outIdx >= 0 ? path.resolve(args[outIdx + 1]) : DEFAULT_OUT;

const BATCH_SIZE = 5;

for (const envFile of ['.env.local', '.env']) {
  const p = path.join(ROOT, envFile);
  if (fs.existsSync(p)) dotenv.config({ path: p });
}

async function loadRawItems() {
  if (SINGLE_QUOTE) {
    const raw = normalizeRawInput({
      frase_original: SINGLE_QUOTE,
      autor_original: SINGLE_AUTHOR,
      source: 'manual',
    });
    return raw ? [raw] : [];
  }

  if (INPUT_FILE) {
    const data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
    const list = Array.isArray(data) ? data : Object.values(data).flat();
    return list.map(normalizeRawInput).filter(Boolean);
  }

  console.log(`🌐 Buscando até ${LIMIT} citações em APIs externas...`);
  return (await fetchAllSources({ limit: LIMIT })).map(normalizeRawInput).filter(Boolean);
}

async function main() {
  const rawItems = await loadRawItems();
  if (!rawItems.length) {
    console.error('❌ Nenhuma frase para curar.');
    process.exit(1);
  }

  const existingKeys = loadExistingTextKeys();
  const filtered = rawItems.filter((r) => {
    const key = r.frase_original.toLowerCase().slice(0, 100);
    return key && !existingKeys.has(key);
  });

  console.log(`📥 ${rawItems.length} brutas → ${filtered.length} novas (fora do acervo)`);

  if (!filtered.length) {
    console.log('✅ Nada novo para importar.');
    return;
  }

  const authorFacts = loadAuthorFacts();
  const usedSlugs = new Set();
  const bases = filtered.map((raw) => {
    const base = applyAuthorFacts(buildBaseRecord(raw, usedSlugs), authorFacts);
    return base;
  });

  const apiKey = loadCuradoriaApiKey();
  let curated = [...bases];

  if (apiKey) {
    console.log(`🤖 Curadoria com ${getCuradoriaAiProvider()} (explicacao + metadados)...`);
    for (let i = 0; i < bases.length; i += BATCH_SIZE) {
      const batch = bases.slice(i, i + BATCH_SIZE);
      const label = `${i + 1}-${Math.min(i + BATCH_SIZE, bases.length)}/${bases.length}`;
      process.stdout.write(`   Lote ${label}... `);
      try {
        const byId = await enrichBatchWithCuradoria(batch, apiKey);
        for (let j = 0; j < batch.length; j++) {
          const aiRow = byId.get(batch[j].id);
          curated[i + j] = mergeAiCuration(batch[j], aiRow);
        }
        console.log('ok');
      } catch (e) {
        console.log('falhou:', e.message);
      }
      await new Promise((r) => setTimeout(r, 1200));
    }
  } else {
    console.warn('⚠️ Chave de curadoria ausente — estrutura base sem IA rica.');
    console.warn('   SECRETS_PASSPHRASE + npm run secrets:set-openai ou /dev/chaves');
  }

  const payload = {
    version: 1,
    curatedAt: new Date().toISOString(),
    count: curated.length,
    withAi: Boolean(apiKey),
    items: curated,
  };

  const flatPath = path.join(OUT_DIR, 'api-curated-flat.json');

  if (!DRY_RUN) {
    fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
    fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2) + '\n', 'utf8');
    fs.writeFileSync(flatPath, JSON.stringify(curated, null, 2) + '\n', 'utf8');
    console.log(`\n✅ ${curated.length} frases curadas → ${path.relative(ROOT, OUT_FILE)}`);
  } else {
    console.log(`\n(dry-run) ${curated.length} frases curadas — amostra:`);
    console.log(JSON.stringify(curated[0], null, 2));
  }

  if (PROMOTE && !DRY_RUN) {
    console.log('\n📦 Promovendo ao CMS (split → migrate → rebuild)...');
    execSync(`node scripts/split-frases-by-autor.mjs "${flatPath}"`, {
      cwd: ROOT,
      stdio: 'inherit',
    });
    execSync('node scripts/migrate-all-frases.mjs', { cwd: ROOT, stdio: 'inherit' });
    execSync('node scripts/build-content-metadata.mjs', { cwd: ROOT, stdio: 'inherit' });
    execSync('node prepare-data.cjs', { cwd: ROOT, stdio: 'inherit' });
    console.log('✅ Conteúdo integrado em content/frases/ e public/frases-cms.json');
  } else if (!DRY_RUN) {
    console.log('\nPróximo passo:');
    console.log(`  node scripts/split-frases-by-autor.mjs "${flatPath}"`);
    console.log('  npm run frases:rebuild');
    console.log('\nOu rode com --promote para integrar automaticamente.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
