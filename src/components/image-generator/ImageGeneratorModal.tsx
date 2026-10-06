import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { X, Sparkles, Star } from 'lucide-react';
import ImageRenderer from './ImageRenderer';
import ImageFormatSelector from './ImageFormatSelector';
import CollectionSelector from './CollectionSelector';
import SkinSelector from './SkinSelector';
import ShareActionBar, { type ShareBusy } from './ShareActionBar';
import MobileQuickStylePanel from './MobileQuickStylePanel';
import MobileEditorActionBar from './MobileEditorActionBar';
import { FORMATS, DEFAULT_FORMAT } from './formats';
import { findCollection, findSkin } from './skins/data';
import type { ImageFormat, ImageGeneratorQuote } from './types';
import { recommendSkinForQuote } from './utils/recommendSkin';
import { canShareImageFiles, canUseNativeShare, resolveQuoteCanonicalUrl } from './utils/shareLinks';
import {
  captureElementAsBlob,
  copyBlobToClipboard,
  downloadBlob,
  shareImageFile,
} from './exportImage';
import { ensureImageExportFonts, ensurePickerFontLoaded, ensurePickerFontsLoaded } from './utils/imageFonts';
import { DEFAULT_IMAGE_FONT_ID, imageFontFamilyForChoice, type ImageFontId } from './fonts';
import { DEFAULT_TEXT_COLOR, resolveTextColor, type TextColorChoice } from './colors';
import { allocateImageSerial, previewSerialForQuote } from './utils/serialGenerator';
import { recordImageGeneration } from './utils/imageMetadata';
import { useAppUiReset } from '../../hooks/useAppUiReset';
import { useImagePreviewScale } from './useImagePreviewScale';
import { usePreviewTouchGestures } from './usePreviewTouchGestures';
import { useMediaQuery } from '../../hooks/useMediaQuery';

async function waitNextPaint(): Promise<void> {
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

function getModalRoot(): HTMLElement {
  return document.getElementById('mm-modal-root') ?? document.body;
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
  const { t } = useTranslation();
  const exportRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [exportMounted, setExportMounted] = useState(false);
  const recommendation = useMemo(() => recommendSkinForQuote(quote), [quote]);
  const isMobile = useMediaQuery('(max-width: 1023px)');

  const [format, setFormat] = useState<ImageFormat>(DEFAULT_FORMAT);
  const [collectionId, setCollectionId] = useState(recommendation.collectionId);
  const [skinId, setSkinId] = useState(recommendation.skinId);
  const [busy, setBusy] = useState<ShareBusy>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [skinsReady, setSkinsReady] = useState(false);
  const [fontId, setFontId] = useState<ImageFontId>(DEFAULT_IMAGE_FONT_ID);
  const [textColor, setTextColor] = useState<TextColorChoice>(DEFAULT_TEXT_COLOR);
  const previewSerial = useMemo(() => previewSerialForQuote(quote.id), [quote.id]);
  const [exportSerial, setExportSerial] = useState(previewSerial);

  const supportsFileShare = useMemo(() => canShareImageFiles(), []);
  const supportsNativeShare = useMemo(() => canUseNativeShare(), []);
  const shareUrl = useMemo(
    () => resolveQuoteCanonicalUrl(quote, quote.locale ?? 'pt'),
    [quote]
  );
  const fontSample = useMemo(
    () => ({ text: quote.texto, autor: quote.autor, fontId }),
    [quote.texto, quote.autor, fontId]
  );
  const fontFamilyOverride = useMemo(
    () => imageFontFamilyForChoice(fontId, quote.texto, quote.autor),
    [fontId, quote.texto, quote.autor]
  );
  const textColorOverride = useMemo(() => resolveTextColor(textColor), [textColor]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useAppUiReset(handleClose);

  useEffect(() => {
    if (!open) {
      setExportMounted(false);
      setShareOpen(false);
      setSkinsReady(false);
      return;
    }
    const skinsTimer = window.setTimeout(() => setSkinsReady(true), 48);
    return () => window.clearTimeout(skinsTimer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      void ensureImageExportFonts(quote.texto, quote.autor);
      if (isMobile) void ensurePickerFontsLoaded(fontId);
    };
    const idle =
      typeof requestIdleCallback === 'function'
        ? requestIdleCallback(run, { timeout: 700 })
        : window.setTimeout(run, 180);
    return () => {
      cancelled = true;
      if (typeof idle === 'number' && typeof cancelIdleCallback === 'function') {
        cancelIdleCallback(idle);
      } else {
        window.clearTimeout(idle);
      }
    };
  }, [open, quote.texto, quote.autor, isMobile, fontId]);

  useEffect(() => {
    if (!open) return;
    document.body.classList.add('mm-modal-open');
    return () => {
      document.body.classList.remove('mm-modal-open');
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setFormat(DEFAULT_FORMAT);
    setCollectionId(recommendation.collectionId);
    setSkinId(recommendation.skinId);
    setFontId(DEFAULT_IMAGE_FONT_ID);
    setTextColor(DEFAULT_TEXT_COLOR);
  }, [open, quote.id, recommendation.collectionId, recommendation.skinId]);

  const formatCfg = FORMATS[format];
  const skin = useMemo(() => findSkin(collectionId, skinId), [collectionId, skinId]);
  const collection = useMemo(() => findCollection(collectionId), [collectionId]);

  const isOnRecommendation =
    recommendation.matched &&
    collectionId === recommendation.collectionId &&
    skinId === recommendation.skinId;

  const previewScale = useImagePreviewScale(formatCfg.width, formatCfg.height, open, {
    containerRef: previewRef,
    verticalReserve: isOnRecommendation ? 36 : 0,
  });
  const { userScale, userPan, reset: resetPreviewGestures } = usePreviewTouchGestures(
    isMobile && open,
    previewRef
  );

  const displayScale = Math.min(1, previewScale);
  const effectiveScale = displayScale * userScale;

  const handleCollectionChange = (id: string) => {
    setCollectionId(id);
    const col = findCollection(id);
    if (!col.skins.some((s) => s.id === skinId)) {
      setSkinId(col.skins[0].id);
    }
  };

  const handleRestore = useCallback(() => {
    setFormat(DEFAULT_FORMAT);
    setCollectionId(recommendation.collectionId);
    setSkinId(recommendation.skinId);
    setFontId(DEFAULT_IMAGE_FONT_ID);
    setTextColor(DEFAULT_TEXT_COLOR);
    resetPreviewGestures();
    toast(t('editor.restored', 'Configurações restauradas.'), 'info');
  }, [recommendation.collectionId, recommendation.skinId, resetPreviewGestures, t, toast]);

  const handleBackgroundSelect = useCallback((colId: string, nextSkinId: string) => {
    setCollectionId(colId);
    setSkinId(nextSkinId);
  }, []);

  const handleFontChange = useCallback((nextFontId: ImageFontId) => {
    setFontId(nextFontId);
    void ensurePickerFontLoaded(nextFontId);
  }, []);

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

  const ensureExportNode = useCallback(async () => {
    if (exportRef.current) return exportRef.current;
    setExportMounted(true);
    for (let i = 0; i < 24; i++) {
      await waitNextPaint();
      if (exportRef.current) return exportRef.current;
    }
    return null;
  }, []);

  const runExport = useCallback(
    async (mime: 'image/png' | 'image/jpeg') => {
      setBusy(mime === 'image/png' ? 'png' : 'jpeg');
      const node = await ensureExportNode();
      if (!node) {
        setBusy(null);
        toast(t('editor.export_failed', 'Não foi possível gerar a imagem.'), 'erro');
        return;
      }

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
        toast(t('editor.downloaded', 'Imagem baixada!'), 'sucesso');
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
    [ensureExportNode, fontSample, formatCfg.width, formatCfg.height, registerExport, t, toast]
  );

  const handleCopy = useCallback(async () => {
    setBusy('copy');
    const node = await ensureExportNode();
    if (!node) {
      setBusy(null);
      toast(t('editor.copy_failed', 'Falha ao copiar.'), 'erro');
      return;
    }
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
      toast(t('editor.copy_failed', 'Falha ao copiar.'), 'erro');
    } finally {
      setBusy(null);
    }
  }, [ensureExportNode, fontSample, registerExport, t, toast]);

  const handleMobileShare = useCallback(async () => {
    setBusy('mobile');
    const node = await ensureExportNode();
    if (!node) {
      setBusy(null);
      toast(t('editor.share_failed', 'Não foi possível compartilhar a imagem.'), 'erro');
      return;
    }
    try {
      const serial = allocateImageSerial();
      flushSync(() => setExportSerial(serial));
      await waitNextPaint();
      await waitNextPaint();
      const blob = await captureElementAsBlob(node, 'image/png', fontSample);
      registerExport(serial);
      const caption = `"${quote.texto.slice(0, 140)}" — ${quote.autor}`;
      const ok = await shareImageFile(blob, {
        title: 'Metamensagem',
        text: `${caption}\n${shareUrl}`,
        url: shareUrl,
      });
      if (!ok) {
        if (canUseNativeShare()) {
          try {
            await navigator.share({
              title: 'Metamensagem',
              text: caption,
              url: shareUrl,
            });
            return;
          } catch (e) {
            if ((e as Error).name === 'AbortError') return;
          }
        }
        const filename = `metamensagem-${serial}.png`;
        downloadBlob(blob, filename);
        toast(
          t(
            'editor.share_saved_for_apps',
            'Imagem salva. Abra Instagram, WhatsApp ou outro app para publicar.'
          ),
          'info'
        );
      }
    } catch {
      toast(t('editor.share_failed', 'Não foi possível compartilhar a imagem.'), 'erro');
    } finally {
      setBusy(null);
    }
  }, [
    ensureExportNode,
    fontSample,
    quote.autor,
    quote.texto,
    registerExport,
    shareUrl,
    t,
    toast,
  ]);

  const handleInstagramShare = useCallback(async () => {
    if (supportsFileShare || supportsNativeShare) {
      await handleMobileShare();
      return;
    }
    setBusy('mobile');
    const node = await ensureExportNode();
    if (!node) {
      setBusy(null);
      toast(t('editor.share_failed', 'Não foi possível compartilhar a imagem.'), 'erro');
      return;
    }
    try {
      const serial = allocateImageSerial();
      flushSync(() => setExportSerial(serial));
      await waitNextPaint();
      await waitNextPaint();
      const blob = await captureElementAsBlob(node, 'image/png', fontSample);
      registerExport(serial);
      downloadBlob(blob, `metamensagem-${serial}.png`);
      toast(
        t(
          'editor.share_instagram_saved',
          'Imagem salva. Abra o Instagram e publique no Feed ou nos Stories.'
        ),
        'info'
      );
    } catch {
      toast(t('editor.share_failed', 'Não foi possível compartilhar a imagem.'), 'erro');
    } finally {
      setBusy(null);
    }
  }, [
    ensureExportNode,
    fontSample,
    handleMobileShare,
    registerExport,
    supportsFileShare,
    supportsNativeShare,
    t,
    toast,
  ]);

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
    fontFamilyOverride,
    textColorOverride,
    fontId,
  };

  const previewBlock = (
    <div
      ref={previewRef}
      className={`relative flex flex-col items-center justify-center ${
        isMobile
          ? 'mm-mobile-editor-preview px-3 py-2 bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.08),transparent_70%)]'
          : 'mm-desktop-editor-preview'
      }`}
    >
      {isOnRecommendation && (
        <div
          className={`absolute top-2 sm:top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold shadow-lg ${
            tema === 'light'
              ? 'bg-amber-50 text-amber-900 border border-amber-200/80'
              : 'bg-amber-500/15 text-amber-100 border border-amber-400/30'
          }`}
        >
          <Star size={12} className="fill-amber-400 text-amber-400 shrink-0" />
          {t('editor.recommended', 'Recomendado para esta frase')}
        </div>
      )}

      <div
        className="relative shrink-0"
        style={{
          width: formatCfg.width * effectiveScale,
          height: formatCfg.height * effectiveScale,
          transform: isMobile ? `translate(${userPan.x}px, ${userPan.y}px)` : undefined,
        }}
      >
        <div
          style={{
            width: formatCfg.width * displayScale,
            height: formatCfg.height * displayScale,
            transform: userScale === 1 ? undefined : `scale(${userScale})`,
            transformOrigin: 'top left',
          }}
        >
          <ImageRenderer {...rendererBase} renderScale={displayScale} serial={exportSerial} />
        </div>
      </div>
    </div>
  );

  const mobileQuickPanel = (
    <MobileQuickStylePanel
      tema={tema}
      format={format}
      onFormatChange={setFormat}
      textColor={textColor}
      onTextColorChange={setTextColor}
      fontId={fontId}
      onFontChange={handleFontChange}
      fontSample={quote.texto}
      collectionId={collectionId}
      skinId={skinId}
      recommendedCollectionId={recommendation.matched ? recommendation.collectionId : undefined}
      recommendedSkinId={recommendation.matched ? recommendation.skinId : undefined}
      onBackgroundSelect={handleBackgroundSelect}
      showBackgrounds={skinsReady}
    />
  );

  const desktopControls = (
    <aside
      className={`mm-desktop-editor-controls ${
        tema === 'light' ? 'mm-desktop-editor-controls--light' : 'mm-desktop-editor-controls--dark'
      }`}
    >
      <section className="mm-desktop-editor-section">
        <h3 className="mm-desktop-editor-label">{t('editor.format', 'Formato')}</h3>
        <ImageFormatSelector value={format} onChange={setFormat} tema={tema} />
      </section>
      <section className="mm-desktop-editor-section">
        <h3 className="mm-desktop-editor-label">{t('editor.collection', 'Coleção & skin')}</h3>
        <p className="mm-desktop-editor-hint">
          {t(
            'editor.collection_hint',
            'Escolha o estilo visual. O texto da frase é sempre exibido por completo.'
          )}
        </p>
        <CollectionSelector value={collectionId} onChange={handleCollectionChange} tema={tema} />
      </section>
      <section className="mm-desktop-editor-section">
        <h3 className="mm-desktop-editor-label">{t('editor.variation', 'Variação')}</h3>
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
  );

  const modalUi = createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`mm-modal-overlay flex ${
          isMobile ? 'flex-col' : 'items-center justify-center p-4 md:p-6'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-gen-title"
      >
        <button
          type="button"
          className="absolute inset-0 z-0 bg-black/80"
          onClick={handleClose}
          aria-label={t('translate_page.close', 'Fechar')}
        />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`mm-modal-panel w-full max-w-5xl overflow-hidden rounded-t-[1.75rem] sm:rounded-[2rem] border shadow-2xl flex flex-col ${
            tema === 'light' ? 'bg-white border-zinc-200' : 'bg-[#141210] border-zinc-700'
          } ${isMobile ? 'flex-1 min-h-0 w-full rounded-none mm-image-editor-mobile' : 'max-h-[92vh] mm-image-editor-desktop'}`}
        >
          <header
            className={`flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b shrink-0 ${
              tema === 'light' ? 'border-zinc-100' : 'border-zinc-700/80'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#A855F7]/20 text-[#A855F7] shrink-0">
                <Sparkles size={20} />
              </span>
              <div className="min-w-0">
                <h2 id="image-gen-title" className="text-lg font-black tracking-tight truncate">
                  {t('editor.generate_title', 'Gerar imagem')}
                </h2>
                <p className={`text-xs truncate ${tema === 'light' ? 'text-zinc-500' : 'text-zinc-400'}`}>
                  {collection.emoji} {collection.name} · {skin.name} · {formatCfg.label}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label={t('translate_page.close', 'Fechar')}
              className={`p-2.5 rounded-xl border transition-colors shrink-0 ${
                tema === 'light' ? 'border-zinc-200 hover:bg-zinc-100' : 'border-zinc-600 hover:bg-zinc-800/80'
              }`}
            >
              <X size={20} />
            </button>
          </header>

          {isMobile ? (
            <div className="mm-image-editor-mobile-shell flex flex-col flex-1 min-h-0 overflow-hidden">
              {previewBlock}
              <div className="mm-mobile-editor-controls flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-3">
                {mobileQuickPanel}
              </div>
              {shareOpen && (
                <ShareActionBar
                  linksOnly
                  tema={tema}
                  quote={quote}
                  busy={busy}
                  supportsFileShare={supportsFileShare}
                  supportsNativeShare={supportsNativeShare}
                  onMobileShare={() => void handleMobileShare()}
                  onInstagramShare={() => void handleInstagramShare()}
                  onDownloadPng={() => void runExport('image/png')}
                  onDownloadJpg={() => void runExport('image/jpeg')}
                  onCopy={() => void handleCopy()}
                />
              )}
              <MobileEditorActionBar
                tema={tema}
                busy={busy}
                supportsShare
                shareOpen={shareOpen}
                onRestore={handleRestore}
                onDownload={() => void runExport('image/png')}
                onShare={() => setShareOpen((open) => !open)}
              />
            </div>
          ) : (
            <div className="mm-image-editor-desktop-body">
              {desktopControls}
              <div className="mm-desktop-editor-preview-col">
                {previewBlock}
                <div className="mm-desktop-editor-share">
                  <ShareActionBar
                    tema={tema}
                    quote={quote}
                    busy={busy}
                    supportsFileShare={supportsFileShare}
                    supportsNativeShare={supportsNativeShare}
                    onMobileShare={() => void handleMobileShare()}
                    onInstagramShare={() => void handleInstagramShare()}
                    onDownloadPng={() => void runExport('image/png')}
                    onDownloadJpg={() => void runExport('image/jpeg')}
                    onCopy={() => void handleCopy()}
                  />
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    getModalRoot()
  );

  const exportCanvas = exportMounted
    ? createPortal(
        <div
          className="mm-image-export-offscreen"
          style={{ width: formatCfg.width, height: formatCfg.height }}
          aria-hidden
        >
          <ImageRenderer ref={exportRef} {...rendererBase} serial={exportSerial} />
        </div>,
        getModalRoot()
      )
    : null;

  return (
    <>
      {modalUi}
      {exportCanvas}
    </>
  );
}
