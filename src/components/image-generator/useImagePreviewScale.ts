import { useEffect, useState, type RefObject } from 'react';

export type ImagePreviewScaleOptions = {
  containerRef?: RefObject<HTMLElement | null>;
  /** Reserva vertical extra (ex.: badge “Recomendado”). */
  verticalReserve?: number;
};

/**
 * Escala o preview no modal sem afetar o canvas de exportação (1:1 offscreen).
 */
export function useImagePreviewScale(
  formatWidth: number,
  formatHeight: number,
  open: boolean,
  options: ImagePreviewScaleOptions = {}
): number {
  const [scale, setScale] = useState(1);
  const { containerRef, verticalReserve = 0 } = options;

  useEffect(() => {
    if (!open) return;

    let timer: number | undefined;
    let resizeObserver: ResizeObserver | undefined;

    const update = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const isDesktop = vw >= 1024;
      let maxW: number;
      let maxH: number;

      const el = containerRef?.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
        const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
        maxW = Math.max(120, rect.width - padX - 8);
        maxH = Math.max(120, rect.height - padY - verticalReserve - 8);
      } else {
        const padX = isDesktop ? 80 : 24;
        maxW = isDesktop ? 440 : Math.max(220, vw - padX);
        const reservedVertical = isDesktop ? 160 : 220;
        maxH = isDesktop
          ? Math.min(560, Math.round(vh * 0.52))
          : Math.max(180, Math.min(Math.round(vh * 0.34), vh - reservedVertical));
      }

      setScale(Math.min(1, maxW / formatWidth, maxH / formatHeight));
    };

    const debounced = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(update, 50);
    };

    update();

    const el = containerRef?.current;
    if (el && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(debounced);
      resizeObserver.observe(el);
    }

    window.addEventListener('resize', debounced);
    return () => {
      window.clearTimeout(timer);
      resizeObserver?.disconnect();
      window.removeEventListener('resize', debounced);
    };
  }, [open, formatWidth, formatHeight, containerRef, verticalReserve]);

  return scale;
}
