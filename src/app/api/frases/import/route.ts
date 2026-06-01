import { NextRequest, NextResponse } from 'next/server';
import { runQuoteImportPipeline } from '@/lib/api/quoteImportPipeline';
import type { QuoteSourceId } from '@/lib/api/quoteFetch';
import { loadCuradoriaApiKey } from '@/lib/secrets/loadCuradoriaApiKey';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const VALID_SOURCES: QuoteSourceId[] = ['dummyjson', 'zenquotes', 'wikiquote', 'quotable', 'ninjas'];

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      sources?: string[];
      limit?: number;
      limitPerSource?: number;
      dryRun?: boolean;
      rebuild?: boolean;
      quotes?: { quote: string; author: string; tags?: string[] }[];
    };

    const sources = (body.sources || ['wikiquote', 'dummyjson', 'zenquotes', 'quotable']).filter(
      (s): s is QuoteSourceId => VALID_SOURCES.includes(s as QuoteSourceId)
    );

    const maxTotal = Math.min(Math.max(body.limit ?? 30, 1), 100);

    const result = await runQuoteImportPipeline({
      sources: sources.length ? sources : undefined,
      maxTotal,
      limitPerSource: body.limitPerSource,
      dryRun: body.dryRun === true,
      rebuild: body.rebuild !== false,
      manualQuotes: body.quotes,
      aiApiKey: loadCuradoriaApiKey(),
    });

    return NextResponse.json({
      ok: true,
      message: 'Pipeline de importação concluído',
      ...result,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro desconhecido';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
