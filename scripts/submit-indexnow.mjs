/**
 * Envia URLs do sitemap ao IndexNow (Bing/Yandex).
 * Requer INDEXNOW_KEY no ambiente e public/{key}.txt com o mesmo valor.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { absoluteUrl } from './lib/site-url.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOST = 'metamensagem.com';
const KEY = process.env.INDEXNOW_KEY?.trim();
const MAX_URLS = Number(process.env.INDEXNOW_MAX_URLS || 10_000);

function extractLocs(xml) {
  const locs = [];
  const re = /<loc>([^<]+)<\/loc>/g;
  let m;
  while ((m = re.exec(xml))) locs.push(m[1].trim());
  return locs;
}

async function main() {
  if (!KEY) {
    console.warn('INDEXNOW_KEY não definido — pulando IndexNow.');
    return;
  }

  const keyFile = path.join(ROOT, 'public', `${KEY}.txt`);
  if (!fs.existsSync(keyFile)) {
    fs.writeFileSync(keyFile, KEY, 'utf8');
    console.log('Criado', keyFile, '(faça deploy antes de submeter)');
  }

  const sitemapFiles = [
    path.join(ROOT, 'public', 'sitemap.xml'),
    path.join(ROOT, 'public', 'sitemap-index.xml'),
    path.join(ROOT, 'public', 'sitemap-en.xml'),
  ].filter((f) => fs.existsSync(f));

  const urls = new Set();
  for (const file of sitemapFiles) {
    const xml = fs.readFileSync(file, 'utf8');
    if (xml.includes('<sitemapindex')) {
      for (const loc of extractLocs(xml)) {
        if (loc.endsWith('.xml')) {
          try {
            const child = fs.readFileSync(
              path.join(ROOT, 'public', path.basename(new URL(loc).pathname)),
              'utf8'
            );
            extractLocs(child).forEach((u) => urls.add(u));
          } catch {
            /* remoto — ignorar */
          }
        }
      }
    } else {
      extractLocs(xml).forEach((u) => urls.add(u));
    }
  }

  if (!urls.size) {
    urls.add(absoluteUrl('/'));
    urls.add(absoluteUrl('/frases'));
  }

  const list = [...urls].slice(0, MAX_URLS);
  const body = {
    host: HOST,
    key: KEY,
    keyLocation: absoluteUrl(`/${KEY}.txt`),
    urlList: list,
  };

  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });

  if (res.ok || res.status === 202) {
    console.log('✅ IndexNow —', list.length, 'URLs enviadas');
    return;
  }
  const text = await res.text();
  console.error('IndexNow falhou', res.status, text);
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
