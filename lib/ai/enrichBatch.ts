import { GoogleGenAI } from '@google/genai';
import type { FraseCanonical } from '../frases/canonical';
import { getCuradoriaAiProvider } from '../secrets/loadCuradoriaApiKey';
import { buildCuratePrompt, type AiCurationRow } from './curatePrompts';
import { openaiChatCompletion } from './openaiChat';
import { parseJsonArrayFromModel } from './parseModelJson';

export async function enrichBatchWithCuradoria(
  batch: FraseCanonical[],
  apiKey: string
): Promise<Map<string, AiCurationRow>> {
  const provider = getCuradoriaAiProvider();
  const prompt = buildCuratePrompt(batch);

  let text: string;
  if (provider === 'gemini') {
    const ai = new GoogleGenAI({ apiKey });
    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        temperature: 0.45,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
    });
    text = response.text?.trim() || '';
  } else {
    text = await openaiChatCompletion(apiKey, prompt, { temperature: 0.45, maxTokens: 8192 });
  }

  if (!text) throw new Error(`Resposta vazia (${provider})`);

  const rows = parseJsonArrayFromModel<AiCurationRow>(text);
  const map = new Map<string, AiCurationRow>();
  for (const row of rows) {
    if (row?.id) map.set(row.id, row);
  }
  return map;
}

export async function generateExplicacaoBatch(
  batch: { id: string; frase_original: string; autor_original: string; categoria?: string; contextos?: string[]; autor_tipo?: string | null; nacionalidade?: string | null; nascimento_falecimento?: string | null; ano_ou_data?: string | null }[],
  apiKey: string
): Promise<Record<string, string>> {
  const { buildExplicacaoPrompt } = await import('./curatePrompts');
  const provider = getCuradoriaAiProvider();
  const prompt = buildExplicacaoPrompt(batch);

  let text: string;
  if (provider === 'gemini') {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
      contents: prompt,
      config: {
        temperature: 0.55,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    });
    text = response.text?.trim() || '';
  } else {
    text = await openaiChatCompletion(apiKey, prompt, { temperature: 0.55, maxTokens: 4096 });
  }

  const parsed = parseJsonArrayFromModel<{ id: string; explicacao?: string }>(text);
  const out: Record<string, string> = {};
  for (const row of parsed) {
    if (row?.id && row.explicacao) {
      out[row.id] = String(row.explicacao).trim().slice(0, 500);
    }
  }
  return out;
}
