import { loadEncryptedSecret, saveEncryptedSecret, secretFileExists, secretFilePath } from './encryptedKeyStore';

const SECRET_NAME = 'openai';

export const OPENAI_SECRET_FILE = secretFilePath(SECRET_NAME);

export function openaiKeyFileExists(): boolean {
  return secretFileExists(SECRET_NAME);
}

export function saveEncryptedOpenaiKey(apiKey: string, passphrase: string): void {
  saveEncryptedSecret(SECRET_NAME, apiKey, passphrase);
}

export function loadEncryptedOpenaiKey(passphrase: string): string | null {
  return loadEncryptedSecret(SECRET_NAME, passphrase);
}
