/**
 * Pipeline final: aguarda import → normaliza → rebuild → valida → curadoria IA (opcional) → build.
 *
 * Uso:
 *   node scripts/finalize-metamensagem-pipeline.mjs
 *   node scripts/finalize-metamensagem-pipeline.mjs --skip-ai
 *   node scripts/finalize-metamensagem-pipeline.mjs --curate-max 500
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawn } from 'child_process';
import dotenv from 'dotenv';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const IMPORT_STATE = path.join(ROOT, 'data', 'import', 'citei-batch-state.json');
const LOG_DIR = path.join(ROOT, 'data', 'import', 'logs');

const args = process.argv.slice(2);
const skipAi = args.includes('--skip-ai');
const skipBuild = args.includes('--skip-build');
const maxCurate = parseInt(args.find((a, i) => args[i - 1] === '--curate-max') || '0', 10) || 0;

for (const f of ['.env.local', '.env']) {
  const p = path.join(ROOT, f);
  if (fs.existsSync(p)) dotenv.config({ path: p, quiet: true });
}

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.appendFileSync(path.join(LOG_DIR, 'finalize-pipeline.log'), line + '\n', 'utf8');
}

function countFrases() {
  const dir = path.join(ROOT, 'content', 'frases');
  let n = 0;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.json') || f === 'frases.json') continue;
    n += JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).length;
  }
  return n;
}

function isImportProcessRunning() {
  try {
    const out = execSync('powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"name=\'node.exe\'\\" | Select-Object -ExpandProperty CommandLine"', {
      encoding: 'utf8',
    });
    return out.includes('import-citei-all-batches') || out.includes('import-csv-all-batches');
  } catch {
    return false;
  }
}

async function waitForImport(maxMinutes = 180) {
  const deadline = Date.now() + maxMinutes * 60 * 1000;
  while (Date.now() < deadline) {
    const stateExists = fs.existsSync(IMPORT_STATE);
    const running = isImportProcessRunning();

    if (!stateExists && !running) {
      log('✓ Importação não está ativa (checkpoint ausente).');
      return;
    }

    if (stateExists) {
      const st = JSON.parse(fs.readFileSync(IMPORT_STATE, 'utf8'));
      if (st.offset >= 499700 && !running) {
        log('✓ Importação CSV já no fim do arquivo; removendo checkpoint.');
        fs.renameSync(IMPORT_STATE, IMPORT_STATE.replace('.json', '.done.json'));
        return;
      }
    }

    if (stateExists) {
      const st = JSON.parse(fs.readFileSync(IMPORT_STATE, 'utf8'));
      log(`⏳ Importação em andamento… offset=${st.offset} | gravadas=${st.totalPersisted} | lote #${st.batchNum}`);
    } else if (running) {
      log('⏳ Processo de importação ainda em execução…');
    }

    if (!running && stateExists) {
      const st = JSON.parse(fs.readFileSync(IMPORT_STATE, 'utf8'));
      if (st.offset >= 499700) {
        fs.renameSync(IMPORT_STATE, IMPORT_STATE.replace('.json', '.done.json'));
        log('✓ Checkpoint no fim do CSV; seguindo finalização.');
        return;
      }
      log('↻ Retomando importação (processo parado com checkpoint).');
      const child = spawn('npm', ['run', 'frases:import:citei:all', '--', '--no-ai', '--batch', '800'], {
        cwd: ROOT,
        stdio: 'inherit',
        shell: true,
      });
      await new Promise((resolve, reject) => {
        child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`import exit ${code}`))));
      });
      return;
    }

    if (!running && !stateExists) return;

    await new Promise((r) => setTimeout(r, 30000));
  }
  throw new Error('Timeout aguardando importação');
}

function run(cmd, label) {
  log(`▶ ${label}`);
  execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
}

function validateSample() {
  const dir = path.join(ROOT, 'content', 'frases');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'frases.json').slice(0, 20);
  let bad = 0;
  const slugSet = new Set();
  for (const f of files) {
    const arr = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    for (const item of arr) {
      if (!item.slug || !item.frase_original || !item.explicacao) bad++;
      if (slugSet.has(item.slug)) bad++;
      slugSet.add(item.slug);
    }
  }
  log(`✓ Amostra validada (${files.length} arquivos): problemas=${bad}`);
}

async function main() {
  log('═══ Finalização Metamensagem ═══');

  await waitForImport();

  log(`📊 Frases no acervo: ${countFrases()}`);

  const masterPath = path.join(ROOT, 'content', 'frases', 'frases.json');
  const masterCount = fs.existsSync(masterPath)
    ? JSON.parse(fs.readFileSync(masterPath, 'utf8')).length
    : 0;

  if (masterCount < 1000) {
    try {
      execSync('node scripts/migrate-all-frases.mjs', { cwd: ROOT, stdio: 'inherit' });
    } catch {
      log('⚠️ migrate-all-frases ignorado');
    }
  } else {
    log(`✓ Acervo mestre já tem ${masterCount} frases — migrate omitido.`);
  }

  if (!args.includes('--skip-normalize') && masterCount < 50000) {
    run('npx tsx scripts/normalize-acervo.mjs', 'Normalização schema/encoding');
  } else {
    log('✓ Normalização por arquivo omitida (acervo grande; schema via migrate/prepare-data).');
  }

  run('node scripts/build-content-metadata.mjs', 'build-content-metadata');
  run('node prepare-data.cjs', 'prepare-data (frases-cms.json)');

  validateSample();

  if (!skipAi) {
    const curateArgs = ['scripts/curate-frases-all-batches.mjs', '--batch', '5'];
    const defaultMax = masterCount > 100000 ? 500 : 0;
    const cap = maxCurate > 0 ? maxCurate : defaultMax;
    if (cap > 0) curateArgs.push('--max', String(cap));
    log(`▶ Curadoria IA (lotes; max=${cap || 'ilimitado'})`);
    try {
      execSync(`npx tsx ${curateArgs.join(' ')}`, { cwd: ROOT, stdio: 'inherit' });
      run('node scripts/build-content-metadata.mjs', 'rebuild pós-curadoria');
      run('node prepare-data.cjs', 'prepare-data pós-curadoria');
    } catch (e) {
      log(`⚠️ Curadoria parcial: ${e.message}`);
      log('   Retome: npm run frases:curate:all');
    }
  }

  if (!skipBuild) {
    run('npm run lint', 'Typecheck');
    try {
      run('npm run build', 'Build produção');
    } catch (e) {
      log(`⚠️ Build: ${e.message} — verifique manualmente`);
    }
  }

  log(`✅ Pipeline finalizado. Frases: ${countFrases()}`);
}

main().catch((e) => {
  log(`❌ ${e.message}`);
  process.exit(1);
});
