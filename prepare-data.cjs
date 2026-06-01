/**
 * Gera índices leves para o site (frases-index.json, metaforas-index.json, chunks).
 *
 * CONTADORES E LISTAGENS NA UI
 * As páginas /frases e /metaforas leem esses índices. O total exibido abaixo do título
 * (ex.: "416 frases disponíveis") atualiza automaticamente após regenerar os índices.
 *
 * FLUXO AO ADICIONAR CONTEÚDO
 * 1. Inclua a frase em public/frases.json OU a metáfora em public/metaforas.json
 * 2. Rode: npm run build   (ou: node prepare-data.cjs)
 * 3. Faça deploy — na próxima visita o site e os contadores refletem o novo total
 *
 * Frases enriquecidas (cache externo) são fundidas aqui a partir de frases-enriched-cache.json
 * (gerado por scripts/enrich-external-content.mjs no build).
 */

const fs = require('fs');
const path = require('path');

function sleepMs(ms) {
    const end = Date.now() + ms;
    while (Date.now() < end) { /* sync wait for Windows locks */ }
}

function atomicWriteJson(filePath, data, retries = 8) {
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
                    try { fs.unlinkSync(tmp); } catch { /* ignore */ }
                }
            } else {
                fs.renameSync(tmp, filePath);
            }
            return;
        } catch (e) {
            try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch { /* ignore */ }
            if (attempt === retries - 1) throw e;
            sleepMs(200 * (attempt + 1));
        }
    }
}

const INPUT_METAFORAS = path.join(__dirname, 'public', 'metaforas.json');
const INPUT_FRASES = path.join(__dirname, 'public', 'frases.json');
const OUTPUT_DIR = path.join(__dirname, 'public', 'metaforas');
const INDEX_METAFORAS_FILE = path.join(__dirname, 'public', 'metaforas-index.json');
const INDEX_FRASES_FILE = path.join(__dirname, 'public', 'frases-index.json');
const ENRICHED_CACHE_FILE = path.join(__dirname, 'public', 'frases-enriched-cache.json');
const CONTENT_FRASES_FILE = path.join(__dirname, 'content', 'frases', 'frases.json');
const CMS_FRASES_FILE = path.join(__dirname, 'public', 'frases-cms.json');
const TAGS_FILE = path.join(__dirname, 'public', 'metaforas-tags.json');
const AUTORES_FILE = path.join(__dirname, 'public', 'metaforas-autores.json');

const INVISIBLE_CHARS =
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180B-\u180E\u2000-\u200F\u2028-\u202F\u205F-\u206F\u3164\uFEFF\uFFA0\uFFF9-\uFFFB]/g;

function safeText(value) {
    if (value == null) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' || typeof value === 'boolean') return String(value).trim();
    return '';
}

function sanitizeContentText(value) {
    let t = safeText(value);
    if (!t) return '';
    t = t.normalize('NFC').replace(INVISIBLE_CHARS, '');
    t = t.replace(/[\u2018\u2019\u201A\u201B\u2032\u2035`´]/g, "'");
    t = t.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036\u00AB\u00BB]/g, '"');
    t = t.replace(/\u00A0/g, ' ');
    t = t.replace(/^[\s"'«»]+|[\s"'«»]+$/g, '').replace(/\s+/g, ' ').trim();
    return t;
}

function safeTags(value) {
    if (!Array.isArray(value)) return [];
    return value.map(safeText).filter(Boolean);
}

function sanitizeId(id) {
    const raw = safeText(id) || 'unknown';
    return raw.toLowerCase().replace(/[^a-z0-9_\-]/g, '').substring(0, 50);
}

function extractAnoOuData(f) {
    for (const k of ['ano_ou_data', 'a frase foi dita em', 'a_frase_foi_dita_em']) {
        const v = f[k];
        if (v != null && String(v).trim()) return String(v).trim();
    }
    return null;
}

function slugifyText(text) {
    return sanitizeContentText(text)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '')
        .slice(0, 80);
}

function normalizeFraseIndex(f) {
    if (!f || typeof f !== 'object') return null;
    const texto = sanitizeContentText(f.frase_original ?? f.texto ?? f.text ?? f.quote ?? f.content);
    if (!texto) return null;
    const tags = safeTags(f.palavras_chave ?? f.tags);
    const slug = sanitizeContentText(f.slug) || slugifyText(texto.slice(0, 80)) || sanitizeId(f.id);
    return {
        id: sanitizeId(f.id || `f_${slug}`),
        slug,
        tipo: 'frase',
        texto,
        autor: safeText(f.autor_original ?? f.autor ?? f.author) || 'Anônimo',
        tags: tags.length ? tags : ['Inspiracional', 'Reflexao'],
    };
}

function buildCmsFromContent() {
    if (!fs.existsSync(CONTENT_FRASES_FILE)) return null;
    const raw = JSON.parse(fs.readFileSync(CONTENT_FRASES_FILE, 'utf8'));
    const today = new Date().toISOString().slice(0, 10);
    return raw.map((f) => {
        const frase_original = sanitizeContentText(f.frase_original ?? f.texto);
        const autor_original = safeText(f.autor_original ?? f.autor)?.split('\n')[0]?.trim() || 'Anônimo';
        const slug = sanitizeContentText(f.slug) || slugifyText(frase_original);
        return {
            id: sanitizeId(f.id || `f_${slug}`),
            slug,
            frase_original,
            autor_original,
            autor_slug: slugifyText(autor_original),
            categoria: slugifyText(f.categoria || 'inspiracional'),
            contextos: (f.contextos || []).map((c) => slugifyText(String(c))).filter(Boolean),
            ano_ou_data: extractAnoOuData(f),
            explicacao: sanitizeContentText(f.explicacao) || '',
            fontes: f.fontes ? String(f.fontes).trim() : null,
            observacao: f.observacao ? String(f.observacao).trim() : null,
            palavras_chave: safeTags(f.palavras_chave ?? f.tags),
            autor_tipo: f.autor_tipo ? String(f.autor_tipo).trim() : null,
            nacionalidade: f.nacionalidade ? String(f.nacionalidade).trim() : null,
            nascimento_falecimento: f.nascimento_falecimento ? String(f.nascimento_falecimento).trim() : null,
            informacoes: f.informacoes || { ultima_atualizacao: today, confiabilidade: null },
        };
    }).filter((f) => f.frase_original);
}

async function run() {
    console.log('🚀 Iniciando processamento modular...');

    if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    // 1. Carregar Dados
    const metaforas = JSON.parse(fs.readFileSync(INPUT_METAFORAS, 'utf8'));
    console.log(`📋 Total: ${metaforas.length} metáforas.`);

    // 2. Gerar Índices e Metadata (Rápido)
    const indexMetaforas = [];
    const tagMap = {};
    const authorMap = {};

    for (const m of metaforas) {
        const safeId = sanitizeId(m.id);
        m.id = safeId;
        const mTitulo = sanitizeContentText(m.titulo) || 'Sem Título';
        const mTexto = sanitizeContentText(m.texto);
        const mResumo = sanitizeContentText(m.resumo) || (mTexto ? mTexto.substring(0, 150).trim() + '...' : '');
        m.titulo = mTitulo;
        m.texto = mTexto;
        m.resumo = mResumo;
        indexMetaforas.push({
            id: safeId,
            tipo: 'metafora',
            titulo: mTitulo,
            autor: m.autor || 'Anônimo',
            tags: m.tags || [],
            resumo: mResumo,
        });
        safeTags(m.tags).forEach((t) => {
            tagMap[t] = (tagMap[t] || 0) + 1;
        });
        const autor = m.autor || 'Anônimo';
        authorMap[autor] = (authorMap[autor] || 0) + 1;
    }

    atomicWriteJson(INDEX_METAFORAS_FILE, indexMetaforas);
    atomicWriteJson(TAGS_FILE, Object.fromEntries(Object.entries(tagMap).sort((a,b) => b[1] - a[1])));
    atomicWriteJson(AUTORES_FILE, Object.entries(authorMap).map(([autor, quantidade]) => ({ autor, quantidade })).sort((a, b) => b.quantidade - a.quantidade));
    
    const cmsFromContent = buildCmsFromContent();
    if (cmsFromContent?.length) {
        atomicWriteJson(CMS_FRASES_FILE, cmsFromContent);
        const indexFromCms = cmsFromContent.map((f) => ({
            id: f.id,
            slug: f.slug,
            tipo: 'frase',
            texto: f.frase_original,
            autor: f.autor_original,
            tags: f.palavras_chave?.length ? f.palavras_chave : [f.categoria, ...f.contextos],
        }));
        atomicWriteJson(INDEX_FRASES_FILE, indexFromCms);
        console.log(`✅ frases-cms.json + frases-index.json — ${cmsFromContent.length} frases (content/).`);
    } else if (fs.existsSync(INPUT_FRASES)) {
        const frases = JSON.parse(fs.readFileSync(INPUT_FRASES, 'utf8'));
        let enriched = [];
        if (fs.existsSync(ENRICHED_CACHE_FILE)) {
            try {
                const cache = JSON.parse(fs.readFileSync(ENRICHED_CACHE_FILE, 'utf8'));
                enriched = Array.isArray(cache.items) ? cache.items : [];
                console.log(`📚 Acervo enriquecido: +${enriched.length} frases (cache).`);
            } catch (e) {
                console.warn('⚠ Cache enriquecido inválido:', e.message);
            }
        }
        const textoKeys = new Set();
        const merged = [];
        for (const f of [...frases, ...enriched]) {
            const normalized = normalizeFraseIndex(f);
            if (!normalized) continue;
            const key = normalized.texto.toLowerCase().slice(0, 100);
            if (!key || textoKeys.has(key)) continue;
            textoKeys.add(key);
            merged.push(normalized);
        }
        atomicWriteJson(INDEX_FRASES_FILE, merged);
        console.log(`✅ frases-index.json — ${merged.length} frases (${frases.length} locais + enriquecidas, deduplicadas).`);
    }
    console.log('✅ Metadata e índices gerados.');

    // 3. Fragmentação em Chunks (Para evitar I/O blocking massivo)
    const CHUNK_SIZE = 200;
    for (let i = 0; i < metaforas.length; i += CHUNK_SIZE) {
        const chunk = metaforas.slice(i, i + CHUNK_SIZE);
        chunk.forEach(m => {
            const filePath = path.join(OUTPUT_DIR, `${m.id}.json`);
            atomicWriteJson(filePath, m);
        });
        console.log(`📦 Processados ${Math.min(i + CHUNK_SIZE, metaforas.length)} / ${metaforas.length}`);
    }

    try {
        const { generateHomeBootstrap } = await import('./scripts/generate-home-bootstrap.mjs');
        generateHomeBootstrap();
    } catch (e) {
        console.warn('⚠ home-bootstrap:', e.message);
    }

    console.log('✨ Fim do processamento.');
}

run();
