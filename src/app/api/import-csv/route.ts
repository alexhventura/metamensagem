import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { runCsvImportPipeline } from '@/lib/importers/csvImportPipeline';

export const maxDuration = 600;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get('file');
    const dryRun = form.get('dryRun') === 'true';
    const noAi = form.get('noAi') === 'true';
    const limit = parseInt(String(form.get('limit') || '0'), 10) || 0;
    const offset = parseInt(String(form.get('offset') || '0'), 10) || 0;

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ ok: false, error: 'Envie o CSV no campo "file".' }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const dir = path.join(process.cwd(), 'data', 'import', 'uploads');
    await mkdir(dir, { recursive: true });
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const savedPath = path.join(dir, `${Date.now()}-${safe}`);
    await writeFile(savedPath, buf);

    const result = await runCsvImportPipeline({
      filePath: savedPath,
      limit: limit || undefined,
      offset,
      dryRun,
      withAi: !noAi,
      rebuild: !dryRun,
    });

    return NextResponse.json({ ok: true, file: safe, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro desconhecido';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
