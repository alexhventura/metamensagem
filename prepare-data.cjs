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

const INPUT_METAFORAS = path.join(__dirname, 'public', 'metaforas.json');
const INPUT_FRASES = path.join(__dirname, 'public', 'frases.json');
const OUTPUT_DIR = path.join(__dirname, 'public', 'metaforas');
const INDEX_METAFORAS_FILE = path.join(__dirname, 'public', 'metaforas-index.json');
const INDEX_FRASES_FILE = path.join(__dirname, 'public', 'frases-index.json');
const ENRICHED_CACHE_FILE = path.join(__dirname, 'public', 'frases-enriched-cache.json');
const TAGS_FILE = path.join(__dirname, 'public', 'metaforas-tags.json');
const AUTORES_FILE = path.join(__dirname, 'public', 'metaforas-autores.json');

function safeText(value) {
    if (value == null) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' || typeof value === 'boolean') return String(value).trim();
    return '';
}

function safeTags(value) {
    if (!Array.isArray(value)) return [];
    return value.map(safeText).filter(Boolean);
}

function sanitizeId(id) {
    const raw = safeText(id) || 'unknown';
    return raw.toLowerCase().replace(/[^a-z0-9_\-]/g, '').substring(0, 50);
}

function normalizeFraseIndex(f) {
    if (!f || typeof f !== 'object') return null;
    const texto = safeText(f.texto ?? f.text ?? f.quote ?? f.content);
    if (!texto) return null;
    const tags = safeTags(f.tags);
    return {
        id: sanitizeId(f.id || `f_${texto.slice(0, 24)}`),
        tipo: 'frase',
        texto,
        autor: safeText(f.autor ?? f.author) || 'Anônimo',
        tags: tags.length ? tags : ['Inspiracional', 'Reflexao'],
    };
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
        indexMetaforas.push({
            id: safeId,
            tipo: 'metafora',
            titulo: m.titulo || 'Sem Título',
            autor: m.autor || 'Anônimo',
            tags: m.tags || [],
            resumo: m.resumo || (m.texto ? m.texto.substring(0, 150).trim() + '...' : '')
        });
        safeTags(m.tags).forEach((t) => {
            tagMap[t] = (tagMap[t] || 0) + 1;
        });
        const autor = m.autor || 'Anônimo';
        authorMap[autor] = (authorMap[autor] || 0) + 1;
    }

    fs.writeFileSync(INDEX_METAFORAS_FILE, JSON.stringify(indexMetaforas));
    fs.writeFileSync(TAGS_FILE, JSON.stringify(Object.fromEntries(Object.entries(tagMap).sort((a,b) => b[1] - a[1]))));
    fs.writeFileSync(AUTORES_FILE, JSON.stringify(Object.entries(authorMap).map(([autor, quantidade]) => ({ autor, quantidade })).sort((a, b) => b.quantidade - a.quantidade)));
    
    if (fs.existsSync(INPUT_FRASES)) {
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
        fs.writeFileSync(INDEX_FRASES_FILE, JSON.stringify(merged));
        console.log(`✅ frases-index.json — ${merged.length} frases (${frases.length} locais + enriquecidas, deduplicadas).`);
    }
    console.log('✅ Metadata e índices gerados.');

    // 3. Fragmentação em Chunks (Para evitar I/O blocking massivo)
    const CHUNK_SIZE = 200;
    for (let i = 0; i < metaforas.length; i += CHUNK_SIZE) {
        const chunk = metaforas.slice(i, i + CHUNK_SIZE);
        chunk.forEach(m => {
            const filePath = path.join(OUTPUT_DIR, `${m.id}.json`);
            fs.writeFileSync(filePath, JSON.stringify(m));
        });
        console.log(`📦 Processados ${Math.min(i + CHUNK_SIZE, metaforas.length)} / ${metaforas.length}`);
    }

    console.log('✨ Fim do processamento.');
}

run();
