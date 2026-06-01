import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { shardForSlug } from '@/lib/enrichment/enrichFrase';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const key = slug.toLowerCase();
  const shard = shardForSlug(key);
  const file = path.join(process.cwd(), 'public', 'frases-v2', 'detail', `shard-${shard}.json`);

  if (!fs.existsSync(file)) {
    return NextResponse.json({ error: 'Shard não encontrado' }, { status: 404 });
  }

  const arr = JSON.parse(fs.readFileSync(file, 'utf8')) as { slug: string }[];
  const frase = arr.find((f) => f.slug.toLowerCase() === key);
  if (!frase) return NextResponse.json({ error: 'Frase não encontrada' }, { status: 404 });

  return NextResponse.json(frase);
}
