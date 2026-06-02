import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Star } from 'lucide-react';
import ImageRenderer from './ImageRenderer';
import ImageFormatSelector from './ImageFormatSelector';
import CollectionSelector from './CollectionSelector';
import SkinSelector from './SkinSelector';
import ShareActionBar, { type ShareBusy } from './ShareActionBar';
import { FORMATS, DEFAULT_FORMAT } from './formats';
import { findCollection, findSkin } from './skins/data';
import type { ImageFormat, ImageGeneratorQuote } from './types';
import { recommendSkinForQuote } from './utils/recommendSkin';
import { canShareImageFiles } from './utils/shareLinks';
import {
  captureElementAsBlob,
  copyBlobToClipboard,
  downloadBlob,
  shareImageFile,
} from './exportImage';
import { ensureImageExportFonts } from './utils/imageFonts';
import { allocateImageSerial, previewSerialForQuote } from './utils/serialGenerator';
import { recordImageGeneration } from './utils/imageMetadata';

async function waitNextPaint(): Promise<void> {
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

export interface ImageGeneratorModalProps {
  open: boolean;
  onClose: () => void;
  quote: ImageGeneratorQuote;
  tema: string;
  toast: (msg: string, tipo?: 'sucesso' | 'info' | 'erro') => void;
}

export default function ImageGeneratorModal({
  open,
  onClose,
  quote,
  tema,
  toast,
}: ImageGeneratorModalProps) {
  const exportRef = useRef<HTMLDivElement>(null);
  const recommendation = useMemo(() => recommendSkinForQuote(quote), [quote]);

  const [format, setFormat] = useState<ImageFormat>(DEFAULT_FORMAT);
  const [collectionId, setCollectionId] = useState(recommendation.collectionId);
  const [skinId, setSkinId] = useState(recommendation.skinId);
  const [busy, setBusy] = useState<ShareBusy>(null);
  const previewSerial = useMemo(() => previewSerialForQuote(quote.id), [quote.id]);
  const [exportSerial, setExportSerial] = useState(previewSerial);

  const supportsFileShare = useMemo(() => canShareImageFiles(), []);
  const fontSample = useMemo(
    () => ({ text: quote.texto, autor: quote.autor }),
    [quote.texto, quote.autor]
  );

  useEffect(() => {
    if (!open) return;
    void ensureImageExportFonts(quote.texto, quote.autor);
  }, [open, quote.texto, quote.autor]);

  useEffect(() => {
    if (!open) return;
    setFormat(DEFAULT_FORMAT);
    setCollectionId(recommendation.collectionId);
    setSkinId(recommendation.skinId);
  }, [open, quote.id, recommendation.collectionId, recommendation.skinId]);

  const formatCfg = FORMATS[format];
  const skin = useMemo(() => findSkin(collectionId, skinId), [collectionId, skinId]);
  const collection = useMemo(() => findCollection(collectionId), [collectionId]);

  const isOnRecommendation =
    recommendation.matched &&
    collectionId === recommendation.collectionId &&
    skinId === recommendation.skinId;

  const previewScale = useMemo(() => {
    const maxW = 380;
    const maxH = 420;
    return Math.min(1, maxW / formatCfg.width, maxH / formatCfg.height);
  }, [formatCfg]);

  const handleCollectionChange = (id: string) => {
    setCollectionId(id);
    const col = findCollection(id);
    if (!col.skins.some((s) => s.id === skinId)) {
      setSkinId(col.skins[0].id);
    }
  };

  const registerExport = useCallback(
    (serial: string) => {
      recordImageGeneration({
        phraseId: quote.id,
        category: quote.categoria,
        collectionId,
        skinId,
        skinName: skin.name,
        locale: quote.locale,
        format,
        serial,
        generatedAt: new Date().toISOString(),
      });
    },
    [quote.id, quote.categoria, quote.locale, collectionId, skinId, skin.name, format]
  );

  const runExport = useCallback(
    async (mime: 'image/png' | 'image/jpeg') => {
      const node = exportRef.current;
      if (!node) return;
      setBusy(mime === 'image/png' ? 'png' : 'jpeg');

      const ext = mime === 'image/png' ? 'png' : 'jpg';

      try {
        const serial = allocateImageSerial();
        flushSync(() => setExportSerial(serial));
        node.setAttribute('data-mm-width', String(formatCfg.width));
        node.setAttribute('data-mm-height', String(formatCfg.height));
        await waitNextPaint();
        await waitNextPaint();

        const blob = await captureElementAsBlob(node, mime, fontSample);
        registerExport(serial);
        const filename = `metamensagem-${serial}.${ext}`;
        downloadBlob(blob, filename);
        toast('Imagem baixada!', 'sucesso');
      } catch (e) {
        const msg =
          e instanceof Error
            ? e.message
            : 'Não foi possível gerar a imagem.';
        if (typeof window !== 'undefined') {
          (window as Window & { __mmLastExportError?: string }).__mmLastExportError = msg;
        }
        toast(msg, 'erro');
      } finally {
        setBusy(null);
      }
    },
    [fontSample, formatCfg.width, formatCfg.height, registerExport, toast]
  );

  const handleCopy = useCallback(async () => {
    const node = exportRef.current;
    if (!node) return;
    setBusy('copy');
    try {
      const serial = allocateImageSerial();
      flushSync(() => setExportSerial(serial));
      await waitNextPaint();
      await waitNextPaint();
      const blob = await captureElementAsBlob(node, 'image/png', fontSample);
      registerExport(serial);
      const ok = await copyBlobToClipboard(blob);
      toast(
        ok ? 'Copiado para a área de transferência!' : 'Seu navegador não suporta copiar imagem.',
        ok ? 'sucesso' : 'info'
      );
    } catch {
      toast('Falha ao copiar.', 'erro');
    } finally {
      setBusy(null);
    }
  }, [fontSample, registerExport, toast]);

  const handleMobileShare = useCallback(async () => {
    const node = exportRef.current;
    if (!node) return;
    setBusy('mobile');
    try {
      const serial = allocateImageSerial();
      flushSync(() => setExportSerial(serial));
      await waitNextPaint();
      await waitNextPaint();
      const blob = await captureElementAsBlob(node, 'image/png', fontSample);
      registerExport(serial);
      const ok = await shareImageFile(blob, {
        title: 'Metamensagem',
        text: quote.texto.slice(0, 120),
      });
      if (!ok) {
        toast('Compartilhamento cancelado ou indisponível.', 'info');
      }
    } catch {
      toast('Não foi possível compartilhar a imagem.', 'erro');
    } finally {
      setBusy(null);
    }
  }, [fontSample, quote.texto, registerExport, toast]);

  useEffect(() => {
    if (open) setExportSerial(previewSerial);
  }, [open, previewSerial]);

  if (!open) return null;

  const quoteMeta = {
    id: quote.id,
    categoria: quote.categoria,
    locale: quote.locale,
  };

  const rendererBase = {
    texto: quote.texto,
    autor: quote.autor,
    format: formatCfg,
    skin,
    collectionName: collection.name,
    quoteMeta,
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[250] flex items-center justify-center p-4 md:p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-gen-title"
      >
        <button
          type="button"
          className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          onClick={onClose}
          aria-label="Fechar"
        />

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          className={`relative w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-[2rem] border shadow-2xl flex flex-col ${
            tema === 'light' ? 'bg-white border-zinc-200' : 'bg-[#0a0a0a] border-zinc-800'
          }`}
        >
          <header
            className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${
              tema === 'light' ? 'border-zinc-100' : 'border-zinc-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#A855F7]/20 text-[#A855F7]">
                <Sparkles size={20} />
              </span>
              <div>
                <h2 id="image-gen-title" className="text-lg font-black tracking-tight">
                  Gerar imagem
                </h2>
                <p className={`text-xs ${tema === 'light' ? 'text-zinc-500' : 'text-zinc-500'}`}>
                  {collection.emoji} {collection.name} · {skin.name} · {formatCfg.label}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`p-2.5 rounded-xl border transition-colors ${
                tema === 'light' ? 'border-zinc-200 hover:bg-zinc-100' : 'border-zinc-800 hover:bg-zinc-900'
              }`}
            >
              <X size={20} />
            </button>
          </header>

          <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">
            <aside
              className={`lg:w-[42%] p-5 overflow-y-auto border-b lg:border-b-0 lg:border-r space-y-5 ${
                tema === 'light' ? 'border-zinc-100 bg-zinc-50/50' : 'border-zinc-900 bg-zinc-950/50'
              }`}
            >
              <section>
                <h3 className="text-[10px] font-black uppercase tracking-[0.35em] text-[#A855F7] mb-3">
                  Formato
                </h3>
                <ImageFormatSelector value={format} onChange={setFormat} tema={tema} />
              </section>
              <section>
                <h3 className="text-[10px] font-black uppercase tracking-[0.35em] text-[#A855F7] mb-1">
                  Coleção & skin
                </h3>
                <p
                  className={`text-[10px] mb-3 leading-snug ${
                    tema === 'light' ? 'text-zinc-500' : 'text-zinc-500'
                  }`}
                >
                  Escolha o estilo visual. O texto da frase é sempre exibido por completo.
                </p>
                <CollectionSelector value={collectionId} onChange={handleCollectionChange} tema={tema} />
              </section>
              <section>
                <h3 className="text-[10px] font-black uppercase tracking-[0.35em] text-[#A855F7] mb-3">
                  Variação
                </h3>
                <SkinSelector
                  collectionId={collectionId}
                  value={skinId}
                  recommendedSkinId={
                    recommendation.matched && collectionId === recommendation.collectionId
                      ? recommendation.skinId
                      : undefined
                  }
                  onChange={setSkinId}
                />
              </section>
            </aside>

            <div className="flex-1 flex flex-col min-h-[280px] lg:min-h-0">
              <div className="relative flex-1 flex flex-col items-center justify-center p-4 overflow-auto bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.08),transparent_70%)]">
                {isOnRecommendation && (
                  <div
                    className={`absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold shadow-lg ${
                      tema === 'light'
                        ? 'bg-amber-50 text-amber-900 border border-amber-200/80'
                        : 'bg-amber-500/15 text-amber-100 border border-amber-400/30'
                    }`}
                  >
                    <Star size={12} className="fill-amber-400 text-amber-400 shrink-0" />
                    Recomendado para esta frase
                  </div>
                )}

                <div
                  className="relative"
                  style={{
                    width: formatCfg.width * previewScale,
                    height: formatCfg.height * previewScale,
                  }}
                >
                  <div
                    style={{
                      transform: `scale(${previewScale})`,
                      transformOrigin: 'top left',
                      width: formatCfg.width,
                      height: formatCfg.height,
                    }}
                  >
                    <ImageRenderer ref={exportRef} {...rendererBase} serial={exportSerial} />
                  </div>
                </div>
              </div>

              <ShareActionBar
                tema={tema}
                quote={quote}
                busy={busy}
                supportsFileShare={supportsFileShare}
                onMobileShare={() => void handleMobileShare()}
                onDownloadPng={() => void runExport('image/png')}
                onDownloadJpg={() => void runExport('image/jpeg')}
                onCopy={() => void handleCopy()}
              />
            </div>
          </div>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
