import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global error catcher for debugging issues without disrupting the user interface
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    console.error('Captured Runtime Error:', event.error || event.message);
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.warn('Captured Unhandled Promise Rejection:', event.reason);
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

