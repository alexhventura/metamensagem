/**
 * Fila de tradução Supabase removida (CDN-only). Mantém API estável para callers legados.
 */

export function scheduleTranslationDemandSync(): void {
  /* no-op */
}

export async function flushTranslationDemandSync(): Promise<boolean> {
  return false;
}
