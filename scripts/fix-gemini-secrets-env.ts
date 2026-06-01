/**
 * Corrige .env.local quando a chave Gemini foi colocada em SECRETS_PASSPHRASE por engano.
 * Uso único: npx tsx scripts/fix-gemini-secrets-env.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { saveEncryptedGeminiKey, loadEncryptedGeminiKey } from '../lib/secrets/geminiKey';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENV_PATH = path.join(ROOT, '.env.local');
const LOCAL_PASSPHRASE = 'metamensagem-local-secret';

function readEnvValue(name: string): string | undefined {
  if (!fs.existsSync(ENV_PATH)) return undefined;
  const raw = fs.readFileSync(ENV_PATH, 'utf8');
  const re = new RegExp(`^${name}=(.+)$`, 'm');
  const m = raw.match(re);
  return m?.[1]?.trim().replace(/^["']|["']$/g, '');
}

const fromGeminiEnv = readEnvValue('GEMINI_API_KEY');
const fromPassphraseField = readEnvValue('SECRETS_PASSPHRASE');
const apiKey =
  fromGeminiEnv ||
  (fromPassphraseField?.startsWith('AIza') ? fromPassphraseField : '');

if (!apiKey) {
  console.error('❌ Não encontrei chave Gemini em GEMINI_API_KEY nem em SECRETS_PASSPHRASE (AIza...).');
  process.exit(1);
}

saveEncryptedGeminiKey(apiKey, LOCAL_PASSPHRASE);
if (!loadEncryptedGeminiKey(LOCAL_PASSPHRASE)) {
  console.error('❌ Falha ao validar arquivo criptografado.');
  process.exit(1);
}

const lines = [`SECRETS_PASSPHRASE=${LOCAL_PASSPHRASE}`, ''];
fs.writeFileSync(ENV_PATH, lines.join('\n'), 'utf8');

console.log('✅ .env.local corrigido (SECRETS_PASSPHRASE = senha do cofre local).');
console.log('✅ Chave Gemini regravada em data/secrets/gemini.key.enc.json');
console.log('   Rode: npm run frases:import -- --limit 30');
