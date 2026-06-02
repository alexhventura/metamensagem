import { sanitizeTextForTranslation } from './textSanitize';

const YEAR_TAG = /^(19|20)\d{2}$/;
const NUMERIC_ONLY = /^\d+$/;
const SLUG_LIKE = /^[a-z0-9]+(?:-[a-z0-9]+){1,}$/;

/** Slugs compostos → rótulo curto em português quando possível. */
const SLUG_LABEL_PT: Record<string, string> = {
  amor: 'amor',
  love: 'amor',
  educacao: 'educação',
  education: 'educação',
  superacao: 'superação',
  motivation: 'motivação',
  motivacao: 'motivação',
  reflexao: 'reflexão',
  wisdom: 'sabedoria',
  life: 'vida',
  success: 'sucesso',
  sucesso: 'sucesso',
  faith: 'fé',
  fe: 'fé',
  family: 'família',
  familia: 'família',
  happiness: 'felicidade',
  felicidade: 'felicidade',
};

function slugToLabel(slug: string): string {
  const parts = slug.split('-').filter(Boolean);
  for (const part of parts) {
    const mapped = SLUG_LABEL_PT[part];
    if (mapped) return mapped;
  }
  const first = parts[0];
  if (first && first.length >= 3) return first;
  return parts.join(' ');
}

/**
 * Normaliza tag para exibição: remove anos, slugs ruidosos e caracteres corrompidos.
 */
export function formatTagForDisplay(raw: unknown): string | null {
  let tag = sanitizeTextForTranslation(raw).toLowerCase();
  if (!tag || tag.length < 2) return null;
  if (YEAR_TAG.test(tag) || NUMERIC_ONLY.test(tag)) return null;
  if (tag.length > 40) return null;

  if (SLUG_LIKE.test(tag)) {
    return slugToLabel(tag);
  }

  return tag;
}

/** Lista de tags prontas para UI (únicas, ordenadas). */
export function tagsForDisplay(tags: unknown[] | undefined, limit = 12): string[] {
  if (!Array.isArray(tags)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const label = formatTagForDisplay(raw);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    out.push(label);
    if (out.length >= limit) break;
  }
  return out.sort((a, b) => a.localeCompare(b, 'pt'));
}
