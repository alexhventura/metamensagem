/**
 * Mescla e normaliza metáforas para public/metaforas.json
 *
 * Uso:
 *   node processar_dados.js
 *   node processar_dados.js --entrada "C:\Users\user\Downloads\metaforas_data.txt"
 *   node processar_dados.js --sem-fragmentos
 *
 * Ordem de mesclagem (mesmo id → o arquivo posterior prevalece):
 *   1. public/metaforas.json (base atual)
 *   2. metaforas_data.txt
 *   3. metaforas_data (2).txt
 *   4. metaforas.json em Downloads (se existir)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const OUTPUT = path.join(__dirname, 'public', 'metaforas.json');
/** Arquivos posteriores substituem o mesmo id. (2).txt deve ser o último. */
const DEFAULT_SOURCES = [
  path.join(__dirname, 'public', 'metaforas.json'),
  path.join(process.env.USERPROFILE || '', 'Downloads', 'metaforas_data.txt'),
  path.join(process.env.USERPROFILE || '', 'Downloads', 'metaforas_data (2).txt'),
];

const FOOTER_RE =
  /\n*Metáforas mais novas[\s\S]*?Metáforas infantis, título\s*Z-A\s*$/i;

const DEFAULT_TAGS = ['Metáfora', 'Reflexão', 'Histórias'];

function sanitizarId(id) {
  if (!id) return '';
  return id.toString().toLowerCase().replace(/[^a-z0-9_\-]/g, '').substring(0, 50);
}

function gerarId(item) {
  const base = `${item.titulo || ''}|${(item.texto || '').slice(0, 120)}`;
  const hash = createHash('sha1').update(base).digest('hex').slice(0, 9);
  return `m_${hash}`;
}

function limparTexto(texto) {
  if (!texto || typeof texto !== 'string') return '';
  return texto.replace(FOOTER_RE, '').trim();
}

function gerarResumo(texto, limite = 150) {
  const limpo = limparTexto(texto).replace(/\s+/g, ' ').trim();
  if (!limpo) return 'Metáfora terapêutica para reflexão e transformação pessoal.';
  if (limpo.length <= limite) return limpo;
  return limpo.substring(0, limite).trim() + '...';
}

function normalizarTags(tags) {
  if (!Array.isArray(tags)) return [...DEFAULT_TAGS];
  const v = tags
    .map((t) => (typeof t === 'string' ? t.trim() : ''))
    .filter(Boolean);
  return v.length ? [...new Set(v)] : [...DEFAULT_TAGS];
}

function normalizarItem(raw, stats) {
  const texto = limparTexto(raw.texto || '');
  if (!texto) {
    stats.descartados++;
    return null;
  }

  let id = sanitizarId(raw.id);
  if (!id) {
    id = gerarId({ titulo: raw.titulo, texto });
    stats.idsGerados++;
  }

  const titulo = (raw.titulo || 'Sem Título').toString().trim() || 'Sem Título';
  const autor = (raw.autor || 'Anônimo').toString().trim() || 'Anônimo';
  let resumo = (raw.resumo || '').toString().trim();
  if (!resumo) {
    resumo = gerarResumo(texto);
    stats.resumosGerados++;
  }

  return {
    id,
    tipo: 'metafora',
    titulo,
    texto,
    resumo,
    autor,
    tags: normalizarTags(raw.tags),
  };
}

function carregarArquivo(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) {
    throw new Error(`${filePath} não é um array JSON.`);
  }
  return data;
}

function parseArgs(argv) {
  const args = { entradas: [], semFragmentos: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--entrada' && argv[i + 1]) {
      args.entradas.push(argv[++i]);
    } else if (argv[i] === '--sem-fragmentos') {
      args.semFragmentos = true;
    }
  }
  return args;
}

function mesclar(fontes, stats) {
  const mapa = new Map();

  for (const fonte of fontes) {
    const lista = carregarArquivo(fonte.path);
    if (!lista) {
      console.log(`⏭️  Ignorado (não encontrado): ${fonte.path}`);
      continue;
    }

    console.log(`📂 ${fonte.label}: ${lista.length} itens`);
    stats.arquivosLidos++;

    for (const raw of lista) {
      const item = normalizarItem(raw, stats);
      if (!item) continue;

      if (mapa.has(item.id)) stats.atualizados++;
      else stats.novos++;

      mapa.set(item.id, item);
    }
  }

  return [...mapa.values()].sort((a, b) =>
    (a.titulo || '').localeCompare(b.titulo || '', 'pt-BR')
  );
}

function main() {
  const cli = parseArgs(process.argv.slice(2));
  const stats = {
    arquivosLidos: 0,
    novos: 0,
    atualizados: 0,
    duplicatasIgnoradas: 0,
    resumosGerados: 0,
    idsGerados: 0,
    descartados: 0,
  };

  const fontes = (cli.entradas.length ? cli.entradas : DEFAULT_SOURCES).map(
    (p, i) => ({
      path: path.resolve(p),
      label: path.basename(p),
      substitui: true,
    })
  );

  console.log('🚀 processar_dados.js — Metamensagem\n');

  const resultado = mesclar(fontes, stats);

  fs.writeFileSync(OUTPUT, JSON.stringify(resultado, null, 2), 'utf8');

  console.log('\n✅ Mesclagem concluída');
  console.log(`   Total final: ${resultado.length} metáforas`);
  console.log(`   Saída: ${OUTPUT}`);
  console.log(`   Novos: ${stats.novos} | Atualizados: ${stats.atualizados}`);
  console.log(`   Resumos gerados: ${stats.resumosGerados}`);
  console.log(`   IDs gerados: ${stats.idsGerados}`);
  console.log(`   Descartados (sem texto): ${stats.descartados}`);

  if (!cli.semFragmentos) {
    console.log('\n📦 Gerando índices e fragmentos (prepare-data.cjs)...');
    const prep = spawnSync(process.execPath, ['prepare-data.cjs'], {
      cwd: __dirname,
      stdio: 'inherit',
    });
    if (prep.status !== 0) {
      console.warn('⚠️  prepare-data.cjs falhou — rode manualmente: node prepare-data.cjs');
      process.exit(prep.status || 1);
    }
  } else {
    console.log('\n💡 Fragmentos não gerados (--sem-fragmentos). Rode: node prepare-data.cjs');
  }
}

main();
