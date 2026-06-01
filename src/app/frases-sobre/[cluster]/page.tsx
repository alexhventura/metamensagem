import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import fs from 'fs';
import path from 'path';
import { absoluteUrl } from '@/lib/seo/url';
import type { ClusterPagePack } from '../../../../lib/seo/phase3/types';

export const revalidate = 86400;

type Props = { params: Promise<{ cluster: string }> };

function loadCluster(slug: string): ClusterPagePack | null {
  const p = path.join(process.cwd(), 'public', 'seo-graph', 'pages', 'clusters', `${slug}.json`);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8')) as ClusterPagePack;
}

export async function generateStaticParams() {
  const dir = path.join(process.cwd(), 'public', 'seo-graph', 'pages', 'clusters');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).map((f) => ({ cluster: f.replace('.json', '') }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { cluster } = await params;
  const page = loadCluster(cluster);
  if (!page) return { title: 'Tópico não encontrado' };
  return {
    title: page.titleSeo,
    description: page.descriptionSeo,
    alternates: { canonical: absoluteUrl(page.path) },
    openGraph: {
      title: page.openGraph.title,
      description: page.openGraph.description,
      type: 'website',
      url: page.openGraph.url,
    },
    twitter: {
      card: 'summary_large_image',
      title: page.twitterCard.title,
      description: page.twitterCard.description,
    },
  };
}

export default async function FrasesSobrePage({ params }: Props) {
  const { cluster } = await params;
  const page = loadCluster(cluster);
  if (!page) notFound();

  return (
    <main className="container">
      <p className="muted">
        <Link href="/">Início</Link> / <Link href="/frases">Frases</Link>
      </p>
      <h1>{page.clusterTitle}</h1>
      <p className="muted">{page.introText}</p>
      <p className="muted">{page.entityCount ?? 0} frases neste cluster</p>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(page.jsonLd) }}
      />
    </main>
  );
}
