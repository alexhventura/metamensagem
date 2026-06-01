export interface OpenAIChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

import { readLocalEnv } from '../secrets/envLocal';

export async function openaiChatCompletion(
  apiKey: string,
  userPrompt: string,
  options: OpenAIChatOptions = {}
): Promise<string> {
  const model =
    options.model ||
    process.env.OPENAI_MODEL ||
    readLocalEnv('OPENAI_MODEL') ||
    'gpt-4o-mini';

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: options.temperature ?? 0.45,
      max_tokens: options.maxTokens ?? 8192,
      messages: [
        {
          role: 'system',
          content:
            'Você é um assistente editorial. Responda somente com JSON válido em português do Brasil, sem markdown.',
        },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || `OpenAI HTTP ${res.status}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('Resposta vazia do ChatGPT');
  return text;
}
