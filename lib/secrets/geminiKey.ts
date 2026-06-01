import { loadEncryptedSecret, saveEncryptedSecret, secretFileExists, secretFilePath } from './encryptedKeyStore';

const SECRET_NAME = 'gemini';

export const GEMINI_SECRET_FILE = secretFilePath(SECRET_NAME);

export function geminiKeyFileExists(): boolean {
  return secretFileExists(SECRET_NAME);
}

export function saveEncryptedGeminiKey(apiKey: string, passphrase: string): void {
  saveEncryptedSecret(SECRET_NAME, apiKey, passphrase);
}

export function loadEncryptedGeminiKey(passphrase: string): string | null {
  return loadEncryptedSecret(SECRET_NAME, passphrase);
}
