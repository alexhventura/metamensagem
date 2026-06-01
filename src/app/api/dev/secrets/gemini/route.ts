import { NextRequest, NextResponse } from 'next/server';
import {
  geminiKeyFileExists,
  saveEncryptedGeminiKey,
} from '@/lib/secrets/geminiKey';
import { hasGeminiKeyConfigured, loadGeminiApiKey } from '@/lib/secrets/loadCuradoriaApiKey';
import { readSecretsPassphrase } from '@/lib/secrets/envLocal';

function devSecretsAllowed(): boolean {
  if (process.env.ENABLE_DEV_SECRETS === 'true') return true;
  return process.env.NODE_ENV !== 'production';
}

export async function GET() {
  if (!devSecretsAllowed()) {
    return NextResponse.json({ error: 'Indisponível em produção' }, { status: 403 });
  }
  return NextResponse.json({
    hasKey: geminiKeyFileExists() || Boolean(process.env.GEMINI_API_KEY),
    encryptedFile: geminiKeyFileExists(),
    canDecrypt: hasGeminiKeyConfigured(),
  });
}

export async function POST(request: NextRequest) {
  if (!devSecretsAllowed()) {
    return NextResponse.json({ error: 'Indisponível em produção' }, { status: 403 });
  }

  const passphrase = readSecretsPassphrase();
  if (!passphrase) {
    return NextResponse.json(
      {
        error:
          'Defina SECRETS_PASSPHRASE em .env.local (frase secreta local usada para criptografar a chave).',
      },
      { status: 400 }
    );
  }

  let body: { apiKey?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const apiKey = body.apiKey?.trim();
  if (!apiKey || apiKey.length < 10) {
    return NextResponse.json({ error: 'Chave Gemini inválida' }, { status: 400 });
  }

  try {
    saveEncryptedGeminiKey(apiKey, passphrase);
    const verified = loadGeminiApiKey();
    if (!verified) {
      return NextResponse.json(
        { error: 'Chave gravada, mas falhou a verificação. Confira SECRETS_PASSPHRASE.' },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true, message: 'Chave Gemini salva (criptografada).' });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro ao salvar';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
