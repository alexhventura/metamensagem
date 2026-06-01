/**
 * Templates SEO multilíngue (sem IA/API).
 */

import type { SeoLocale } from '../i18n/locales';

const SITE = 'Metamensagem';

type TemplateInput = {
  frase: string;
  autor: string;
  tema?: string;
};

const TITLE: Record<SeoLocale, (i: TemplateInput) => string> = {
  pt: (i) => `"${truncate(i.frase, 52)}" — ${i.autor} | ${SITE}`,
  en: (i) => `"${truncate(i.frase, 52)}" — ${i.autor} | Quotes`,
  es: (i) => `"${truncate(i.frase, 52)}" — ${i.autor} | Frases`,
  fr: (i) => `"${truncate(i.frase, 52)}" — ${i.autor} | Citations`,
  de: (i) => `"${truncate(i.frase, 52)}" — ${i.autor} | Zitate`,
  it: (i) => `"${truncate(i.frase, 52)}" — ${i.autor} | Citazioni`,
  ja: (i) => `「${truncate(i.frase, 40)}」— ${i.autor} | ${SITE}`,
  hi: (i) => `"${truncate(i.frase, 52)}" — ${i.autor} | उद्धरण`,
};

const DESC: Record<SeoLocale, (i: TemplateInput) => string> = {
  pt: (i) =>
    `Frase de ${i.autor}${i.tema ? ` sobre ${i.tema.replace(/-/g, ' ')}` : ''}. Leia, copie e compartilhe no ${SITE}.`,
  en: (i) =>
    `Quote by ${i.autor}${i.tema ? ` about ${i.tema.replace(/-/g, ' ')}` : ''}. Read and share on ${SITE}.`,
  es: (i) =>
    `Frase de ${i.autor}${i.tema ? ` sobre ${i.tema.replace(/-/g, ' ')}` : ''}. Lee y comparte en ${SITE}.`,
  fr: (i) =>
    `Citation de ${i.autor}${i.tema ? ` sur ${i.tema.replace(/-/g, ' ')}` : ''}. Lire et partager sur ${SITE}.`,
  de: (i) =>
    `Zitat von ${i.autor}${i.tema ? ` über ${i.tema.replace(/-/g, ' ')}` : ''}. Lesen und teilen auf ${SITE}.`,
  it: (i) =>
    `Citazione di ${i.autor}${i.tema ? ` su ${i.tema.replace(/-/g, ' ')}` : ''}. Leggi e condividi su ${SITE}.`,
  ja: (i) =>
    `${i.autor}の名言${i.tema ? `（${i.tema.replace(/-/g, ' ')}）` : ''}。${SITE}で読んで共有。`,
  hi: (i) =>
    `${i.autor} का उद्धरण${i.tema ? ` — ${i.tema.replace(/-/g, ' ')}` : ''}. ${SITE} पर पढ़ें और साझा करें।`,
};

function truncate(s: string, n: number): string {
  const t = s.trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

export type FraseI18nSeoFields = {
  languageOriginal: string;
  availableLanguages: string[];
  title_pt: string;
  title_en: string;
  title_es: string;
  title_fr: string;
  title_de: string;
  title_it: string;
  title_ja: string;
  title_hi: string;
  description_pt: string;
  description_en: string;
  description_es: string;
  description_fr: string;
  description_de: string;
  description_it: string;
  description_ja: string;
  description_hi: string;
};

export function buildFraseI18nSeo(
  input: TemplateInput & { languageOriginal: SeoLocale; includeExtra?: boolean }
): FraseI18nSeoFields {
  const langs: SeoLocale[] = ['pt', 'en', 'es'];
  const extra: SeoLocale[] = ['fr', 'de', 'it', 'ja', 'hi'];
  const available = new Set<SeoLocale>([input.languageOriginal, 'pt', 'en', 'es']);
  if (input.includeExtra) extra.forEach((l) => available.add(l));

  const fields = {} as FraseI18nSeoFields;
  fields.languageOriginal = input.languageOriginal;
  fields.availableLanguages = [...available];

  for (const loc of ['pt', 'en', 'es', 'fr', 'de', 'it', 'ja', 'hi'] as SeoLocale[]) {
    const titleKey = `title_${loc}` as keyof FraseI18nSeoFields;
    const descKey = `description_${loc}` as keyof FraseI18nSeoFields;
    (fields[titleKey] as string) = TITLE[loc](input);
    (fields[descKey] as string) = DESC[loc](input).slice(0, 160);
  }
  return fields;
}

export function pickTitleDescription(
  meta: FraseI18nSeoFields | null,
  locale: SeoLocale,
  fallback: { title: string; description: string }
): { title: string; description: string } {
  if (!meta) return fallback;
  const tk = `title_${locale}` as keyof FraseI18nSeoFields;
  const dk = `description_${locale}` as keyof FraseI18nSeoFields;
  return {
    title: (meta[tk] as string) || fallback.title,
    description: (meta[dk] as string) || fallback.description,
  };
}
