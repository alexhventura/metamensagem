import fs from 'fs';
import path from 'path';
import { decryptSecret, encryptSecret, type EncryptedPayloadV1 } from './crypto';

const SECRETS_DIR = path.join(process.cwd(), 'data', 'secrets');

export function secretFilePath(name: string): string {
  return path.join(SECRETS_DIR, `${name}.key.enc.json`);
}

export function secretFileExists(name: string): boolean {
  return fs.existsSync(secretFilePath(name));
}

export function saveEncryptedSecret(name: string, plaintext: string, passphrase: string): void {
  fs.mkdirSync(SECRETS_DIR, { recursive: true });
  const payload = encryptSecret(plaintext.trim(), passphrase);
  fs.writeFileSync(secretFilePath(name), JSON.stringify(payload, null, 2), 'utf8');
}

export function loadEncryptedSecret(name: string, passphrase: string): string | null {
  const file = secretFilePath(name);
  if (!fs.existsSync(file)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as EncryptedPayloadV1;
    return decryptSecret(raw, passphrase);
  } catch {
    return null;
  }
}
