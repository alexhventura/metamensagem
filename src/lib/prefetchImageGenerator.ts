let started = false;

/** Baixa o editor de imagem antes do clique, para a abertura não esperar a rede. */
export function prefetchImageGenerator(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  void import('../components/image-generator');
}

export function scheduleImageGeneratorPrefetch(): void {
  const run = () => prefetchImageGenerator();
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(run, { timeout: 2500 });
  } else {
    window.setTimeout(run, 1200);
  }
}
