import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { absoluteUrl } from '@/lib/seo/url';
import { getAutorMeta, getAutores, getFrasesFiltered } from '@/lib/loadFrases';

export const revalidate = 3600;

type Props = { params: Promise<{ autor: string }> };

export async function generateStaticParams() {
  return getAutores().map((a) => ({ autor: a.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { autor } = await params;
  const meta = getAutorMeta(autor);
  if (!meta) return { title: 'Autor não encontrado' };

  return {
    title: `Frases de ${meta.nome}`,
    description: `Coleção de frases e mensagens de ${meta.nome} no Metamensagem.`,
    alternates: {
      canonical: absoluteUrl(`/autores/${meta.slug}`),
    },
  };
}

export default async function AutorPage({ params }: Props) {
  const { autor } = await params;
  const meta = getAutorMeta(autor);
  if (!meta) notFound();

  const frases = getFrasesFiltered({ autor: meta.slug });

  return (
    <main className="container">
      <p className="muted">
        <Link href="/">Início</Link>
      </p>
      <h1>Frases de {meta.nome}</h1>
      <p className="muted">{frases.length} frases</p>

      <section style={{ marginTop: '1.5rem' }}>
        {frases.map((f) => (
          <article key={f.id} className="card">
            <Link href={`/frases/${f.slug}`}>
              <p style={{ margin: 0, fontWeight: 600 }}>&ldquo;{f.frase_original}&rdquo;</p>
            </Link>
            <span className="tag">{f.categoria}</span>
          </article>
        ))}
      </section>
    </main>
  );
}
