import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Silence benign iframe, WebSocket, or Vite HMR disconnect errors
if (typeof window !== 'undefined') {
  const isBenignError = (message: string) => {
    return (
      message.includes('WebSocket') ||
      message.includes('websocket') ||
      message.includes('Vite') ||
      message.includes('HMR') ||
      message.includes('closed without opened')
    );
  };

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = reason?.message || String(reason || '');
    if (isBenignError(message)) {
      console.warn('Silenced benign unhandled rejection:', message);
      event.preventDefault();
      event.stopPropagation();
    }
  });

  window.addEventListener('error', (event) => {
    const message = event.message || '';
    if (isBenignError(message)) {
      console.warn('Silenced benign window error:', message);
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

