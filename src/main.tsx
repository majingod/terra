import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
// Polices AUTO-HÉBERGÉES (@fontsource) : aucun appel réseau, woff2 précachés
// par le service worker (globPatterns inclut *.woff2). D11-ter : Cinzel
// (titres, graisses relevées du design system) + Crimson Text (corps).
// ⛔ Cinzel Decorative ne se charge pas (jamais utilisée — défaut Manus nommé).
import '@fontsource/cinzel/latin-400.css'
import '@fontsource/cinzel/latin-600.css'
import '@fontsource/cinzel/latin-700.css'
import '@fontsource/cinzel/latin-900.css'
import '@fontsource/crimson-text/latin-400.css'
import '@fontsource/crimson-text/latin-600.css'
import '@fontsource/crimson-text/latin-400-italic.css'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
