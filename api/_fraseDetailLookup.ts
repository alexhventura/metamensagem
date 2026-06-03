/** Lookup de frase por slug — dentro de api/ para o bundle Vercel (sem lib/ nem fs). */
import { shardForSlug, slugifyFraseTexto, type FraseDetailRecord } from './_shared.js';

export type { FraseDetailRecord };

export function fraseTextoOf(row: FraseDetailRecord & { texto?: string }): string {
  return (row.frase_original || row.texto || '').trim();
}

export function fraseAutorOf(row: FraseDetailRecord & { autor?: string }): string {
  return (row.autor_original || row.autor || 'Anônimo').trim();
}

export function normalizeFraseDetailRecord(
  raw: FraseDetailRecord & { texto?: string; autor?: string }
): FraseDetailRecord {
  const frase_original = fraseTextoOf(raw);
  const autor_original = fraseAutorOf(raw);
  const sem = raw.semantica as
    | {
        categoriaPrincipal?: string;
        contextos?: string[];
        palavrasChave?: string[];
      }
    | undefined;

  return {
    ...raw,
    slug: String(raw.slug ?? '').toLowerCase(),
    frase_original,
    autor_original,
    categoria: raw.categoria || sem?.categoriaPrincipal || 'reflexao',
    contextos: raw.contextos ?? sem?.contextos ?? [],
    palavras_chave: raw.palavras_chave ?? sem?.palavrasChave ?? [],
    explicacao: raw.explicacao ?? '',
    ano_ou_data: raw.ano_ou_data ?? null,
    fontes: raw.fontes ?? null,
    observacao: raw.observacao ?? null,
    autor_tipo: raw.autor_tipo ?? null,
    nacionalidade: raw.nacionalidade ?? null,
    nascimento_falecimento: raw.nascimento_falecimento ?? null,
  };
}

type IndexRow = { id: string; slug: string };

export function pickBestSlugMatch<T extends { slug: string }>(
  rows: T[],
  key: string
): T | null {
  if (!rows.length || !key) return null;
  const k = key.toLowerCase().trim();

  const exact = rows.find((r) => String(r.slug ?? '').toLowerCase() === k);
  if (exact) return exact;

  const slugStartsWithKey = rows.find((r) => String(r.slug ?? '').toLowerCase().startsWith(k));
  if (slugStartsWithKey) return slugStartsWithKey;

  const keyStartsWithSlug = rows.find((r) => k.startsWith(String(r.slug ?? '').toLowerCase()));
  if (keyStartsWithSlug) return keyStartsWithSlug;

  let best: T | null = null;
  let bestCommon = 0;
  for (const r of rows) {
    const s = String(r.slug ?? '').toLowerCase();
    if (!s) continue;
    let common = 0;
    const limit = Math.min(k.length, s.length);
    while (common < limit && k[common] === s[common]) common += 1;
    const minLen = Math.min(k.length, s.length);
    if (common > bestCommon && common >= Math.max(20, minLen - 8)) {
      bestCommon = common;
      best = r;
    }
  }
  return best;
}

function matchSlugInIndexRows(rows: IndexRow[], key: string): string | null {
  return pickBestSlugMatch(rows, key)?.slug ?? null;
}

export async function resolveCanonicalSlugFromIndex(
  requested: string,
  fetchJson: (url: string) => Promise<unknown>
): Promise<string | null> {
  const key = requested.toLowerCase().trim();
  if (!key) return null;

  for (const shardId of shardsToProbe(key)) {
    try {
      const rows = (await fetchJson(`/frases-v2/index/shard-${shardId}.json`)) as IndexRow[];
      if (!Array.isArray(rows)) continue;
      const hit = matchSlugInIndexRows(rows, key);
      if (hit) return hit;
    } catch {
      /* próximo shard */
    }
  }

  if (key.startsWith('f_') || key.startsWith('f_csv_')) {
    try {
      const map = (await fetchJson('/frases-v2/id-index.json')) as Record<string, string>;
      if (map[key]) return map[key].toLowerCase();
    } catch {
      /* ignore */
    }
  }

  return null;
}

export function findFraseInList(
  list: (FraseDetailRecord & { texto?: string; autor?: string })[],
  requested: string
): FraseDetailRecord | null {
  const key = requested.toLowerCase().trim();
  if (!key) return null;

  const exact = list.find((f) => String(f.slug ?? '').toLowerCase() === key);
  if (exact) return normalizeFraseDetailRecord(exact);

  const prefix = list.find((f) => {
    const s = String(f.slug ?? '').toLowerCase();
    return key.startsWith(s) || s.startsWith(key);
  });
  if (prefix) return normalizeFraseDetailRecord(prefix);

  const pseudoFromUrl = slugifyFraseTexto(key.replace(/-/g, ' '));
  const byPseudo = list.find((f) => String(f.slug ?? '').toLowerCase() === pseudoFromUrl);
  if (byPseudo) return normalizeFraseDetailRecord(byPseudo);

  const byCanonicalText = list.find((f) => slugifyFraseTexto(fraseTextoOf(f)) === key);
  if (byCanonicalText) return normalizeFraseDetailRecord(byCanonicalText);

  const byCanonicalMatch = list.find((f) => {
    const canonical = slugifyFraseTexto(fraseTextoOf(f));
    return key.startsWith(canonical) || canonical === pseudoFromUrl;
  });
  return byCanonicalMatch ? normalizeFraseDetailRecord(byCanonicalMatch) : null;
}

export function shardsToProbe(requested: string): string[] {
  const key = requested.toLowerCase();
  const ids = new Set<string>([shardForSlug(key)]);
  const pseudo = slugifyFraseTexto(key.replace(/-/g, ' '));
  ids.add(shardForSlug(pseudo));
  if (key.length > 80) {
    ids.add(shardForSlug(key.slice(0, 80)));
  }
  return [...ids];
}
