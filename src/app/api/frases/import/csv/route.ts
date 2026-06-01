import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { runCsvImportPipeline } from '@/lib/importers/csvImportPipeline';

export const maxDuration = 600;
export const dynamic = 'force-dynamic';

/** @deprecated Prefira POST /api/import-csv */
export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get('file');
    const dryRun = form.get('dryRun') === 'true';
    const noAi = form.get('noAi') === 'true';
    const limit = parseInt(String(form.get('limit') || '0'), 10) || 0;
    const offset = parseInt(String(form.get('offset') || '0'), 10) || 0;

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ ok: false, error: 'Envie um arquivo CSV no campo "file".' }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const importDir = path.join(process.cwd(), 'data', 'import', 'uploads');
    await mkdir(importDir, { recursive: true });
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const savedPath = path.join(importDir, `${Date.now()}-${safeName}`);
    await writeFile(savedPath, buf);

    const result = await runCsvImportPipeline({
      filePath: savedPath,
      limit: limit || undefined,
      offset,
      dryRun,
      withAi: !noAi,
      rebuild: !dryRun,
    });

    return NextResponse.json({ ok: true, file: safeName, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro desconhecido';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
