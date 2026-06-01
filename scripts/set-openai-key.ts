/**
 * Grava a chave OpenAI (ChatGPT) criptografada em data/secrets/openai.key.enc.json
 *
 * Pré-requisito em .env.local:
 *   SECRETS_PASSPHRASE=sua-frase-secreta-local
 *   FRASES_AI_PROVIDER=openai
 */

import fs from 'fs';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';
import { readLocalEnv } from '../lib/secrets/envLocal';
import {
  saveEncryptedOpenaiKey,
  loadEncryptedOpenaiKey,
  OPENAI_SECRET_FILE,
} from '../lib/secrets/openaiKey';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function maskInput(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    process.stdout.write(prompt);
    let value = '';
    const stdin = process.stdin as NodeJS.ReadStream & { setRawMode?: (m: boolean) => void };
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
  const passphrase = readLocalEnv('SECRETS_PASSPHRASE');
  if (!passphrase) {
    console.error('❌ Defina SECRETS_PASSPHRASE em .env.local');
    process.exit(1);
  }

  const keyIdx = process.argv.indexOf('--key');
  let apiKey = keyIdx >= 0 ? process.argv[keyIdx + 1]?.trim() : '';
  if (!apiKey) {
    apiKey = await maskInput('Cole a chave OpenAI (sk-...) e pressione Enter: ');
  }
  if (!apiKey?.startsWith('sk-')) {
    console.error('❌ Chave inválida. Use uma API key OpenAI que começa com sk-');
    process.exit(1);
  }

  saveEncryptedOpenaiKey(apiKey, passphrase);
  if (!loadEncryptedOpenaiKey(passphrase)) {
    console.error('❌ Falha ao validar descriptografia. Confira SECRETS_PASSPHRASE.');
    process.exit(1);
  }

  const envPath = path.join(ROOT, '.env.local');
  let envBody = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  if (!/^FRASES_AI_PROVIDER=/m.test(envBody)) {
    envBody += `${envBody.endsWith('\n') || !envBody ? '' : '\n'}FRASES_AI_PROVIDER=openai\n`;
    fs.writeFileSync(envPath, envBody, 'utf8');
  }

  console.log(`✅ Chave OpenAI gravada (criptografada) em:\n   ${OPENAI_SECRET_FILE}`);
  console.log('   Provider: openai (ChatGPT). Rode: npm run frases:import');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
