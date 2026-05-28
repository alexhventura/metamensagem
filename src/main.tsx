import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './i18n'; // Importar i18n antes do App
import App from './App.tsx';
import './index.css';
import { initThemeOnLoad } from './lib/theme';
import { ThemeProvider } from './context/ThemeContext';

initThemeOnLoad();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
