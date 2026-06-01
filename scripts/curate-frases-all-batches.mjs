/**
 * Curadoria IA em lotes com checkpoint (só frases sem curadoria_ia).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { loadCuradoriaApiKey, getCuradoriaAiProvider } from '../lib/secrets/loadCuradoriaApiKey.ts';
import { curateFraseBatch } from '../lib/curation/fraseCurator.ts';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = path.join(ROOT, 'content', 'frases');
const STATE_PATH = path.join(ROOT, 'data', 'import', 'curate-batch-state.json');

for (const f of ['.env.local', '.env']) {
  const p = path.join(ROOT, f);
  if (fs.existsSync(p)) dotenv.config({ path: p, quiet: true });
}

const args = process.argv.slice(2);
const batchSize = Math.max(parseInt(args.find((a, i) => args[i - 1] === '--batch') || '5', 10) || 5, 1);
const maxPerRun = parseInt(args.find((a, i) => args[i - 1] === '--max') || '0', 10) || 0;
const reset = args.includes('--reset-state');

function listAuthorFiles() {
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((n) => n.endsWith('.json') && n !== 'frases.json')
    .sort()
    .map((n) => path.join(CONTENT_DIR, n));
}

function loadState() {
  if (reset || !fs.existsSync(STATE_PATH)) return { fileIndex: 0, offsetInFile: 0, curated: 0 };
  return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
}

function saveState(s) {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify({ ...s, updatedAt: new Date().toISOString() }, null, 2));
}

async function main() {
  const apiKey = loadCuradoriaApiKey();
  if (!apiKey) {
    console.error('❌ Configure SECRETS_PASSPHRASE + npm run secrets:set-openai');
    process.exit(1);
  }

  const files = listAuthorFiles();
  let state = loadState();
  let processedThisRun = 0;

  console.log(`🤖 Curadoria IA (${getCuradoriaAiProvider()}) | lote=${batchSize}`);

  for (let fi = state.fileIndex; fi < files.length; fi++) {
    const file = files[fi];
    const arr = JSON.parse(fs.readFileSync(file, 'utf8'));
    let start = fi === state.fileIndex ? state.offsetInFile : 0;

    while (start < arr.length) {
      const pending = [];
      for (let i = start; i < arr.length && pending.length < batchSize; i++) {
        const f = arr[i];
        if (!f.informacoes?.curadoria_ia) pending.push({ index: i, frase: f });
      }
      if (!pending.length) {
        start = arr.length;
        break;
      }

      const batch = pending.map((p) => p.frase);
      try {
        const curated = await curateFraseBatch(batch, apiKey);
        for (let j = 0; j < pending.length; j++) {
          arr[pending[j].index] = curated[j];
        }
        fs.writeFileSync(file, JSON.stringify(arr, null, 2) + '\n', 'utf8');
        state.curated += curated.length;
        processedThisRun += curated.length;
      } catch (e) {
        console.warn(`⚠️ ${path.basename(file)}: ${e.message}`);
      }

      start = pending[pending.length - 1].index + 1;
      state.fileIndex = fi;
      state.offsetInFile = start;
      saveState(state);

      if (maxPerRun > 0 && processedThisRun >= maxPerRun) {
        console.log(`⏸ Limite --max ${maxPerRun} atingido. Retome depois.`);
        return;
      }

      await new Promise((r) => setTimeout(r, 1200));
    }

    state.fileIndex = fi + 1;
    state.offsetInFile = 0;
    saveState(state);
  }

  if (fs.existsSync(STATE_PATH)) {
    fs.renameSync(STATE_PATH, STATE_PATH.replace('.json', '.done.json'));
  }
  console.log(`✅ Curadoria concluída. Total curadas nesta execução: ${processedThisRun} | acumulado: ${state.curated}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
