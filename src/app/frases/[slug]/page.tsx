import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { absoluteUrl } from '@/lib/seo/url';
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
    `Frase de ${frase.autor_original}${frase.ano_ou_data ? ` (${frase.ano_ou_data})` : ''}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      url: absoluteUrl(`/frases/${frase.slug}`),
    },
    alternates: {
      canonical: absoluteUrl(`/frases/${frase.slug}`),
    },
  };
}

function MetaBlock({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="py-2 border-b border-zinc-800 last:border-0">
      <dt className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</dt>
      <dd className="text-sm text-zinc-300 mt-1">{value}</dd>
    </div>
  );
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
        <Link href="/frases">Frases</Link>
        {' · '}
        <Link href={`/categorias/${frase.categoria}`}>{frase.categoria}</Link>
      </p>

      <article className="card" style={{ marginTop: '1rem' }}>
        <blockquote style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, lineHeight: 1.35 }}>
          &ldquo;{frase.frase_original}&rdquo;
        </blockquote>
        <p style={{ marginTop: '1.25rem', fontSize: '1.1rem' }}>
          — <Link href={`/autores/${frase.autor_slug}`}>{frase.autor_original}</Link>
        </p>

        {frase.explicacao ? (
          <section style={{ marginTop: '1.5rem' }}>
            <h2 style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.2em', color: '#a855f7' }}>
              Explicação
            </h2>
            <p className="muted" style={{ marginTop: '0.5rem' }}>
              {frase.explicacao}
            </p>
          </section>
        ) : null}

        <div style={{ marginTop: '1.25rem' }}>
          <span className="tag">{frase.categoria}</span>
          {frase.contextos.map((c) => (
            <Link key={c} href={`/contextos/${c}`} className="tag">
              {c}
            </Link>
          ))}
        </div>

        <dl style={{ marginTop: '1.5rem' }}>
          <MetaBlock label="Ano ou data" value={frase.ano_ou_data} />
          <MetaBlock label="Nacionalidade" value={frase.nacionalidade} />
          <MetaBlock label="Nascimento / falecimento" value={frase.nascimento_falecimento} />
          <MetaBlock label="Tipo de autor" value={frase.autor_tipo} />
          <MetaBlock label="Fontes" value={frase.fontes} />
          <MetaBlock label="Observação" value={frase.observacao} />
          {frase.palavras_chave.length > 0 && (
            <MetaBlock label="Palavras-chave" value={frase.palavras_chave.join(', ')} />
          )}
          <MetaBlock label="Última atualização" value={frase.informacoes.ultima_atualizacao} />
          <MetaBlock label="Confiabilidade" value={frase.informacoes.confiabilidade} />
        </dl>
      </article>
    </main>
  );
}
