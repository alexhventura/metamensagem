import { useEffect, useState } from 'react';

/**
 * Escala o preview no modal sem afetar o canvas de exportação (1:1 offscreen).
 */
export function useImagePreviewScale(formatWidth: number, formatHeight: number, open: boolean): number {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!open) return;

    const update = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const isDesktop = vw >= 1024;
      const padX = isDesktop ? 80 : 32;
      const maxW = isDesktop ? 440 : Math.max(240, vw - padX);
      const maxH = isDesktop
        ? Math.min(560, Math.round(vh * 0.52))
        : Math.min(Math.round(vh * 0.4), 420);

      setScale(Math.min(1, maxW / formatWidth, maxH / formatHeight));
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [open, formatWidth, formatHeight]);

  return scale;
}
