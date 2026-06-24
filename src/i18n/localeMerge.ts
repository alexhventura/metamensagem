/** Mescla traduções parciais sobre o bundle inglês (fallback i18next). */
export function mergeWithEnglish(
  en: Record<string, unknown>,
  partial: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...en };
  for (const key of Object.keys(partial)) {
    const baseVal = en[key];
    const partialVal = partial[key];
    if (
      partialVal &&
      typeof partialVal === 'object' &&
      !Array.isArray(partialVal) &&
      baseVal &&
      typeof baseVal === 'object' &&
      !Array.isArray(baseVal)
    ) {
      out[key] = mergeWithEnglish(
        baseVal as Record<string, unknown>,
        partialVal as Record<string, unknown>
      );
    } else if (partialVal !== undefined) {
      out[key] = partialVal;
    }
  }
  return out;
}
