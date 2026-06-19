import { useEffect, useState } from 'react';

/**
 * Escala o preview no modal sem afetar o canvas de exportação (1:1 offscreen).
 */
export function useImagePreviewScale(formatWidth: number, formatHeight: number, open: boolean): number {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!open) return;

    let timer: number | undefined;

    const update = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const isDesktop = vw >= 1024;
      const padX = isDesktop ? 80 : 24;
      const maxW = isDesktop ? 440 : Math.max(220, vw - padX);

      const reservedVertical = isDesktop ? 160 : 220;
      const maxH = isDesktop
        ? Math.min(560, Math.round(vh * 0.52))
        : Math.max(180, Math.min(Math.round(vh * 0.34), vh - reservedVertical));

      setScale(Math.min(1, maxW / formatWidth, maxH / formatHeight));
    };

    const debounced = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(update, 100);
    };

    update();
    window.addEventListener('resize', debounced);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', debounced);
    };
  }, [open, formatWidth, formatHeight]);

  return scale;
}
