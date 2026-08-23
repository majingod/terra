/**
 * L'accueil — « Mes fiches ».
 *
 * D23 : « Retirer » et sa corbeille ont disparu. Chaque carte porte
 * « Supprimer », en rouge, qui ouvre un panneau NOMMÉ sous la carte ; le
 * panneau n'efface rien, seul le maintien de 1 500 ms efface, et l'export est
 * offert avant sans jamais être exigé.
 *
 * D26 : au premier passage de cette version, les fiches que l'ancienne
 * corbeille cachait reviennent dans la liste — à leur place exacte, puisque le
 * balayage ne touche pas `updatedAt`. ⛔ Aucune purge : pas un enregistrement
 * n'est effacé par ce chemin-là.
 */
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { balayerFichesRetirees, supprimerFicheDefinitivement } from '../db/suppression'
import { exporterPersonnageJSON } from '../utils/exportImport'
import { niveauDeLaFiche } from '../wizard/montee'
import BandeauRetourDesFiches from '../components/BandeauRetourDesFiches'
import PanneauSuppression from '../components/PanneauSuppression'
import RangeeInstallation from '../components/RangeeInstallation'

/** Le statut de suppression s'efface tout seul — le temps de le lire. */
const DUREE_STATUT_MS = 2600

export default function Accueil() {
  const personnages = useLiveQuery(() => db.personnages.orderBy('updatedAt').reverse().toArray(), [])
  // Un seul panneau ouvert à la fois : l'id de la fiche concernée.
  const [aSupprimer, setASupprimer] = useState<number | null>(null)
  const [statut, setStatut] = useState<string | null>(null)
  // D26 — combien de fiches CE passage a remontées, et si le bandeau est lu.
  const [remontees, setRemontees] = useState(0)
  const [bandeauLu, setBandeauLu] = useState(false)
  const balayageLance = useRef(false)

  useEffect(() => {
    // Une seule fois par montage — StrictMode rejoue les effets, le balayage
    // est idempotent mais son COMPTE ne doit pas être écrasé par un 0.
    if (balayageLance.current) return
    balayageLance.current = true
    let vivant = true
    void balayerFichesRetirees().then((nombre) => {
      if (vivant) setRemontees(nombre)
    })
    return () => {
      vivant = false
    }
  }, [])

  useEffect(() => {
    if (statut === null) return
    const minuterie = setTimeout(() => setStatut(null), DUREE_STATUT_MS)
    return () => clearTimeout(minuterie)
  }, [statut])

  return (
    <div className="flex flex-col gap-6">
      <p className="text-lg text-secondary-foreground">
        Bienvenue, aventurier·ère. Crée ta fiche de personnage, consulte l'encyclopédie, et
        prépare-toi pour le prochain GN — même sans réseau.
      </p>

      <RangeeInstallation />

      <Link to="/creer" className="btn-grand">
        Créer un personnage
      </Link>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold text-gold">Mes fiches</h2>

        {remontees > 0 && !bandeauLu && (
          <BandeauRetourDesFiches nombre={remontees} onCompris={() => setBandeauLu(true)} />
        )}

        {!personnages && <p className="text-muted-foreground">Chargement…</p>}

        {personnages && personnages.length === 0 && (
          <p className="carte text-secondary-foreground">
            Aucune fiche pour l'instant. Lance la création d'un personnage pour commencer.
          </p>
        )}

        {(personnages ?? []).map((p) => {
          const nom = p.nomPerso || 'Sans nom'
          return (
            <div key={p.id} className="flex flex-col gap-2">
              <Link to={`/fiche/${p.id}`} className="carte flex flex-col gap-1">
                <span className="text-lg font-bold">{nom}</span>
                <span className="text-muted-foreground">
                  {p.race || '—'} · {p.classe || '—'} · Niveau {niveauDeLaFiche(p)}
                </span>
              </Link>

              {aSupprimer === p.id ? (
                <PanneauSuppression
                  nom={nom}
                  onExporter={() => exporterPersonnageJSON(p)}
                  onSupprimer={() => {
                    setASupprimer(null)
                    void supprimerFicheDefinitivement(p.id as number).then(() =>
                      setStatut(`${nom} supprimée pour de bon.`),
                    )
                  }}
                  onAnnuler={() => setASupprimer(null)}
                />
              ) : (
                <button
                  type="button"
                  className="btn-ghost self-end border-destructive text-destructive-foreground"
                  aria-label={`Supprimer ${nom}`}
                  onClick={() => setASupprimer(p.id as number)}
                >
                  Supprimer
                </button>
              )}
            </div>
          )
        })}
      </section>

      {/*
        La zone vivante est montée DÈS le premier rendu, vide : un lecteur
        d'écran n'annonce pas de façon fiable un `aria-live` qui vient
        d'apparaître. Elle ne devient visible qu'une fois remplie.
      */}
      <p
        aria-live="polite"
        className={
          statut === null
            ? 'sr-only'
            : `fixed inset-x-4 bottom-4 z-50 rounded-lg border border-gold/60 bg-card px-4 py-3
               text-center text-gold shadow-lg`
        }
      >
        {statut}
      </p>
    </div>
  )
}
