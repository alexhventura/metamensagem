/**
 * Persistência em content/frases/{autor-slug}.json + frases.json mestre.
 */

import fs from 'fs';
import path from 'path';
import type { FraseCanonical } from './canonical';
import { slugifyAutor } from '../slugify';

const CONTENT_FRASES = path.join(process.cwd(), 'content', 'frases');
const MASTER_FILE = path.join(CONTENT_FRASES, 'frases.json');

function sleepMs(ms: number): void {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    /* sync wait for Windows file locks */
  }
}

export function atomicWriteJson(filePath: string, data: unknown, retries = 6): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const body = JSON.stringify(data, null, 2) + '\n';
  const tmp = path.join(dir, `._tmp_${path.basename(filePath)}_${process.pid}`);
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      fs.writeFileSync(tmp, body, 'utf8');
      if (fs.existsSync(filePath)) {
        try {
          fs.renameSync(tmp, filePath);
        } catch {
          fs.copyFileSync(tmp, filePath);
          fs.unlinkSync(tmp);
        }
      } else {
        fs.renameSync(tmp, filePath);
      }
      return;
    } catch (e) {
      try {
        if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
      } catch {
        /* ignore */
      }
      if (attempt === retries - 1) throw e;
      sleepMs(200 * (attempt + 1));
    }
  }
}

export function loadExistingSlugsAndTexts(): {
  slugs: Set<string>;
  textKeys: Set<string>;
} {
  const slugs = new Set<string>();
  const textKeys = new Set<string>();

  if (!fs.existsSync(CONTENT_FRASES)) return { slugs, textKeys };

  for (const name of fs.readdirSync(CONTENT_FRASES)) {
    if (!name.endsWith('.json')) continue;
    try {
      const arr = JSON.parse(fs.readFileSync(path.join(CONTENT_FRASES, name), 'utf8')) as FraseCanonical[];
      if (!Array.isArray(arr)) continue;
      for (const f of arr) {
        if (f.slug) slugs.add(f.slug);
        const key = (f.frase_original || '').toLowerCase().slice(0, 100);
        if (key) textKeys.add(key);
      }
    } catch {
      /* ignore */
    }
  }
  return { slugs, textKeys };
}

export function filterNotInAcervo(
  frases: FraseCanonical[],
  existing: { slugs: Set<string>; textKeys: Set<string> }
): FraseCanonical[] {
  return frases.filter((f) => {
    const key = f.frase_original.toLowerCase().slice(0, 100);
    if (existing.textKeys.has(key)) return false;
    if (existing.slugs.has(f.slug)) return false;
    return true;
  });
}

export interface PersistResult {
  authorsUpdated: number;
  frasesAdded: number;
  masterTotal: number;
  files: { autorSlug: string; count: number }[];
}

export function persistFrasesByAuthor(frases: FraseCanonical[]): PersistResult {
  fs.mkdirSync(CONTENT_FRASES, { recursive: true });

  const byAuthor = new Map<string, Map<string, FraseCanonical>>();

  for (const name of fs.readdirSync(CONTENT_FRASES)) {
    if (!name.endsWith('.json') || name === 'frases.json') continue;
    const autorSlug = name.replace(/\.json$/, '');
    const arr = JSON.parse(fs.readFileSync(path.join(CONTENT_FRASES, name), 'utf8')) as FraseCanonical[];
    const map = new Map<string, FraseCanonical>();
    if (Array.isArray(arr)) {
      for (const f of arr) {
        if (f?.id) map.set(f.id, f);
      }
    }
    byAuthor.set(autorSlug, map);
  }

  let added = 0;
  for (const frase of frases) {
    const autorSlug = slugifyAutor(frase.autor_original);
    if (!byAuthor.has(autorSlug)) byAuthor.set(autorSlug, new Map());
    const map = byAuthor.get(autorSlug)!;
    if (!map.has(frase.id)) {
      added++;
      map.set(frase.id, frase);
    }
  }

  const files: { autorSlug: string; count: number }[] = [];
  for (const [autorSlug, map] of byAuthor.entries()) {
    const list = [...map.values()].sort((a, b) => a.id.localeCompare(b.id));
    const filePath = path.join(CONTENT_FRASES, `${autorSlug}.json`);
    atomicWriteJson(filePath, list);
    files.push({ autorSlug, count: list.length });
  }

  const master = [...byAuthor.values()]
    .flatMap((m) => [...m.values()])
    .sort((a, b) => a.id.localeCompare(b.id));
  atomicWriteJson(MASTER_FILE, master);

  return {
    authorsUpdated: files.length,
    frasesAdded: added,
    masterTotal: master.length,
    files: files.filter((f) => frases.some((x) => slugifyAutor(x.autor_original) === f.autorSlug)),
  };
}

/** Grava só os autores do lote (rápido; mestre no rebuild final). */
export function persistFrasesIncremental(
  frases: FraseCanonical[],
  options: { updateMaster?: boolean } = {}
): PersistResult {
  fs.mkdirSync(CONTENT_FRASES, { recursive: true });
  let added = 0;
  const touched = new Map<string, FraseCanonical[]>();

  for (const frase of frases) {
    const autorSlug = slugifyAutor(frase.autor_original);
    if (!touched.has(autorSlug)) touched.set(autorSlug, []);
    touched.get(autorSlug)!.push(frase);
  }

  const files: { autorSlug: string; count: number }[] = [];
  for (const [autorSlug, batch] of touched) {
    const filePath = path.join(CONTENT_FRASES, `${autorSlug}.json`);
    const map = new Map<string, FraseCanonical>();
    if (fs.existsSync(filePath)) {
      try {
        const arr = JSON.parse(fs.readFileSync(filePath, 'utf8')) as FraseCanonical[];
        if (Array.isArray(arr)) {
          for (const f of arr) {
            if (f?.id) map.set(f.id, f);
          }
        }
      } catch {
        /* arquivo novo */
      }
    }
    for (const f of batch) {
      if (!map.has(f.id)) added++;
      map.set(f.id, f);
    }
    const list = [...map.values()].sort((a, b) => a.id.localeCompare(b.id));
    atomicWriteJson(filePath, list);
    files.push({ autorSlug, count: list.length });
  }

  let masterTotal = 0;
  if (options.updateMaster) {
    const full = persistFrasesByAuthor([]);
    masterTotal = full.masterTotal;
  } else if (fs.existsSync(MASTER_FILE)) {
    try {
      const m = JSON.parse(fs.readFileSync(MASTER_FILE, 'utf8')) as FraseCanonical[];
      masterTotal = (Array.isArray(m) ? m.length : 0) + added;
    } catch {
      masterTotal = added;
    }
  } else {
    masterTotal = added;
  }

  return {
    authorsUpdated: files.length,
    frasesAdded: added,
    masterTotal,
    files,
  };
}
