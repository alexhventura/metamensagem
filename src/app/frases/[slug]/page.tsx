import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllFrases, getFraseBySlug } from '@/lib/loadFrases';

export const revalidate = 3600;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return getAllFrases().map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const frase = getFraseBySlug(slug);
  if (!frase) return { title: 'Frase não encontrada' };

  const title = `"${frase.frase_original.slice(0, 60)}${frase.frase_original.length > 60 ? '…' : ''}"`;
  const description =
    frase.explicacao ||
    `Frase de ${frase.autor_original} — ${frase.categoria}. Metamensagem.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      url: `https://metamensagem.com/frases/${frase.slug}`,
    },
    alternates: {
      canonical: `https://metamensagem.com/frases/${frase.slug}`,
    },
  };
}

export default async function FrasePage({ params }: Props) {
  const { slug } = await params;
  const frase = getFraseBySlug(slug);
  if (!frase) notFound();

  return (
    <main className="container">
      <p className="muted">
        <Link href="/">Início</Link>
        {' · '}
        <Link href={`/categorias/${frase.categoria}`}>{frase.categoria}</Link>
      </p>

      <article className="card" style={{ marginTop: '1rem' }}>
        <blockquote style={{ fontSize: '1.35rem', fontWeight: 600, margin: 0 }}>
          &ldquo;{frase.frase_original}&rdquo;
        </blockquote>
        <p style={{ marginTop: '1rem' }}>
          —{' '}
          <Link href={`/autores/${frase.autor_slug}`}>{frase.autor_original}</Link>
        </p>
        {frase.explicacao ? <p className="muted">{frase.explicacao}</p> : null}
        <div style={{ marginTop: '1rem' }}>
          <span className="tag">{frase.categoria}</span>
          {frase.contextos.map((c) => (
            <Link key={c} href={`/contextos/${c}`} className="tag">
              {c}
            </Link>
          ))}
        </div>
      </article>
    </main>
  );
}
