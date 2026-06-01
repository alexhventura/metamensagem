'use client';

import { useEffect, useState } from 'react';

export default function DevChavesPage() {
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [provider, setProvider] = useState<string>('openai');
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/dev/secrets/openai')
      .then((r) => r.json())
      .then((d) => {
        setHasKey(Boolean(d.hasKey));
        setProvider(d.provider || 'openai');
      })
      .catch(() => setHasKey(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch('/api/dev/secrets/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar');
      setStatus('ok');
      setMessage('Chave ChatGPT/OpenAI gravada com sucesso (arquivo criptografado local).');
      setApiKey('');
      setHasKey(true);
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Erro ao salvar');
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-12 font-sans text-neutral-800">
      <h1 className="mb-2 text-2xl font-semibold">Chave ChatGPT / OpenAI</h1>
      <p className="mb-6 text-sm text-neutral-600">
        Curadoria de frases usa <strong>ChatGPT</strong> por padrão ({provider}). A chave é
        criptografada (AES-256-GCM) em{' '}
        <code className="rounded bg-neutral-100 px-1">data/secrets/openai.key.enc.json</code>.
      </p>

      <div className="mb-4 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">
        No <code className="rounded bg-white px-1">.env.local</code>:{' '}
        <code className="rounded bg-white px-1">SECRETS_PASSPHRASE=senha-do-cofre</code> e{' '}
        <code className="rounded bg-white px-1">FRASES_AI_PROVIDER=openai</code>
      </div>

      {hasKey === true && (
        <p className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          Chave já configurada. Salvar de novo substitui a anterior.
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <div>
          <label htmlFor="openai-key" className="mb-1 block text-sm font-medium">
            API key OpenAI (sk-...)
          </label>
          <input
            id="openai-key"
            name="openai-key"
            type="password"
            autoComplete="off"
            spellCheck={false}
            required
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-proj-..."
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-neutral-500">
            Crie em{' '}
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              platform.openai.com/api-keys
            </a>
            . Não use senha da conta OpenAI.
          </p>
        </div>

        <button
          type="submit"
          disabled={status === 'loading' || !apiKey.trim()}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {status === 'loading' ? 'Salvando…' : 'Salvar chave criptografada'}
        </button>
      </form>

      {message && (
        <p
          className={`mt-4 text-sm ${status === 'error' ? 'text-red-600' : 'text-green-700'}`}
          role="status"
        >
          {message}
        </p>
      )}

      <p className="mt-8 text-xs text-neutral-500">
        Terminal: <code className="rounded bg-neutral-100 px-1">npm run secrets:set-openai</code>
        <br />
        Gemini (opcional): defina <code className="rounded bg-neutral-100 px-1">FRASES_AI_PROVIDER=gemini</code>
      </p>
    </main>
  );
}
