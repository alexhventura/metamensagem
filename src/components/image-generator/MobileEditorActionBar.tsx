import { Download, Loader2, RotateCcw, Share2 } from 'lucide-react';
import type { ShareBusy } from './ShareActionBar';

export default function MobileEditorActionBar({
  busy,
  supportsShare,
  onRestore,
  onDownload,
  onShare,
  tema,
}: {
  busy: ShareBusy;
  supportsShare: boolean;
  onRestore: () => void;
  onDownload: () => void;
  onShare: () => void;
  tema: string;
}) {
  const secondary =
    tema === 'light'
      ? 'text-zinc-600 bg-zinc-100 border-zinc-200'
      : 'text-zinc-300 bg-zinc-800/90 border-zinc-600';

  const downloading = busy === 'png' || busy === 'jpeg';

  return (
    <div
      className={`mm-editor-mobile-bar shrink-0 ${
        tema === 'light' ? 'border-t border-zinc-100 bg-white/95' : 'border-t border-zinc-700/80 bg-[#141210]/95'
      }`}
      role="toolbar"
      aria-label="Ações do editor"
    >
      <button
        type="button"
        onClick={onRestore}
        className={`mm-editor-mobile-bar-btn mm-editor-mobile-bar-secondary ${secondary}`}
        aria-label="Restaurar configurações"
      >
        <RotateCcw size={18} aria-hidden />
        <span>Restaurar</span>
      </button>

      <button
        type="button"
        disabled={!!busy}
        onClick={onDownload}
        className="mm-editor-mobile-bar-btn mm-editor-mobile-bar-primary disabled:opacity-50"
        aria-label="Baixar imagem"
      >
        {downloading ? (
          <Loader2 size={22} className="animate-spin" aria-hidden />
        ) : (
          <Download size={22} aria-hidden />
        )}
        <span>Baixar imagem</span>
      </button>

      <button
        type="button"
        disabled={!!busy || !supportsShare}
        onClick={onShare}
        className={`mm-editor-mobile-bar-btn mm-editor-mobile-bar-secondary ${secondary} disabled:opacity-50`}
        aria-label="Compartilhar imagem"
      >
        {busy === 'mobile' ? (
          <Loader2 size={18} className="animate-spin" aria-hidden />
        ) : (
          <Share2 size={18} aria-hidden />
        )}
        <span>Compartilhar</span>
      </button>
    </div>
  );
}
