/**
 * Monitor de disponibilidade da API de tradução em tempo real (MyMemory).
 * Ativa modo de contingência sem expor erros técnicos ao usuário.
 */

const COOLDOWN_KEY = 'mm-translation-api-cooldown-until';
const REASON_KEY = 'mm-translation-api-last-reason';

/** Padrão: 6h de contingência após cota/429 (renova ao sucesso). */
const DEFAULT_COOLDOWN_MS = 6 * 60 * 60 * 1000;

const QUOTA_PATTERNS =
  /429|cota|quota|quotaFinished|Limite da API|esgotad|rate.?limit|MYMEMORY\s+WARNING|QUOTA\s+FINISHED|Tempo esgotado/i;

export function isQuotaOrAvailabilityError(err: unknown): boolean {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : '';
  if (!msg) return false;
  return QUOTA_PATTERNS.test(msg);
}

export function isLiveTranslationEnabled(): boolean {
  if (typeof sessionStorage === 'undefined') return true;
  try {
    const until = sessionStorage.getItem(COOLDOWN_KEY);
    if (!until) return true;
    if (Date.now() >= Number(until)) {
      sessionStorage.removeItem(COOLDOWN_KEY);
      sessionStorage.removeItem(REASON_KEY);
      return true;
    }
    return false;
  } catch {
    return true;
  }
}

export function markTranslationApiUnavailable(
  reason: string,
  cooldownMs: number = DEFAULT_COOLDOWN_MS
): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(COOLDOWN_KEY, String(Date.now() + cooldownMs));
    sessionStorage.setItem(REASON_KEY, reason.slice(0, 120));
  } catch {
    /* ignore */
  }
}

export function clearTranslationApiCooldown(): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(COOLDOWN_KEY);
    sessionStorage.removeItem(REASON_KEY);
  } catch {
    /* ignore */
  }
}

export function getTranslationApiCooldownReason(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    return sessionStorage.getItem(REASON_KEY);
  } catch {
    return null;
  }
}
