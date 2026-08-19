import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import BandeauInstallation from '../components/BandeauInstallation'

export default function Accueil() {
  const personnages = useLiveQuery(() => db.personnages.orderBy('updatedAt').reverse().toArray(), [])

  return (
    <div className="flex flex-col gap-6">
      <p className="text-lg text-secondary-foreground">
        Bienvenue, aventurier·ère. Crée ta fiche de personnage, consulte l'encyclopédie, et
        prépare-toi pour le prochain GN — même sans réseau.
      </p>

      <BandeauInstallation />

      <Link to="/creer" className="btn-grand">
        Créer un personnage
      </Link>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold text-gold">Mes fiches</h2>

        {!personnages && <p className="text-muted-foreground">Chargement…</p>}

        {personnages && personnages.length === 0 && (
          <p className="carte text-secondary-foreground">
            Aucune fiche pour l'instant. Lance la création d'un personnage pour commencer.
          </p>
        )}

        {personnages?.map((p) => (
          <Link key={p.id} to={`/fiche/${p.id}`} className="carte flex flex-col gap-1">
            <span className="text-lg font-bold">{p.nomPerso || 'Sans nom'}</span>
            <span className="text-muted-foreground">
              {p.race || '—'} · {p.classe || '—'} · Niveau {p.niveau}
            </span>
          </Link>
        ))}
      </section>
    </div>
  )
}
