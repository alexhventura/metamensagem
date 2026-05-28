import { NextRequest, NextResponse } from 'next/server';
import { getFrasesFiltered } from '@/lib/loadFrases';

export const revalidate = 3600;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const categoria = searchParams.get('categoria') ?? undefined;
  const contexto = searchParams.get('contexto') ?? undefined;
  const autor = searchParams.get('autor') ?? undefined;
  const search = searchParams.get('search') ?? undefined;

  const frases = getFrasesFiltered({ categoria, contexto, autor, search });

  return NextResponse.json(
    {
      total: frases.length,
      filters: { categoria, contexto, autor, search },
      data: frases,
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    }
  );
}
