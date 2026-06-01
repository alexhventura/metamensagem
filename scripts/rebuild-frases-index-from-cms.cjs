/**
 * Regenera public/frases-index.json a partir de frases-cms.json (fallback Windows lock).
 */
const fs = require('fs');
const path = require('path');

function sleepMs(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {}
}

function atomicWriteJson(filePath, data, retries = 12) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const body = JSON.stringify(data);
  const tmp = path.join(dir, `._tmp_${path.basename(filePath)}_${process.pid}`);
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      fs.writeFileSync(tmp, body, 'utf8');
      if (fs.existsSync(filePath)) {
        try {
          fs.renameSync(tmp, filePath);
        } catch {
          fs.copyFileSync(tmp, filePath);
          try {
            fs.unlinkSync(tmp);
          } catch {}
        }
      } else {
        fs.renameSync(tmp, filePath);
      }
      return;
    } catch (e) {
      try {
        if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
      } catch {}
      if (attempt === retries - 1) throw e;
      sleepMs(400 * (attempt + 1));
    }
  }
}

const cmsPath = path.join(__dirname, '..', 'public', 'frases-cms.json');
const indexPath = path.join(__dirname, '..', 'public', 'frases-index.json');

if (!fs.existsSync(cmsPath)) {
  console.error('frases-cms.json não encontrado.');
  process.exit(1);
}

console.log('Carregando frases-cms.json...');
const cms = JSON.parse(fs.readFileSync(cmsPath, 'utf8'));
const index = cms.map((f) => ({
  id: f.id,
  slug: f.slug,
  tipo: 'frase',
  texto: f.frase_original,
  autor: f.autor_original,
  tags: f.palavras_chave?.length ? f.palavras_chave : [f.categoria, ...(f.contextos || [])],
}));

console.log(`Gravando frases-index.json (${index.length} entradas)...`);
atomicWriteJson(indexPath, index);
console.log('✅ frases-index.json atualizado.');
