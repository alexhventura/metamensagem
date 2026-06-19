import { useMemo } from 'react';
import {
  Download,
  Copy,
  Loader2,
  Smartphone,
  MessageCircle,
  Twitter,
  Facebook,
} from 'lucide-react';
import type { ImageGeneratorQuote } from './types';
import { buildSocialShareLinks, canShareImageFiles } from './utils/shareLinks';

const PinterestIcon = () => (
  <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="currentColor" aria-hidden>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146 1.124.347 2.317.535 3.554.535 6.627 0 12-5.373 12-12S18.627 0 12 0z" />
  </svg>
);

export type ShareBusy = 'png' | 'jpeg' | 'copy' | 'mobile' | null;

export default function ShareActionBar({
  tema,
  quote,
  busy,
  supportsFileShare,
  onMobileShare,
  onDownloadPng,
  onDownloadJpg,
  onCopy,
}: {
  tema: string;
  quote: ImageGeneratorQuote;
  busy: ShareBusy;
  supportsFileShare: boolean;
  onMobileShare: () => void;
  onDownloadPng: () => void;
  onDownloadJpg: () => void;
  onCopy: () => void;
}) {
  const links = useMemo(() => buildSocialShareLinks(quote, quote.locale ?? 'pt'), [quote]);

  const openLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const border = tema === 'light' ? 'border-zinc-100' : 'border-zinc-700/80';
  const btnSecondary =
    tema === 'light'
      ? 'border-zinc-200 bg-white hover:border-[#A855F7] hover:text-[#A855F7]'
      : 'border-zinc-700 bg-zinc-900/50 hover:border-[#A855F7] hover:text-[#A855F7]';

  return (
    <div className={`shrink-0 p-4 border-t space-y-3 ${border}`}>
      {supportsFileShare ? (
        <button
          type="button"
          disabled={!!busy}
          onClick={onMobileShare}
          className="w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-[#7C3AED] via-[#A855F7] to-[#D946EF] text-white font-bold text-sm shadow-lg shadow-purple-500/25 hover:opacity-95 disabled:opacity-50 transition-all"
        >
          {busy === 'mobile' ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Smartphone size={20} />
          )}
          Compartilhar
        </button>
      ) : (
        <p className={`text-[10px] text-center font-medium ${tema === 'light' ? 'text-zinc-500' : 'text-zinc-400'}`}>
          Escolha uma rede ou baixe a imagem para compartilhar
        </p>
      )}

      {!supportsFileShare && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            disabled={!!busy}
            onClick={() => openLink(links.whatsapp)}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 text-xs font-bold transition-colors ${btnSecondary}`}
          >
            <MessageCircle size={16} className="text-green-500" />
            WhatsApp
          </button>
          <button
            type="button"
            disabled={!!busy}
            onClick={() => openLink(links.pinterest)}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 text-xs font-bold transition-colors ${btnSecondary}`}
          >
            <PinterestIcon />
            Pinterest
          </button>
          <button
            type="button"
            disabled={!!busy}
            onClick={() => openLink(links.twitter)}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 text-xs font-bold transition-colors ${btnSecondary}`}
          >
            <Twitter size={16} />
            X
          </button>
          <button
            type="button"
            disabled={!!busy}
            onClick={() => openLink(links.facebook)}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border-2 text-xs font-bold transition-colors ${btnSecondary}`}
          >
            <Facebook size={16} className="text-blue-500" />
            Facebook
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!!busy}
          onClick={onDownloadPng}
          className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-bold text-xs border-2 disabled:opacity-50 transition-colors ${
            tema === 'light' ? 'border-zinc-200 hover:border-[#A855F7]' : 'border-zinc-700 hover:border-[#A855F7]'
          }`}
        >
          {busy === 'png' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          PNG
        </button>
        <button
          type="button"
          disabled={!!busy}
          onClick={onDownloadJpg}
          className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-bold text-xs border-2 disabled:opacity-50 transition-colors ${
            tema === 'light' ? 'border-zinc-200 hover:border-[#A855F7]' : 'border-zinc-700 hover:border-[#A855F7]'
          }`}
        >
          {busy === 'jpeg' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          JPG
        </button>
        <button
          type="button"
          disabled={!!busy}
          onClick={onCopy}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 text-xs font-bold disabled:opacity-50 transition-colors ${btnSecondary}`}
          title="Copiar imagem"
        >
          {busy === 'copy' ? <Loader2 size={16} className="animate-spin" /> : <Copy size={16} />}
          Copiar
        </button>
      </div>
    </div>
  );
}

export { canShareImageFiles };
