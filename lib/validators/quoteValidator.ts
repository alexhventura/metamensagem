/**
 * Camada 3 — validação do schema antes de persistir.
 */

import type { FraseCanonical } from '../frases/canonical';

const REQUIRED_STRINGS = [
  'id',
  'slug',
  'frase_original',
  'autor_original',
  'categoria',
  'explicacao',
] as const;

const REQUIRED_ARRAYS = ['contextos', 'palavras_chave'] as const;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateFrase(frase: unknown): ValidationResult {
  const errors: string[] = [];
  if (!frase || typeof frase !== 'object') {
    return { valid: false, errors: ['Objeto inválido'] };
  }

  const f = frase as Record<string, unknown>;

  for (const key of REQUIRED_STRINGS) {
    const v = f[key];
    if (typeof v !== 'string' || !v.trim()) {
      errors.push(`Campo obrigatório ausente ou vazio: ${key}`);
    }
  }

  for (const key of REQUIRED_ARRAYS) {
    const v = f[key];
    if (!Array.isArray(v) || v.length === 0) {
      errors.push(`Array obrigatório inválido: ${key}`);
    }
  }

  if (f.frase_original && typeof f.frase_original === 'string') {
    if (f.frase_original.length < 15) errors.push('frase_original muito curta');
    if (f.frase_original.length > 600) errors.push('frase_original muito longa');
  }

  if (f.slug && typeof f.slug === 'string' && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(f.slug)) {
    errors.push('slug inválido (use apenas a-z, 0-9 e hífen)');
  }

  if (f.explicacao && typeof f.explicacao === 'string' && f.explicacao.length < 20) {
    errors.push('explicacao muito curta');
  }

  if (!f.informacoes || typeof f.informacoes !== 'object') {
    errors.push('informacoes obrigatório');
  }

  try {
    JSON.stringify(f);
  } catch {
    errors.push('objeto não serializável em JSON');
  }

  return { valid: errors.length === 0, errors };
}

export function validateBatch(
  frases: FraseCanonical[],
  existingSlugs: Set<string> = new Set()
): { valid: FraseCanonical[]; rejected: { frase: FraseCanonical; errors: string[] }[] } {
  const valid: FraseCanonical[] = [];
  const rejected: { frase: FraseCanonical; errors: string[] }[] = [];
  const batchSlugs = new Set<string>();
  const batchIds = new Set<string>();

  for (const frase of frases) {
    const result = validateFrase(frase);
    const errors = [...result.errors];

    if (batchIds.has(frase.id)) errors.push(`id duplicado no lote: ${frase.id}`);
    if (batchSlugs.has(frase.slug)) errors.push(`slug duplicado no lote: ${frase.slug}`);
    if (existingSlugs.has(frase.slug)) errors.push(`slug já existe no acervo: ${frase.slug}`);

    if (errors.length) {
      rejected.push({ frase, errors });
    } else {
      valid.push(frase);
      batchIds.add(frase.id);
      batchSlugs.add(frase.slug);
      existingSlugs.add(frase.slug);
    }
  }

  return { valid, rejected };
}

export function ensureCompleteRecord(frase: FraseCanonical): FraseCanonical {
  const today = new Date().toISOString().slice(0, 10);
  return {
    ...frase,
    autor_tipo: frase.autor_tipo ?? null,
    nacionalidade: frase.nacionalidade ?? null,
    nascimento_falecimento: frase.nascimento_falecimento ?? null,
    ano_ou_data: frase.ano_ou_data ?? null,
    fontes: frase.fontes ?? null,
    observacao: frase.observacao ?? null,
    informacoes: {
      ultima_atualizacao: frase.informacoes?.ultima_atualizacao || today,
      confiabilidade: frase.informacoes?.confiabilidade ?? 'importado',
      curadoria_ia: frase.informacoes?.curadoria_ia ?? false,
      origem_import: frase.informacoes?.origem_import,
    },
  };
}
