import { NextRequest, NextResponse } from 'next/server';
import { runCiteiImportPipeline } from '@/lib/importers/citei/citeiImportPipeline';

export const maxDuration = 600;
export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await runCiteiImportPipeline({ discoverOnly: true });
  return NextResponse.json({ discovery: result.discovery });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      quotesFile?: string;
      limit?: number;
      offset?: number;
      dryRun?: boolean;
      noAi?: boolean;
      apiUrl?: string;
    };

    const result = await runCiteiImportPipeline({
      quotesFile: body.quotesFile,
      apiBaseUrl: body.apiUrl,
      limit: body.limit,
      offset: body.offset ?? 0,
      dryRun: body.dryRun === true,
      withAi: body.noAi !== true,
      rebuild: body.dryRun !== true,
    });

    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro desconhecido';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
