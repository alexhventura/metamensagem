let totalFrasesCache: number | null = null;

export interface FrasesManifest {
  totalFrases?: number;
}

/** Total do acervo (manifest) — não confundir com itens carregados no feed/bootstrap. */
export async function fetchTotalFrasesCount(): Promise<number> {
  if (totalFrasesCache != null) return totalFrasesCache;
  try {
    const res = await fetch('/frases-v2/manifest.json', { cache: 'default' });
    if (!res.ok) return 0;
    const data = (await res.json()) as FrasesManifest;
    const n = typeof data.totalFrases === 'number' ? data.totalFrases : 0;
    totalFrasesCache = n;
    return n;
  } catch {
    return 0;
  }
}
