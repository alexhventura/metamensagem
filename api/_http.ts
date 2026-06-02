/** Resposta JSON no runtime Node da Vercel (sem Web Response). */
import { requestUrl } from './_shared.js';

export { requestUrl };

export function sendJson(
  res: { writeHead: (code: number, headers?: Record<string, string>) => void; end: (body?: string) => void },
  status: number,
  data: unknown,
  headers: Record<string, string> = {}
): void {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    ...headers,
  });
  res.end(JSON.stringify(data));
}

export function sendText(
  res: { writeHead: (code: number, headers?: Record<string, string>) => void; end: (body?: string) => void },
  status: number,
  body: string,
  headers: Record<string, string> = {}
): void {
  res.writeHead(status, headers);
  res.end(body);
}
