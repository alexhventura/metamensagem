/**
 * Grava a chave Gemini criptografada em data/secrets/gemini.key.enc.json
 *
 * Pré-requisito em .env.local:
 *   SECRETS_PASSPHRASE=sua-frase-secreta-local
 *
 * Uso:
 *   npx tsx scripts/set-gemini-key.ts
 *   npx tsx scripts/set-gemini-key.ts --key AIza...
 */

import fs from 'fs';
import readline from 'readline';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { saveEncryptedGeminiKey, loadEncryptedGeminiKey, GEMINI_SECRET_FILE } from '../lib/secrets/geminiKey';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

for (const f of ['.env.local', '.env']) {
  const p = path.join(ROOT, f);
  if (fs.existsSync(p)) dotenv.config({ path: p });
}

function maskInput(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const stdin = process.stdin as NodeJS.ReadStream & { setRawMode?: (m: boolean) => void };
    process.stdout.write(prompt);
    let value = '';
    if (stdin.isTTY && stdin.setRawMode) {
      stdin.setRawMode(true);
      stdin.resume();
      stdin.setEncoding('utf8');
      const onData = (ch: string) => {
        if (ch === '\n' || ch === '\r' || ch === '\u0004') {
          stdin.setRawMode!(false);
          stdin.pause();
          stdin.removeListener('data', onData);
          process.stdout.write('\n');
          rl.close();
          resolve(value.trim());
          return;
        }
        if (ch === '\u0003') process.exit(130);
        if (ch === '\u007f' || ch === '\b') {
          if (value.length) {
            value = value.slice(0, -1);
            process.stdout.write('\b \b');
          }
          return;
        }
        value += ch;
        process.stdout.write('*');
      };
      stdin.on('data', onData);
    } else {
      rl.question('', (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    }
  });
}

async function main() {
  const passphrase = process.env.SECRETS_PASSPHRASE?.trim();
  if (!passphrase) {
    console.error('❌ Defina SECRETS_PASSPHRASE em .env.local antes de gravar a chave.');
    console.error('   Exemplo: SECRETS_PASSPHRASE=minha-frase-secreta-local');
    process.exit(1);
  }

  const keyIdx = process.argv.indexOf('--key');
  let apiKey = keyIdx >= 0 ? process.argv[keyIdx + 1]?.trim() : '';
  if (!apiKey) {
    apiKey = await maskInput('Cole a chave Gemini (AI Studio) e pressione Enter: ');
  }
  if (!apiKey || apiKey.length < 10) {
    console.error('❌ Chave inválida ou vazia.');
    process.exit(1);
  }

  saveEncryptedGeminiKey(apiKey, passphrase);
  if (!loadEncryptedGeminiKey(passphrase)) {
    console.error('❌ Arquivo gravado, mas não foi possível validar a descriptografia. Verifique SECRETS_PASSPHRASE.');
    process.exit(1);
  }

  console.log(`✅ Chave Gemini gravada (criptografada) em:\n   ${GEMINI_SECRET_FILE}`);
  console.log('   Não commite este arquivo. Use npm run frases:import ou a página /dev/chaves.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
