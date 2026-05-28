import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Metamensagem — Frases inspiradoras',
    template: '%s | Metamensagem',
  },
  description:
    'Frases inspiradoras e mensagens por categoria, contexto e autor. Conteúdo 100% file-based.',
  metadataBase: new URL('https://metamensagem.com'),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/theme-init.js" />
      </head>
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">{children}</body>
    </html>
  );
}
