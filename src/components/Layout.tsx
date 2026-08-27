import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { basculerMode, lireMode, type Mode } from '../theme/mode'

const LIENS = [
  { to: '/', label: 'Accueil' },
  { to: '/creer', label: 'Créer' },
  { to: '/encyclopedie', label: 'Encyclopédie' },
]

/**
 * La bascule Soleil / Sombre (t017, Q20 A — retour terrain du 22 août).
 *
 * Le libellé nomme ce que le geste FAIT, jamais l'état où l'on est : en sombre
 * il propose « Soleil », en soleil il propose « Sombre ». `aria-pressed` dit,
 * lui, l'état — c'est le lecteur d'écran qui a besoin des deux.
 *
 * `pas-a-imprimer` : un bouton d'app ne s'imprime jamais (D9).
 */
function BasculeMode() {
  const [mode, setMode] = useState<Mode>(lireMode)
  const soleil = mode === 'soleil'
  return (
    <button
      type="button"
      onClick={() => setMode(basculerMode())}
      aria-pressed={soleil}
      aria-label="Mode soleil"
      className="pas-a-imprimer flex min-h-touch items-center gap-2 rounded-full border border-border bg-secondary px-3.5 py-2 font-titre text-sm font-bold text-secondary-foreground"
    >
      <span aria-hidden="true">{soleil ? '☾' : '☀'}</span>
      {soleil ? 'Sombre' : 'Soleil'}
    </button>
  )
}

export default function Layout() {
  const { pathname } = useLocation()
  // Le wizard (maquette A v3) porte son propre en-tête et sa propre barre
  // basse (Continuer / bandeau vivant) : le chrome de l'app s'efface.
  const wizard = pathname === '/creer'

  if (wizard) {
    return (
      <div className="mx-auto min-h-dvh w-full max-w-[640px] px-4">
        <Outlet />
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between border-b border-border/50 bg-card/50 backdrop-blur-sm px-4 py-4">
        <Link to="/" className="block font-wordmark text-2xl font-bold tracking-wide text-gold">
          Terra Mortis
        </Link>
        <BasculeMode />
      </header>

      <main className="flex-1 px-4 py-6">
        <Outlet />
      </main>

      <nav className="sticky bottom-0 grid grid-cols-3 gap-2 border-t border-border/50 bg-card/50 backdrop-blur-sm p-2">
        {LIENS.map((lien) => {
          const actif = pathname === lien.to
          return (
            <Link
              key={lien.to}
              to={lien.to}
              className={`flex min-h-touch items-center justify-center rounded-xl text-center font-titre text-lg font-bold ${
                actif ? 'bg-primary text-white' : 'text-foreground'
              }`}
            >
              {lien.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
