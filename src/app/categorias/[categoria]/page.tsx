import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { absoluteUrl } from '@/lib/seo/url';
import { getCategoriaMeta, getCategorias, getFrasesFiltered } from '@/lib/loadFrases';

export const revalidate = 3600;

type Props = { params: Promise<{ categoria: string }> };

export async function generateStaticParams() {
  return getCategorias().map((c) => ({ categoria: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categoria } = await params;
  const meta = getCategoriaMeta(categoria);
  if (!meta) return { title: 'Categoria não encontrada' };

  return {
    title: `Frases de ${meta.nome}`,
    description: meta.descricao,
    alternates: {
      canonical: absoluteUrl(`/categorias/${meta.slug}`),
    },
  };
}

export default async function CategoriaPage({ params }: Props) {
  const { categoria } = await params;
  const meta = getCategoriaMeta(categoria);
  if (!meta) notFound();

  const frases = getFrasesFiltered({ categoria: meta.slug });

  return (
    <main className="container">
      <p className="muted">
        <Link href="/">Início</Link>
      </p>
      <h1>Frases de {meta.nome}</h1>
      <p className="muted">{meta.descricao}</p>
      <p className="muted">{frases.length} frases</p>

      <section style={{ marginTop: '1.5rem' }}>
        {frases.map((f) => (
          <article key={f.id} className="card">
            <Link href={`/frases/${f.slug}`}>
              <p style={{ margin: 0, fontWeight: 600 }}>&ldquo;{f.frase_original}&rdquo;</p>
            </Link>
            <p className="muted" style={{ marginTop: '0.5rem' }}>
              {f.autor_original}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
