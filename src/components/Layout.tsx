import { Link, Outlet, useLocation } from 'react-router-dom'

const LIENS = [
  { to: '/', label: 'Accueil' },
  { to: '/creer', label: 'Créer' },
  { to: '/encyclopedie', label: 'Encyclopédie' },
]

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
      <header className="border-b border-ligne bg-panneau px-4 py-4">
        <Link to="/" className="block font-wordmark text-2xl font-bold tracking-wide text-or">
          Terra Mortis
        </Link>
      </header>

      <main className="flex-1 px-4 py-6">
        <Outlet />
      </main>

      <nav className="sticky bottom-0 grid grid-cols-3 gap-2 border-t border-ligne bg-panneau p-2">
        {LIENS.map((lien) => {
          const actif = pathname === lien.to
          return (
            <Link
              key={lien.to}
              to={lien.to}
              className={`flex min-h-touch items-center justify-center rounded-xl text-center font-titre text-lg font-bold ${
                actif ? 'bg-cta text-white' : 'text-stone-100'
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
