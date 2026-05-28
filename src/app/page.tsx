import Link from 'next/link';
import { getAllFrases, getCategorias, getContextos } from '@/lib/loadFrases';

export const revalidate = 3600;

export default function HomePage() {
  const total = getAllFrases().length;
  const categorias = getCategorias().slice(0, 12);
  const contextos = getContextos().slice(0, 12);

  return (
    <main className="container">
      <h1>Metamensagem</h1>
      <p className="muted">CMS file-based · {total} frases · zero banco de dados</p>

      <section style={{ marginTop: '2rem' }}>
        <h2>Categorias</h2>
        <ul>
          {categorias.map((c) => (
            <li key={c.slug}>
              <Link href={`/categorias/${c.slug}`}>{c.nome}</Link>
              <span className="muted"> ({c.count})</span>
            </li>
          ))}
        </ul>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2>Contextos</h2>
        <ul>
          {contextos.map((c) => (
            <li key={c.slug}>
              <Link href={`/contextos/${c.slug}`}>{c.nome}</Link>
              <span className="muted"> ({c.count})</span>
            </li>
          ))}
        </ul>
      </section>

      <p style={{ marginTop: '2rem' }}>
        <Link href="/api/frases">API — todas as frases</Link>
      </p>
    </main>
  );
}
