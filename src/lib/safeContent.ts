import { sanitizeTextForTranslation } from './textSanitize';

/**
 * Utilitários defensivos para conteúdo (APIs externas, índices, busca semântica).
 * Evita runtime errors com null/undefined em normalização.
 */

export function safeText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }
  return '';
}

export function safeLower(value: unknown): string {
  return safeText(value).toLowerCase();
}

/** Lista de tags válidas (strings não vazias). */
export function safeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const entry of value) {
    const t = sanitizeTextForTranslation(entry);
    if (t) out.push(t);
  }
  return out;
}

export interface SafeContentItem {
  id: string;
  tipo: 'frase' | 'metafora';
  texto: string;
  autor: string;
  tags: string[];
  titulo?: string;
  resumo?: string;
  imagem?: string;
}

/** Normaliza item bruto do índice/API para o formato do app; retorna null se inválido. */
export function normalizeContentItem(raw: unknown): SafeContentItem | null {
  if (!raw || typeof raw !== 'object') return null;

  const r = raw as Record<string, unknown>;
  const tipoRaw = safeLower(r.tipo);
  const tipo: 'frase' | 'metafora' | null =
    tipoRaw === 'metafora' ? 'metafora' : tipoRaw === 'frase' ? 'frase' : null;
  if (!tipo) return null;

  const texto = sanitizeTextForTranslation(r.texto ?? r.text ?? r.quote ?? r.content);
  const titulo = sanitizeTextForTranslation(r.titulo ?? r.title);
  const resumo = sanitizeTextForTranslation(r.resumo ?? r.summary ?? r.description);
  const autor = safeText(r.autor ?? r.author) || 'Anônimo';
  const tags = safeTags(r.tags);
  const id = safeText(r.id) || `mm_${tipo}_${texto.slice(0, 24).length}`;

  if (tipo === 'frase' && !texto) return null;
  if (tipo === 'metafora' && !texto && !resumo && !titulo) return null;

  const item: SafeContentItem = {
    id,
    tipo,
    texto: texto || resumo || titulo,
    autor,
    tags: tags.length ? tags : ['Inspiracional', 'Reflexao'],
  };

  if (titulo) item.titulo = titulo;
  if (resumo) item.resumo = resumo;
  const imagem = safeText(r.imagem ?? r.image);
  if (imagem) item.imagem = imagem;

  return item;
}

/** Filtra e sanitiza array do banco (índice ou cache). */
export function sanitizeContentBanco(items: unknown): SafeContentItem[] {
  if (!Array.isArray(items)) return [];
  const out: SafeContentItem[] = [];
  for (const raw of items) {
    const normalized = normalizeContentItem(raw);
    if (normalized) out.push(normalized);
  }
  return out;
}
