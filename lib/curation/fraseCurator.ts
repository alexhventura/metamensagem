/**
 * Curadoria automática via IA (ChatGPT/OpenAI por padrão).
 */

import type { FraseCanonical } from '../frases/canonical';
import { enrichBatchWithCuradoria } from '../ai/enrichBatch';
import type { AiCurationPatch } from '../transformers/fraseTransformer';
import { mergeCurationIntoFrase, finalizeFrase } from '../transformers/fraseTransformer';

export async function curateFraseBatch(
  batch: FraseCanonical[],
  apiKey: string
): Promise<FraseCanonical[]> {
  const map = await enrichBatchWithCuradoria(batch, apiKey);
  return batch.map((b) => finalizeFrase(mergeCurationIntoFrase(b, map.get(b.id) as AiCurationPatch | undefined)));
}

export async function curateFrasesInBatches(
  frases: FraseCanonical[],
  apiKey: string,
  batchSize = 5,
  delayMs = 1200
): Promise<FraseCanonical[]> {
  const out: FraseCanonical[] = [];
  for (let i = 0; i < frases.length; i += batchSize) {
    const batch = frases.slice(i, i + batchSize);
    try {
      const curated = await curateFraseBatch(batch, apiKey);
      out.push(...curated);
    } catch (e) {
      console.warn(`⚠️ Curadoria lote ${i + 1}: ${(e as Error).message}`);
      out.push(...batch.map(finalizeFrase));
    }
    if (i + batchSize < frases.length) await new Promise((r) => setTimeout(r, delayMs));
  }
  return out;
}
