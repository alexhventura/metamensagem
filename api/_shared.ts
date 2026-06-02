/** Utilitários compartilhados das rotas /api (dentro de api/ para o bundle Vercel). */

type ApiRequest = {
  url?: string;
  headers?: Headers | Record<string, string | string[] | undefined>;
};

function headerValue(
  headers: ApiRequest['headers'],
  name: string
): string | null {
  if (!headers) return null;
  if (typeof (headers as Headers).get === 'function') {
    return (headers as Headers).get(name);
  }
  const record = headers as Record<string, string | string[] | undefined>;
  const raw = record[name] ?? record[name.toLowerCase()];
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw ?? null;
}

/** Web Request ou IncomingMessage do runtime Node da Vercel. */
export function requestUrl(req: ApiRequest): URL {
  const raw = req.url ?? '/';
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return new URL(raw);
  }
  const host =
    headerValue(req.headers, 'x-forwarded-host') ??
    headerValue(req.headers, 'host') ??
    'metamensagem.com';
  const proto = headerValue(req.headers, 'x-forwarded-proto') ?? 'https';
  return new URL(raw, `${proto}://${host}`);
}

export function shardForSlug(slug: string): string {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return (h % 256).toString(16).padStart(2, '0');
}

const FRASE_SLUG_TEXT_MAX = 80;

export function normalizarParaSlug(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export function slugifyFraseTexto(texto: string): string {
  const slice = texto.trim().slice(0, FRASE_SLUG_TEXT_MAX);
  return normalizarParaSlug(slice) || 'frase';
}

export type FraseDetailRecord = {
  id: string;
  slug: string;
  frase_original: string;
  autor_original: string;
  autor_slug?: string;
  categoria: string;
  contextos: string[];
  explicacao: string;
  palavras_chave: string[];
  ano_ou_data: string | null;
  fontes: string | null;
  observacao: string | null;
  autor_tipo: string | null;
  nacionalidade: string | null;
  nascimento_falecimento: string | null;
  informacoes?: Record<string, unknown>;
  semantica?: Record<string, unknown>;
  seo?: Record<string, unknown>;
};

export function findFraseInList(
  list: FraseDetailRecord[],
  requested: string
): FraseDetailRecord | null {
  const key = requested.toLowerCase().trim();
  if (!key) return null;

  const exact = list.find((f) => f.slug.toLowerCase() === key);
  if (exact) return exact;

  const prefix = list.find(
    (f) =>
      key.startsWith(f.slug.toLowerCase()) ||
      f.slug.toLowerCase().startsWith(key.slice(0, Math.min(key.length, f.slug.length)))
  );
  if (prefix) return prefix;

  const pseudoFromUrl = slugifyFraseTexto(key.replace(/-/g, ' '));
  const byPseudo = list.find((f) => f.slug.toLowerCase() === pseudoFromUrl);
  if (byPseudo) return byPseudo;

  const byCanonicalText = list.find((f) => slugifyFraseTexto(f.frase_original) === key);
  if (byCanonicalText) return byCanonicalText;

  const byCanonicalMatch = list.find((f) => {
    const canonical = slugifyFraseTexto(f.frase_original);
    return key.startsWith(canonical) || canonical === pseudoFromUrl;
  });
  return byCanonicalMatch ?? null;
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

const SEO_LOCALES = new Set(['pt', 'en', 'es', 'fr', 'de', 'it', 'ja', 'hi']);

export function isSeoLocale(locale: string): boolean {
  return SEO_LOCALES.has(locale);
}
