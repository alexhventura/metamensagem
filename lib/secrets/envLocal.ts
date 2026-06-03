import fs from 'fs';
import path from 'path';

const ENV_VITE = '.env.local';
const ENV_SCRIPTS = '.env.scripts.local';

function readFromFile(fileName: string, name: string): string | undefined {
  const envPath = path.join(process.cwd(), fileName);
  if (!fs.existsSync(envPath)) return undefined;
  const raw = fs.readFileSync(envPath, 'utf8');
  const re = new RegExp(`^${name}=(.+)$`, 'm');
  const m = raw.match(re);
  return m?.[1]?.trim().replace(/^["']|["']$/g, '');
}

export function readLocalEnv(name: string): string | undefined {
  return readFromFile(ENV_SCRIPTS, name) ?? readFromFile(ENV_VITE, name);
}

export function readSecretsPassphrase(): string | undefined {
  const passphrase = readLocalEnv('SECRETS_PASSPHRASE') || process.env.SECRETS_PASSPHRASE?.trim();
  if (!passphrase || passphrase.startsWith('AIza') || passphrase.startsWith('sk-')) return undefined;
  return passphrase;
}
