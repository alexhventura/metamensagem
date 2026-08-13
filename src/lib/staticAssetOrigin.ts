/**
 * Origem opcional para assets estáticos pesados (ex.: shards detail 1.2GB).
 * Quando definido, o deploy da app não precisa reenviar esses arquivos.
 *
 * Vercel: FRASES_STATIC_ORIGIN + VITE_FRASES_STATIC_ORIGIN (mesmo valor).
 * Ex.: URL de deploy estável que contém /frases-v2/detail/
 */
export function staticAssetOrigin(): string {
  const raw =
    typeof import.meta !== 'undefined'
      ? (import.meta.env.VITE_FRASES_STATIC_ORIGIN as string | undefined)
      : undefined;
  return raw?.trim().replace(/\/$/, '') ?? '';
}

export function staticAssetUrl(path: string): string {
  const origin = staticAssetOrigin();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return origin ? `${origin}${normalized}` : normalized;
}
