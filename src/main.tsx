import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { initThemeOnLoad } from './lib/theme';
import { ThemeProvider } from './context/ThemeContext';
import { initLcpObserver } from './lib/perf/lcpObserver';

initThemeOnLoad();
initLcpObserver();

import './i18n';

const App = lazy(() => import('./App.tsx'));

function loadDeferredFonts() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href =
    'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap';
  link.onload = () => document.documentElement.classList.add('mm-fonts-mono-ready');
  document.head.appendChild(link);
}

const runDeferred = () => {
  loadDeferredFonts();
};

if (typeof requestIdleCallback === 'function') {
  requestIdleCallback(runDeferred, { timeout: 3000 });
} else {
  setTimeout(runDeferred, 800);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-black text-white">
            <div className="w-10 h-10 border-4 border-[#A855F7] border-t-transparent rounded-full animate-spin" />
          </div>
        }
      >
        <App />
      </Suspense>
    </ThemeProvider>
  </StrictMode>
);
