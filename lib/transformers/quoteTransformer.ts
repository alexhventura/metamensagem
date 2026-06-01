/**
 * Compatibilidade — use lib/transformers/fraseTransformer.ts
 */

import type { RawApiQuote } from '../frases/canonical';
import { curateFrasesInBatches } from '../curation/fraseCurator';
import {
  buildFraseFromRaw as buildBaseCanonical,
  mergeCurationIntoFrase as mergeAiIntoCanonical,
  transformRawQuotesToFrases,
  finalizeFrase,
  fallbackExplicacao,
  type AiCurationPatch as AiCurationRow,
} from './fraseTransformer';

export {
  loadAuthorFacts,
  mergeCurationIntoFrase as mergeAiIntoCanonical,
  fallbackExplicacao,
} from './fraseTransformer';
export { buildFraseFromRaw as buildBaseCanonical } from './fraseTransformer';

export type { AiCurationRow };

export async function transformQuotes(
  rawList: RawApiQuote[],
  options: { aiApiKey?: string; geminiApiKey?: string; batchSize?: number } = {}
) {
  const usedSlugs = new Set<string>();
  const bases = transformRawQuotesToFrases(rawList, usedSlugs);
  const key = options.aiApiKey || options.geminiApiKey;
  if (!key) return bases.map(finalizeFrase);
  return curateFrasesInBatches(bases, key, options.batchSize ?? 5);
}

export { rawFromLegacyInput } from './fraseTransformer';
