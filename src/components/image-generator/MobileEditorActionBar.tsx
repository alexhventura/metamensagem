import { Download, Eye, Loader2, RotateCcw, Share2 } from 'lucide-react';
import type { ShareBusy } from './ShareActionBar';

export default function MobileEditorActionBar({
  busy,
  supportsShare,
  onVisualize,
  onRestore,
  onDownload,
  onShare,
  tema,
}: {
  busy: ShareBusy;
  supportsShare: boolean;
  onVisualize: () => void;
  onRestore: () => void;
  onDownload: () => void;
  onShare: () => void;
  tema: string;
}) {
  const btn =
    tema === 'light'
      ? 'text-zinc-700 hover:bg-zinc-100'
      : 'text-zinc-200 hover:bg-zinc-900';

  return (
    <div
      className={`mm-editor-mobile-bar shrink-0 ${
        tema === 'light' ? 'border-t border-zinc-100 bg-white/95' : 'border-t border-zinc-900 bg-[#0a0a0a]/95'
      }`}
      role="toolbar"
      aria-label="Ações do editor"
    >
      <button type="button" onClick={onVisualize} className={`mm-editor-mobile-bar-btn ${btn}`}>
        <Eye size={18} aria-hidden />
        <span>Visualizar</span>
      </button>
      <button type="button" onClick={onRestore} className={`mm-editor-mobile-bar-btn ${btn}`}>
        <RotateCcw size={18} aria-hidden />
        <span>Restaurar</span>
      </button>
      <button
        type="button"
        disabled={!!busy}
        onClick={onDownload}
        className={`mm-editor-mobile-bar-btn ${btn} disabled:opacity-50`}
      >
        {busy === 'png' || busy === 'jpeg' ? (
          <Loader2 size={18} className="animate-spin" aria-hidden />
        ) : (
          <Download size={18} aria-hidden />
        )}
        <span>Baixar</span>
      </button>
      <button
        type="button"
        disabled={!!busy || !supportsShare}
        onClick={onShare}
        className={`mm-editor-mobile-bar-btn ${btn} disabled:opacity-50`}
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
