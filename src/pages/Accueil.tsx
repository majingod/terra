import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { remettreFiche, retirerFiche, separerFiches } from '../db/retrait'
import BandeauInstallation from '../components/BandeauInstallation'

export default function Accueil() {
  const personnages = useLiveQuery(() => db.personnages.orderBy('updatedAt').reverse().toArray(), [])
  // Une seule confirmation ouverte à la fois : l'id de la fiche concernée.
  const [aConfirmer, setAConfirmer] = useState<number | null>(null)

  // Filtrage EN MÉMOIRE : `retireeLe` n'est pas indexé, et il y a 30 à 50
  // fiches — pas de montée de version Dexie pour ça.
  const { actives, retirees } = separerFiches(personnages ?? [])

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

        {personnages && actives.length === 0 && (
          <p className="carte text-secondary-foreground">
            Aucune fiche pour l'instant. Lance la création d'un personnage pour commencer.
          </p>
        )}

        {actives.map((p) => (
          <div key={p.id} className="flex flex-col gap-2">
            <Link to={`/fiche/${p.id}`} className="carte flex flex-col gap-1">
              <span className="text-lg font-bold">{p.nomPerso || 'Sans nom'}</span>
              <span className="text-muted-foreground">
                {p.race || '—'} · {p.classe || '—'} · Niveau {p.niveau}
              </span>
            </Link>

            {aConfirmer === p.id ? (
              <div className="note flex flex-col gap-2">
                <p className="text-foreground">
                  Retirer {p.nomPerso || 'Sans nom'} de ta liste ?
                </p>
                <p>La fiche n'est pas effacée : tu la retrouveras dans « Fiches retirées ».</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-ghost flex-1"
                    onClick={() => {
                      setAConfirmer(null)
                      void retirerFiche(p.id as number)
                    }}
                  >
                    Oui, retirer
                  </button>
                  <button
                    type="button"
                    className="btn-ghost flex-1"
                    onClick={() => setAConfirmer(null)}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="btn-ghost self-end"
                aria-label={`Retirer ${p.nomPerso || 'Sans nom'} de ta liste`}
                onClick={() => setAConfirmer(p.id as number)}
              >
                Retirer
              </button>
            )}
          </div>
        ))}
      </section>

      {retirees.length > 0 && (
        <details className="carte">
          <summary className="cursor-pointer text-lg font-bold text-gold">
            Fiches retirées ({retirees.length})
          </summary>

          <p className="note">
            Ces fiches ne sont pas effacées. Remets-en une dans ta liste quand tu veux.
          </p>

          <div className="mt-3 flex flex-col gap-3">
            {retirees.map((p) => (
              <div key={p.id} className="flex flex-col gap-2">
                <span className="text-lg font-bold">{p.nomPerso || 'Sans nom'}</span>
                <span className="text-muted-foreground">
                  {p.race || '—'} · {p.classe || '—'} · Niveau {p.niveau}
                </span>
                <button
                  type="button"
                  className="btn-ghost self-end"
                  aria-label={`Remettre ${p.nomPerso || 'Sans nom'} dans ma liste`}
                  onClick={() => void remettreFiche(p.id as number)}
                >
                  Remettre dans ma liste
                </button>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
