import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

type TouchPoint = { x: number; y: number };

function distance(a: TouchPoint, b: TouchPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function usePreviewTouchGestures(enabled: boolean, containerRef?: RefObject<HTMLElement | null>) {
  const [userScale, setUserScale] = useState(1);
  const [userPan, setUserPan] = useState({ x: 0, y: 0 });
  const panRef = useRef(userPan);
  const scaleRef = useRef(userScale);

  panRef.current = userPan;
  scaleRef.current = userScale;

  const gestureRef = useRef<{
    mode: 'pan' | 'pinch' | null;
    startPan: TouchPoint;
    startOffset: TouchPoint;
    startDistance: number;
    startScale: number;
  }>({
    mode: null,
    startPan: { x: 0, y: 0 },
    startOffset: { x: 0, y: 0 },
    startDistance: 0,
    startScale: 1,
  });

  const reset = useCallback(() => {
    setUserScale(1);
    setUserPan({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    const el = containerRef?.current;
    if (!enabled || !el) return;

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        const a = { x: event.touches[0].clientX, y: event.touches[0].clientY };
        const b = { x: event.touches[1].clientX, y: event.touches[1].clientY };
        gestureRef.current = {
          mode: 'pinch',
          startPan: a,
          startOffset: panRef.current,
          startDistance: distance(a, b),
          startScale: scaleRef.current,
        };
      } else if (event.touches.length === 1) {
        gestureRef.current = {
          mode: 'pan',
          startPan: { x: event.touches[0].clientX, y: event.touches[0].clientY },
          startOffset: panRef.current,
          startDistance: 0,
          startScale: scaleRef.current,
        };
      }
    };

    const onTouchMove = (event: TouchEvent) => {
      const g = gestureRef.current;
      if (!g.mode) return;
      event.preventDefault();

      if (g.mode === 'pinch' && event.touches.length >= 2) {
        const a = { x: event.touches[0].clientX, y: event.touches[0].clientY };
        const b = { x: event.touches[1].clientX, y: event.touches[1].clientY };
        const ratio = distance(a, b) / Math.max(g.startDistance, 1);
        setUserScale(Math.min(2.5, Math.max(1, g.startScale * ratio)));
        return;
      }

      if (g.mode === 'pan' && event.touches.length === 1) {
        const dx = event.touches[0].clientX - g.startPan.x;
        const dy = event.touches[0].clientY - g.startPan.y;
        setUserPan({
          x: g.startOffset.x + dx,
          y: g.startOffset.y + dy,
        });
      }
    };

    const onTouchEnd = () => {
      gestureRef.current.mode = null;
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [containerRef, enabled]);

  return {
    userScale,
    userPan,
    reset,
    touchHandlers: {},
  };
}
