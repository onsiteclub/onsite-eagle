// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';

// Fonts before styles — @fontsource registers @font-face rules that the CSS uses.
import '@fontsource/geist/400.css';
import '@fontsource/geist/500.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';

import App from './App';
import { initSentry } from './lib/sentry';
import './styles/tokens.generated.css';  // :root { --color-…: … } from tokens.ts
import './styles/index.css';

// Crash reporting — no-op without VITE_SENTRY_DSN, so local dev stays quiet.
initSentry();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
