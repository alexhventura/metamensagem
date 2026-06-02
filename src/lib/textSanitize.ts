/**
 * Sanitização de texto para tradução, índices e APIs externas.
 * Remove Unicode invisível, normaliza aspas e garante UTF-8 serializável.
 */

/** Zero-width, BOM, word joiner, formatadores bidirecionais, etc. */
const INVISIBLE_CHARS =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180B-\u180E\u2000-\u200F\u2028-\u202F\u205F-\u206F\u3164\uFEFF\uFFA0\uFFF9-\uFFFB]/g;

const CURLY_SINGLE = /[\u2018\u2019\u201A\u201B\u2032\u2035`´‛‚]/g;
const CURLY_DOUBLE = /[\u201C\u201D\u201E\u201F\u2033\u2036\u00AB\u00BB\u2039\u203A]/g;

/** Reparos comuns de double-encoding UTF-8 → Windows-1252. */
const MOJIBAKE_REPAIRS: [RegExp, string][] = [
  [/Â©/g, '©'],
  [/â€"/g, '—'],
  [/â€"/g, '–'],
  [/â€™/g, "'"],
  [/â€œ/g, '"'],
  [/â€\u009d/g, '"'],
  [/Ã§/g, 'ç'],
  [/Ã£/g, 'ã'],
  [/Ã¡/g, 'á'],
  [/Ã©/g, 'é'],
  [/Ã­/g, 'í'],
  [/Ã³/g, 'ó'],
  [/Ãº/g, 'ú'],
  [/Ãµ/g, 'õ'],
  [/Ãª/g, 'ê'],
  [/Ã´/g, 'ô'],
  [/Ã /g, 'à'],
];

export function repairUtf8Mojibake(text: string): string {
  let t = text;
  for (const [re, rep] of MOJIBAKE_REPAIRS) {
    t = t.replace(re, rep);
  }
  return t;
}

function coerceString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

/** Remove aspas decorativas só nas extremidades (preserva aspas internas). */
export function stripOuterQuotes(text: string): string {
  let t = text.trim();
  for (let i = 0; i < 3; i++) {
    const next = t.replace(/^[\s"'«»„“”‘’‹›]+/, '').replace(/[\s"'«»„“”‘’‹›]+$/, '').trim();
    if (next === t) break;
    t = next;
  }
  return t;
}

/**
 * Limpeza completa antes de traduzir ou indexar.
 * Pipeline: coerce → NFC → invisíveis → aspas → espaços → trim extremos.
 */
export function sanitizeTextForTranslation(text: unknown): string {
  let t = coerceString(text);
  if (!t) return '';

  t = t.normalize('NFC');
  t = repairUtf8Mojibake(t);
  t = t.replace(INVISIBLE_CHARS, '');
  t = t.replace(CURLY_SINGLE, "'");
  t = t.replace(CURLY_DOUBLE, '"');
  t = t.replace(/\u00A0/g, ' ');
  t = t.replace(/[\u2022\u2023\u2043\u2219]/g, '-');
  t = stripOuterQuotes(t);
  t = t.replace(/\s+/g, ' ').trim();

  return t;
}

/** Texto pronto para query string / JSON (já sanitizado). */
export function textForTranslationApi(text: unknown): string {
  return sanitizeTextForTranslation(text);
}
