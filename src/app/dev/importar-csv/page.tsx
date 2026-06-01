'use client';

import { useState } from 'react';

export default function ImportarCsvPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [noAi, setNoAi] = useState(false);
  const [limit, setLimit] = useState('100');
  const [offset, setOffset] = useState('0');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [result, setResult] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setStatus('loading');
    setResult('');

    const form = new FormData();
    form.append('file', file);
    form.append('dryRun', String(dryRun));
    form.append('noAi', String(noAi));
    form.append('limit', limit);
    form.append('offset', offset);

    try {
      const res = await fetch('/api/import-csv', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha');
      setStatus('ok');
      setResult(
        `Lidas: ${data.read} | Novas gravadas: ${data.persisted} | Duplicadas: ${data.duplicateInAcervo} | ` +
          `Validadas: ${data.validated}${dryRun ? ' (simulação)' : ''}`
      );
    } catch (err) {
      setStatus('error');
      setResult(err instanceof Error ? err.message : 'Erro');
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-12 font-sans text-neutral-800">
      <h1 className="mb-2 text-2xl font-semibold">Importador CSV inteligente</h1>
      <p className="mb-6 text-sm text-neutral-600">
        CSV com <code className="rounded bg-neutral-100 px-1">frase,autor</code> ou{' '}
        <code className="rounded bg-neutral-100 px-1">quote,author</code>. Curadoria automática com ChatGPT.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-6 shadow-sm">
        <input type="file" accept=".csv" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            Limite (0 = sem limite neste upload)
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="mt-1 w-full rounded border px-2 py-1"
            />
          </label>
          <label className="text-sm">
            Offset (pular linhas)
            <input
              type="number"
              value={offset}
              onChange={(e) => setOffset(e.target.value)}
              className="mt-1 w-full rounded border px-2 py-1"
            />
          </label>
        </div>
        <label className="flex gap-2 text-sm">
          <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
          Simular (dry-run)
        </label>
        <label className="flex gap-2 text-sm">
          <input type="checkbox" checked={noAi} onChange={(e) => setNoAi(e.target.checked)} />
          Sem IA (rápido, metadados do CSV + padrão)
        </label>
        <button
          type="submit"
          disabled={status === 'loading' || !file}
          className="w-full rounded-md bg-blue-600 py-2 text-sm text-white disabled:opacity-50"
        >
          {status === 'loading' ? 'Processando…' : 'Importar'}
        </button>
      </form>

      {result && (
        <p className={`mt-4 text-sm ${status === 'error' ? 'text-red-600' : 'text-green-700'}`}>{result}</p>
      )}
    </main>
  );
}
