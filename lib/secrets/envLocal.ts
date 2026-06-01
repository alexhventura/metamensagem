import fs from 'fs';
import path from 'path';

export function readLocalEnv(name: string): string | undefined {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return undefined;
  const raw = fs.readFileSync(envPath, 'utf8');
  const re = new RegExp(`^${name}=(.+)$`, 'm');
  const m = raw.match(re);
  return m?.[1]?.trim().replace(/^["']|["']$/g, '');
}

export function readSecretsPassphrase(): string | undefined {
  const passphrase = readLocalEnv('SECRETS_PASSPHRASE') || process.env.SECRETS_PASSPHRASE?.trim();
  if (!passphrase || passphrase.startsWith('AIza') || passphrase.startsWith('sk-')) return undefined;
  return passphrase;
}
