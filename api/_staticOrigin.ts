/** Origem de assets estáticos no runtime serverless (Vercel). */
export function serverStaticOrigin(fallbackOrigin: string): string {
  const fromEnv = process.env.FRASES_STATIC_ORIGIN?.trim().replace(/\/$/, '');
  return fromEnv || fallbackOrigin.replace(/\/$/, '');
}
