import { readLocalEnv, readSecretsPassphrase } from './envLocal';
import { loadEncryptedOpenaiKey, openaiKeyFileExists } from './openaiKey';
import { geminiKeyFileExists, loadEncryptedGeminiKey } from './geminiKey';

export type CuradoriaAiProvider = 'openai' | 'gemini';

export { readLocalEnv, readSecretsPassphrase };

export function getCuradoriaAiProvider(): CuradoriaAiProvider {
  const raw = (
    readLocalEnv('FRASES_AI_PROVIDER') ||
    process.env.FRASES_AI_PROVIDER ||
    'openai'
  ).toLowerCase();
  return raw === 'gemini' ? 'gemini' : 'openai';
}

export function loadOpenaiApiKey(): string | undefined {
  const fromEnv =
    process.env.OPENAI_API_KEY?.trim() ||
    readLocalEnv('OPENAI_API_KEY') ||
    process.env.CHATGPT_API_KEY?.trim() ||
    readLocalEnv('CHATGPT_API_KEY');
  if (fromEnv) return fromEnv;

  const passphrase = readSecretsPassphrase();
  if (!passphrase) return undefined;
  return loadEncryptedOpenaiKey(passphrase) || undefined;
}

export function loadGeminiApiKey(): string | undefined {
  const fromEnv = process.env.GEMINI_API_KEY?.trim() || readLocalEnv('GEMINI_API_KEY');
  if (fromEnv) return fromEnv;

  const passphrase = readSecretsPassphrase();
  if (!passphrase) return undefined;

  return loadEncryptedGeminiKey(passphrase) || undefined;
}

export function loadCuradoriaApiKey(): string | undefined {
  return getCuradoriaAiProvider() === 'gemini' ? loadGeminiApiKey() : loadOpenaiApiKey();
}

export function hasCuradoriaKeyConfigured(): boolean {
  return Boolean(loadCuradoriaApiKey());
}

export function hasGeminiKeyConfigured(): boolean {
  return Boolean(loadGeminiApiKey());
}

export function hasOpenaiKeyConfigured(): boolean {
  return Boolean(loadOpenaiApiKey());
}

export function curadoriaKeyStatus(): {
  provider: CuradoriaAiProvider;
  hasKey: boolean;
  encryptedFile: boolean;
} {
  const provider = getCuradoriaAiProvider();
  const encryptedFile = provider === 'gemini' ? geminiKeyFileExists() : openaiKeyFileExists();
  return {
    provider,
    hasKey: hasCuradoriaKeyConfigured(),
    encryptedFile,
  };
}
