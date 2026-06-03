/** Resposta JSON no runtime Node da Vercel (sem Web Response). */
import { type ApiRequest, requestUrl } from './_shared.js';

export { requestUrl };
export type { ApiRequest };

export type ApiResponse = {
  writeHead: (code: number, headers?: Record<string, string>) => void;
  end: (body?: string | Buffer) => void;
};

export function sendJson(
  res: ApiResponse,
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
  res: ApiResponse,
  status: number,
  body: string,
  headers: Record<string, string> = {}
): void {
  res.writeHead(status, headers);
  res.end(body);
}
