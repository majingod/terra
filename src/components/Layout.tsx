import { Link, Outlet, useLocation } from 'react-router-dom'

const LIENS = [
  { to: '/', label: 'Accueil' },
  { to: '/creer', label: 'Créer' },
  { to: '/encyclopedie', label: 'Encyclopédie' },
]

export default function Layout() {
  const { pathname } = useLocation()

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b-4 border-sang-700 bg-terre-900 px-4 py-4">
        <Link to="/" className="block text-2xl font-extrabold tracking-wide text-ambre-500">
          Terra Mortis
        </Link>
      </header>

      <main className="flex-1 px-4 py-6">
        <Outlet />
      </main>

      <nav className="sticky bottom-0 grid grid-cols-3 gap-2 border-t-4 border-sang-700 bg-terre-900 p-2">
        {LIENS.map((lien) => {
          const actif = pathname === lien.to
          return (
            <Link
              key={lien.to}
              to={lien.to}
              className={`flex min-h-touch items-center justify-center rounded-xl text-center text-lg font-bold ${
                actif ? 'bg-ambre-500 text-terre-950' : 'text-stone-100'
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
