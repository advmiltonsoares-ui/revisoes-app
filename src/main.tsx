import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { AuthProvider } from './auth';
import { FocoProvider } from './foco';
import { iniciarTema } from './tema';
import './styles.css';

iniciarTema();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <FocoProvider>
        <App />
      </FocoProvider>
    </AuthProvider>
  </StrictMode>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
}
