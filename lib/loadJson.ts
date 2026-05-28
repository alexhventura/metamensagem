import fs from 'fs';
import path from 'path';

const contentRoot = path.join(process.cwd(), 'content');

/** Lê JSON de /content/{folder}/{file}.json com cache em memória (dev + build). */
const fileCache = new Map<string, unknown>();

export function loadJson<T>(folder: string, file: string): T {
  const key = `${folder}/${file}`;
  if (fileCache.has(key)) {
    return fileCache.get(key) as T;
  }

  const filePath = path.join(contentRoot, folder, `${file}.json`);
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw) as T;
  fileCache.set(key, data);
  return data;
}

export function clearJsonCache(): void {
  fileCache.clear();
}
