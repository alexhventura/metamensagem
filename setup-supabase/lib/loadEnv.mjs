/**
 * Carrega env do frontend (.env.local) e de scripts (.env.scripts.local).
 * O Vite só lê .env.local com prefixo VITE_ — secrets admin ficam fora.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.join(__dirname, '..', '..');
export const ENV_VITE_PATH = path.join(ROOT, '.env.local');
export const ENV_SCRIPTS_PATH = path.join(ROOT, '.env.scripts.local');

/** Chaves que pertencem só a .env.scripts.local (nunca no bundle Vite). */
export const SCRIPT_ENV_KEYS = new Set([
  'SECRETS_PASSPHRASE',
  'SUPABASE_PROJECT_REF',
  'POSTGRES_PASSWORD',
  'DATABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
]);

export function loadProjectEnv() {
  dotenv.config({ path: ENV_SCRIPTS_PATH });
  dotenv.config({ path: ENV_VITE_PATH });
  dotenv.config();
}

export function readEnvFile(filePath, key) {
  if (!fs.existsSync(filePath)) return '';
  const m = fs.readFileSync(filePath, 'utf8').match(new RegExp(`^${key}=(.+)$`, 'm'));
  if (!m) return '';
  return m[1].replace(/^["']|["']$/g, '').trim();
}

export function upsertEnvFile(filePath, entries) {
  let content = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  for (const [key, rawValue] of Object.entries(entries)) {
    const value =
      typeof rawValue === 'string' && (rawValue.includes(' ') || rawValue.includes('#'))
        ? `"${rawValue.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
        : String(rawValue);
    const line = `${key}=${value}`;
    const re = new RegExp(`^${key}=.*$`, 'm');
    content = re.test(content) ? content.replace(re, line) : `${content.trimEnd()}\n${line}\n`;
  }
  fs.writeFileSync(filePath, content.endsWith('\n') ? content : `${content}\n`, 'utf8');
}
