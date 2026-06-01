import { NextRequest, NextResponse } from 'next/server';
import { saveEncryptedOpenaiKey, openaiKeyFileExists } from '@/lib/secrets/openaiKey';
import {
  hasOpenaiKeyConfigured,
  loadOpenaiApiKey,
  readSecretsPassphrase,
  getCuradoriaAiProvider,
} from '@/lib/secrets/loadCuradoriaApiKey';

function devSecretsAllowed(): boolean {
  if (process.env.ENABLE_DEV_SECRETS === 'true') return true;
  return process.env.NODE_ENV !== 'production';
}

export async function GET() {
  if (!devSecretsAllowed()) {
    return NextResponse.json({ error: 'Indisponível em produção' }, { status: 403 });
  }
  return NextResponse.json({
    provider: getCuradoriaAiProvider(),
    hasKey: hasOpenaiKeyConfigured(),
    encryptedFile: openaiKeyFileExists(),
    canDecrypt: Boolean(loadOpenaiApiKey()),
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
          'Defina SECRETS_PASSPHRASE em .env.local (senha local do cofre — não é a chave sk-).',
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
  if (!apiKey?.startsWith('sk-')) {
    return NextResponse.json({ error: 'Chave OpenAI inválida (deve começar com sk-)' }, { status: 400 });
  }

  try {
    saveEncryptedOpenaiKey(apiKey, passphrase);
    if (!loadOpenaiApiKey()) {
      return NextResponse.json(
        { error: 'Chave gravada, mas falhou a verificação. Confira SECRETS_PASSPHRASE.' },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true, message: 'Chave OpenAI (ChatGPT) salva criptografada.' });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro ao salvar';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
