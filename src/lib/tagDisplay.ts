import { sanitizeTextForTranslation } from './textSanitize';

const YEAR_TAG = /^(19|20)\d{2}$/;
const NUMERIC_ONLY = /^\d+$/;
const SLUG_LIKE = /^[a-z0-9]+(?:-[a-z0-9]+){1,}$/;

type TagLocale = 'pt' | 'en' | 'es' | 'fr' | 'de' | 'it' | 'ja' | 'nl' | 'pl' | 'zh' | 'hi';

/** Mapa canônico de slugs → rótulo por idioma da interface (sem traduzir o conteúdo da frase). */
const SLUG_LABELS: Record<string, Partial<Record<TagLocale, string>> & { pt: string }> = {
  action: { pt: 'ação', en: 'action', es: 'acción', fr: 'action', de: 'Aktion', it: 'azione', ja: '行動', nl: 'actie', zh: '行动' },
  acao: { pt: 'ação', en: 'action', es: 'acción', fr: 'action', de: 'Aktion', it: 'azione', ja: '行動', nl: 'actie', zh: '行动' },
  achievement: { pt: 'conquista', en: 'achievement', es: 'logro', fr: 'réussite', de: 'Erfolg', it: 'successo', ja: '達成', nl: 'prestatie', zh: '成就' },
  anxiety: { pt: 'ansiedade', en: 'anxiety', es: 'ansiedad', fr: 'anxiété', de: 'Angst', it: 'ansia', ja: '不安', nl: 'angst', zh: '焦虑' },
  amor: { pt: 'amor', en: 'love', es: 'amor', fr: 'amour', de: 'Liebe', it: 'amore', ja: '愛', nl: 'liefde', zh: '爱' },
  amore: { pt: 'amor', en: 'love', es: 'amor', fr: 'amour', de: 'Liebe', it: 'amore', ja: '愛', nl: 'liefde', zh: '爱' },
  love: { pt: 'amor', en: 'love', es: 'amor', fr: 'amour', de: 'Liebe', it: 'amore', ja: '愛', nl: 'liefde', zh: '爱' },
  loving: { pt: 'amor', en: 'love', es: 'amor', fr: 'amour', de: 'Liebe', it: 'amore', ja: '愛', nl: 'liefde', zh: '爱' },
  amizade: { pt: 'amizade', en: 'friendship', es: 'amistad', fr: 'amitié', de: 'Freundschaft', it: 'amicizia', ja: '友情', nl: 'vriendschap', zh: '友谊' },
  friendship: { pt: 'amizade', en: 'friendship', es: 'amistad', fr: 'amitié', de: 'Freundschaft', it: 'amicizia', ja: '友情', nl: 'vriendschap', zh: '友谊' },
  change: { pt: 'mudança', en: 'change', es: 'cambio', fr: 'changement', de: 'Veränderung', it: 'cambiamento', ja: '変化', nl: 'verandering', zh: '改变' },
  mudanca: { pt: 'mudança', en: 'change', es: 'cambio', fr: 'changement', de: 'Veränderung', it: 'cambiamento', ja: '変化', nl: 'verandering', zh: '改变' },
  choice: { pt: 'escolha', en: 'choice', es: 'elección', fr: 'choix', de: 'Wahl', it: 'scelta', ja: '選択', nl: 'keuze', zh: '选择' },
  choices: { pt: 'escolhas', en: 'choices', es: 'elecciones', fr: 'choix', de: 'Wahlen', it: 'scelte', ja: '選択', nl: 'keuzes', zh: '选择' },
  compassion: { pt: 'compaixão', en: 'compassion', es: 'compasión', fr: 'compassion', de: 'Mitgefühl', it: 'compassione', ja: '慈悲', nl: 'mededogen', zh: '同情' },
  courage: { pt: 'coragem', en: 'courage', es: 'coraje', fr: 'courage', de: 'Mut', it: 'coraggio', ja: '勇気', nl: 'moed', zh: '勇气' },
  death: { pt: 'morte', en: 'death', es: 'muerte', fr: 'mort', de: 'Tod', it: 'morte', ja: '死', nl: 'dood', zh: '死亡' },
  discipline: { pt: 'disciplina', en: 'discipline', es: 'disciplina', fr: 'discipline', de: 'Disziplin', it: 'disciplina', ja: '規律', nl: 'discipline', zh: '纪律' },
  disciplin: { pt: 'disciplina', en: 'discipline', es: 'disciplina', fr: 'discipline', de: 'Disziplin', it: 'disciplina', ja: '規律', nl: 'discipline', zh: '纪律' },
  educacao: { pt: 'educação', en: 'education', es: 'educación', fr: 'éducation', de: 'Bildung', it: 'educazione', ja: '教育', nl: 'onderwijs', zh: '教育' },
  education: { pt: 'educação', en: 'education', es: 'educación', fr: 'éducation', de: 'Bildung', it: 'educazione', ja: '教育', nl: 'onderwijs', zh: '教育' },
  faith: { pt: 'fé', en: 'faith', es: 'fe', fr: 'foi', de: 'Glaube', it: 'fede', ja: '信仰', nl: 'geloof', zh: '信仰' },
  fe: { pt: 'fé', en: 'faith', es: 'fe', fr: 'foi', de: 'Glaube', it: 'fede', ja: '信仰', nl: 'geloof', zh: '信仰' },
  family: { pt: 'família', en: 'family', es: 'familia', fr: 'famille', de: 'Familie', it: 'famiglia', ja: '家族', nl: 'familie', zh: '家庭' },
  familia: { pt: 'família', en: 'family', es: 'familia', fr: 'famille', de: 'Familie', it: 'famiglia', ja: '家族', nl: 'familie', zh: '家庭' },
  fear: { pt: 'medo', en: 'fear', es: 'miedo', fr: 'peur', de: 'Furcht', it: 'paura', ja: '恐れ', nl: 'angst', zh: '恐惧' },
  forgiveness: { pt: 'perdão', en: 'forgiveness', es: 'perdón', fr: 'pardon', de: 'Vergebung', it: 'perdono', ja: '許し', nl: 'vergeving', zh: '宽恕' },
  gratitude: { pt: 'gratidão', en: 'gratitude', es: 'gratitud', fr: 'gratitude', de: 'Dankbarkeit', it: 'gratitudine', ja: '感謝', nl: 'dankbaarheid', zh: '感恩' },
  gratefulness: { pt: 'gratidão', en: 'gratitude', es: 'gratitud', fr: 'gratitude', de: 'Dankbarkeit', it: 'gratitudine', ja: '感謝', nl: 'dankbaarheid', zh: '感恩' },
  healing: { pt: 'cura', en: 'healing', es: 'sanación', fr: 'guérison', de: 'Heilung', it: 'guarigione', ja: '癒し', nl: 'genezing', zh: '疗愈' },
  hope: { pt: 'esperança', en: 'hope', es: 'esperanza', fr: 'espoir', de: 'Hoffnung', it: 'speranza', ja: '希望', nl: 'hoop', zh: '希望' },
  inspiration: { pt: 'inspiração', en: 'inspiration', es: 'inspiración', fr: 'inspiration', de: 'Inspiration', it: 'ispirazione', ja: 'インスピレーション', nl: 'inspiratie', zh: '灵感' },
  inspiracao: { pt: 'inspiração', en: 'inspiration', es: 'inspiración', fr: 'inspiration', de: 'Inspiration', it: 'ispirazione', ja: 'インスピレーション', nl: 'inspiratie', zh: '灵感' },
  inspiracional: { pt: 'inspiração', en: 'inspiration', es: 'inspiración', fr: 'inspiration', de: 'Inspiration', it: 'ispirazione', ja: 'インスピレーション', nl: 'inspiratie', zh: '灵感' },
  kindness: { pt: 'gentileza', en: 'kindness', es: 'amabilidad', fr: 'gentillesse', de: 'Freundlichkeit', it: 'gentilezza', ja: '優しさ', nl: 'vriendelijkheid', zh: '善意' },
  superacao: { pt: 'superação', en: 'overcoming', es: 'superación', fr: 'dépassement', de: 'Überwindung', it: 'superamento', ja: '克服', nl: 'overwinning', zh: '克服' },
  overcoming: { pt: 'superação', en: 'overcoming', es: 'superación', fr: 'dépassement', de: 'Überwindung', it: 'superamento', ja: '克服', nl: 'overwinning', zh: '克服' },
  motivation: { pt: 'motivação', en: 'motivation', es: 'motivación', fr: 'motivation', de: 'Motivation', it: 'motivazione', ja: '動機', nl: 'motivatie', zh: '动力' },
  motivacao: { pt: 'motivação', en: 'motivation', es: 'motivación', fr: 'motivation', de: 'Motivation', it: 'motivazione', ja: '動機', nl: 'motivatie', zh: '动力' },
  motivacional: { pt: 'motivação', en: 'motivation', es: 'motivación', fr: 'motivation', de: 'Motivation', it: 'motivazione', ja: '動機', nl: 'motivatie', zh: '动力' },
  peace: { pt: 'paz', en: 'peace', es: 'paz', fr: 'paix', de: 'Frieden', it: 'pace', ja: '平和', nl: 'vrede', zh: '和平' },
  positivity: { pt: 'positividade', en: 'positivity', es: 'positividad', fr: 'positivité', de: 'Positivität', it: 'positività', ja: '前向き', nl: 'positiviteit', zh: '积极' },
  reflexao: { pt: 'reflexão', en: 'reflection', es: 'reflexión', fr: 'réflexion', de: 'Reflexion', it: 'riflessione', ja: '内省', nl: 'reflectie', zh: '反思' },
  reflection: { pt: 'reflexão', en: 'reflection', es: 'reflexión', fr: 'réflexion', de: 'Reflexion', it: 'riflessione', ja: '内省', nl: 'reflectie', zh: '反思' },
  relationship: { pt: 'relacionamento', en: 'relationship', es: 'relación', fr: 'relation', de: 'Beziehung', it: 'relazione', ja: '人間関係', nl: 'relatie', zh: '关系' },
  relationships: { pt: 'relacionamentos', en: 'relationships', es: 'relaciones', fr: 'relations', de: 'Beziehungen', it: 'relazioni', ja: '人間関係', nl: 'relaties', zh: '关系' },
  resilience: { pt: 'resiliência', en: 'resilience', es: 'resiliencia', fr: 'résilience', de: 'Resilienz', it: 'resilienza', ja: '回復力', nl: 'veerkracht', zh: '韧性' },
  self: { pt: 'autoconhecimento', en: 'self-knowledge', es: 'autoconocimiento', fr: 'connaissance de soi', de: 'Selbstkenntnis', it: 'autoconoscenza', ja: '自己理解', nl: 'zelfkennis', zh: '自我认知' },
  selflove: { pt: 'amor próprio', en: 'self-love', es: 'amor propio', fr: 'amour de soi', de: 'Selbstliebe', it: 'amor proprio', ja: '自己愛', nl: 'zelfliefde', zh: '自爱' },
  spirituality: { pt: 'espiritualidade', en: 'spirituality', es: 'espiritualidad', fr: 'spiritualité', de: 'Spiritualität', it: 'spiritualità', ja: 'スピリチュアリティ', nl: 'spiritualiteit', zh: '灵性' },
  wisdom: { pt: 'sabedoria', en: 'wisdom', es: 'sabiduría', fr: 'sagesse', de: 'Weisheit', it: 'saggezza', ja: '知恵', nl: 'wijsheid', zh: '智慧' },
  life: { pt: 'vida', en: 'life', es: 'vida', fr: 'vie', de: 'Leben', it: 'vita', ja: '人生', nl: 'leven', zh: '人生' },
  living: { pt: 'vida', en: 'life', es: 'vida', fr: 'vie', de: 'Leben', it: 'vita', ja: '人生', nl: 'leven', zh: '人生' },
  success: { pt: 'sucesso', en: 'success', es: 'éxito', fr: 'succès', de: 'Erfolg', it: 'successo', ja: '成功', nl: 'succes', zh: '成功' },
  sucesso: { pt: 'sucesso', en: 'success', es: 'éxito', fr: 'succès', de: 'Erfolg', it: 'successo', ja: '成功', nl: 'succes', zh: '成功' },
  happiness: { pt: 'felicidade', en: 'happiness', es: 'felicidad', fr: 'bonheur', de: 'Glück', it: 'felicità', ja: '幸福', nl: 'geluk', zh: '幸福' },
  felicidade: { pt: 'felicidade', en: 'happiness', es: 'felicidad', fr: 'bonheur', de: 'Glück', it: 'felicità', ja: '幸福', nl: 'geluk', zh: '幸福' },
  trabalho: { pt: 'trabalho', en: 'work', es: 'trabajo', fr: 'travail', de: 'Arbeit', it: 'lavoro', ja: '仕事', nl: 'werk', zh: '工作' },
  work: { pt: 'trabalho', en: 'work', es: 'trabajo', fr: 'travail', de: 'Arbeit', it: 'lavoro', ja: '仕事', nl: 'werk', zh: '工作' },
  truth: { pt: 'verdade', en: 'truth', es: 'verdad', fr: 'vérité', de: 'Wahrheit', it: 'verità', ja: '真実', nl: 'waarheid', zh: '真理' },
  verdade: { pt: 'verdade', en: 'truth', es: 'verdad', fr: 'vérité', de: 'Wahrheit', it: 'verità', ja: '真実', nl: 'waarheid', zh: '真理' },
  metafora: { pt: 'metáfora', en: 'metaphor', es: 'metáfora', fr: 'métaphore', de: 'Metapher', it: 'metafora', ja: 'メタファー', nl: 'metafoor', zh: '隐喻' },
  metaphor: { pt: 'metáfora', en: 'metaphor', es: 'metáfora', fr: 'métaphore', de: 'Metapher', it: 'metafora', ja: 'メタファー', nl: 'metafoor', zh: '隐喻' },
  historias: { pt: 'histórias', en: 'stories', es: 'historias', fr: 'histoires', de: 'Geschichten', it: 'storie', ja: '物語', nl: 'verhalen', zh: '故事' },
  stories: { pt: 'histórias', en: 'stories', es: 'historias', fr: 'histoires', de: 'Geschichten', it: 'storie', ja: '物語', nl: 'verhalen', zh: '故事' },
  luto: { pt: 'luto', en: 'grief', es: 'duelo', fr: 'deuil', de: 'Trauer', it: 'lutto', ja: '悲嘆', nl: 'rouw', zh: '哀悼' },
  grief: { pt: 'luto', en: 'grief', es: 'duelo', fr: 'deuil', de: 'Trauer', it: 'lutto', ja: '悲嘆', nl: 'rouw', zh: '哀悼' },
};

function resolveTagLocale(locale?: string | null): TagLocale {
  const base = (locale || 'pt').toLowerCase().split('-')[0];
  const allowed: TagLocale[] = ['pt', 'en', 'es', 'fr', 'de', 'it', 'ja', 'nl', 'pl', 'zh', 'hi'];
  return (allowed.includes(base as TagLocale) ? base : 'pt') as TagLocale;
}

function labelForSlugPart(part: string, locale: TagLocale): string | null {
  const entry = SLUG_LABELS[part];
  if (!entry) return null;
  return entry[locale] ?? entry.en ?? entry.pt;
}

function slugToLabel(slug: string, locale: TagLocale): string {
  const parts = slug.split('-').filter(Boolean);
  for (const part of parts) {
    const mapped = labelForSlugPart(part, locale);
    if (mapped) return mapped;
  }
  const first = parts[0];
  if (first && first.length >= 3) return first;
  return parts.join(' ');
}

/**
 * Normaliza tag para exibição no idioma da interface (navegador / i18n).
 * Não altera o idioma do texto da citação ou metáfora.
 */
export function formatTagForDisplay(raw: unknown, locale?: string | null): string | null {
  let tag = sanitizeTextForTranslation(raw).toLowerCase();
  if (!tag || tag.length < 2) return null;
  if (YEAR_TAG.test(tag) || NUMERIC_ONLY.test(tag)) return null;
  if (tag.length > 40) return null;

  const loc = resolveTagLocale(locale);

  if (SLUG_LIKE.test(tag)) {
    return slugToLabel(tag, loc);
  }

  const mapped = labelForSlugPart(tag.replace(/\s+/g, ''), loc) ?? labelForSlugPart(tag, loc);
  if (mapped) return mapped;

  return tag;
}

/** Lista de tags prontas para UI (únicas, ordenadas no locale). */
export function tagsForDisplay(
  tags: unknown[] | undefined,
  limit = 12,
  locale?: string | null
): string[] {
  if (!Array.isArray(tags)) return [];
  const loc = resolveTagLocale(locale);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tags) {
    const label = formatTagForDisplay(raw, loc);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    out.push(label);
    if (out.length >= limit) break;
  }
  return out.sort((a, b) => a.localeCompare(b, loc === 'pt' ? 'pt' : loc));
}
