import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';

// Suppress non-fatal 3rd-party library background transport logs from cluttering the debug console
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    const text = args
      .map((a) => (typeof a === 'string' ? a : (a?.message || a?.stack || '')))
      .join(' ')
      .toLowerCase();
    if (
      text.includes('@firebase/firestore') ||
      text.includes('grpcconnection') ||
      text.includes('could not reach cloud firestore') ||
      text.includes('code: 5') ||
      text.includes('not_found') ||
      text.includes('failed to get document because the client is offline') ||
      text.includes('serviceworker')
    ) {
      return;
    }
    originalError.apply(console, args);
  };

  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    const text = args
      .map((a) => (typeof a === 'string' ? a : (a?.message || '')))
      .join(' ')
      .toLowerCase();
    if (
      text.includes('firestore') ||
      text.includes('serviceworker') ||
      text.includes('fast2sms') ||
      text.includes('twilio') ||
      text.includes('google maps')
    ) {
      return;
    }
    originalWarn.apply(console, args);
  };
}

// Register Service Worker for PWA & Play Store (top-level window only, not iframe sandbox)
if ('serviceWorker' in navigator && window.location.protocol.startsWith('http') && window.self === window.top) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch(() => {});
  });
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

