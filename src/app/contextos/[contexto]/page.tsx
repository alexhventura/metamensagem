import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { absoluteUrl } from '@/lib/seo/url';
import {
  getContextoMeta,
  getContextos,
  getFrasesFiltered,
} from '@/lib/loadFrases';

export const revalidate = 3600;

type Props = { params: Promise<{ contexto: string }> };

export async function generateStaticParams() {
  return getContextos().map((c) => ({ contexto: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { contexto } = await params;
  const meta = getContextoMeta(contexto);
  if (!meta) return { title: 'Contexto não encontrado' };

  return {
    title: `Frases sobre ${meta.nome}`,
    description: meta.descricao,
    alternates: {
      canonical: absoluteUrl(`/contextos/${meta.slug}`),
    },
  };
}

export default async function ContextoPage({ params }: Props) {
  const { contexto } = await params;
  const meta = getContextoMeta(contexto);
  if (!meta) notFound();

  const frases = getFrasesFiltered({ contexto: meta.slug });

  return (
    <main className="container">
      <p className="muted">
        <Link href="/">Início</Link>
      </p>
      <h1>Frases sobre {meta.nome}</h1>
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
