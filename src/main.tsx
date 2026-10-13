import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { preloadRoute } from './route-pages'

const root = document.getElementById('root')!;
const app = <StrictMode><App /></StrictMode>;
async function mount() {
  if (root.children.length > 0) {
    await preloadRoute(window.location.pathname.replace(/\/+$/, '') || '/');
    hydrateRoot(root, app);
  } else createRoot(root).render(app);
}
void mount();
