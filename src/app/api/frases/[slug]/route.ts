import { NextRequest, NextResponse } from 'next/server';
import { getFraseBySlug } from '@/lib/loadFrases';

export const dynamic = 'force-static';
export const revalidate = 3600;

type Params = { params: Promise<{ slug: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { slug } = await params;
  const frase = getFraseBySlug(slug);

  if (!frase) {
    return NextResponse.json({ error: 'Frase não encontrada' }, { status: 404 });
  }

  return NextResponse.json(
    { data: frase },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    }
  );
}
