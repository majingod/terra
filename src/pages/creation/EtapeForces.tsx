/**
 * Étape 5 — Forces : les 3 jetons de la répartition du fichier (3-2-1) à
 * poser sur Puissance / Résistance / Esprit. Les paliers de la table p.5
 * s'affichent sous chaque caractéristique et s'allument quand ils sont
 * atteints (lecture cumulative A4). Les points d'héritage s'ajoutent,
 * plafond lu du fichier.
 */
import { repartitionAttendue } from '../../rules/caracs'
import { totalAchats } from '../../rules/heritage'
import { getRules } from '../../rules/load'
import { valeurCarac } from '../../rules/stats'
import type { Changement } from '../../wizard/validation'
import type { FicheCreation } from '../../wizard/types'
import { Tutoriel } from './ui'

type CleCarac = 'p' | 'r' | 'e'

const CARACS: Array<{ cle: CleCarac; table: 'puissance' | 'resistance' | 'esprit'; nom: string }> = [
  { cle: 'p', table: 'puissance', nom: 'Puissance' },
  { cle: 'r', table: 'resistance', nom: 'Résistance' },
  { cle: 'e', table: 'esprit', nom: 'Esprit' },
]

interface Props {
  fiche: FicheCreation
  onChangement: (changement: Changement, avant: FicheCreation) => void
  onMaj: (fiche: FicheCreation) => void
}

export default function EtapeForces({ fiche, onChangement, onMaj }: Props) {
  const regles = getRules()
  const jetons = repartitionAttendue()
  const max = regles.caracteristiques.creation.max
  const pointsHeritage = totalAchats(fiche.achats, 'carac')
  const extras = fiche.extras ?? { p: 0, r: 0, e: 0 }
  const extrasPoses = extras.p + extras.r + extras.e

  function poserJeton(carac: CleCarac, valeur: number) {
    const caracs = { ...(fiche.caracs ?? {}) }
    if (caracs[carac] === valeur) return
    const detenteur = (['p', 'r', 'e'] as CleCarac[]).find((k) => caracs[k] === valeur)
    const ancien = caracs[carac]
    caracs[carac] = valeur
    if (detenteur) caracs[detenteur] = ancien
    // Passe par la fenêtre de répercussions si un surplus apparaît (Esprit
    // qui baisse → dons/langues à retirer par le joueur).
    onChangement({ fiche: { ...fiche, caracs }, retraits: [] }, fiche)
  }

  function majExtra(carac: CleCarac, delta: number) {
    const suite = { ...extras, [carac]: extras[carac] + delta }
    if (suite[carac] < 0) return
    if (delta > 0 && extrasPoses >= pointsHeritage) return
    if (delta > 0 && valeurCarac(fiche, carac) + 1 > max) return
    if (delta < 0) {
      onChangement({ fiche: { ...fiche, extras: suite }, retraits: [] }, fiche)
    } else {
      onMaj({ ...fiche, extras: suite })
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <h1 className="titre-etape">Pose tes forces</h1>
      <Tutoriel
        etapeId="forces"
        gestes={[
          `Pose les jetons ${jetons.join(', ')} : un par caractéristique.`,
          'Les paliers atteints s’allument sous chaque caractéristique.',
          pointsHeritage > 0
            ? 'Ajoute ensuite tes points d’héritage (+).'
            : 'Des points d’héritage achetés à l’étape Destin s’ajouteraient ici.',
        ]}
        pourquoi={`« ${regles.caracteristiques.creation.verbatim} » — lecture cumulative de la table (A4) : chaque palier atteint s'ajoute aux précédents.`}
      />

      <div className="flex flex-col gap-3">
        {CARACS.map(({ cle, table, nom }) => {
          const valeurJeton = fiche.caracs?.[cle]
          const valeur = valeurCarac(fiche, cle)
          const paliers = regles.caracteristiques.table[table]
          return (
            <div key={cle} className="panneau-w flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h2 className="font-titre text-xl font-bold">{nom}</h2>
                <span className="font-titre text-2xl font-bold text-or">{valeur}</span>
              </div>
              <div className="flex gap-2">
                {jetons.map((jeton) => (
                  <button
                    key={jeton}
                    type="button"
                    aria-pressed={valeurJeton === jeton}
                    onClick={() => poserJeton(cle, jeton)}
                    className={`min-h-touch flex-1 rounded-xl border-2 font-titre text-xl font-bold ${
                      valeurJeton === jeton
                        ? 'border-or bg-or text-fond'
                        : 'border-ligne bg-fond'
                    }`}
                  >
                    {jeton}
                  </button>
                ))}
              </div>

              {pointsHeritage > 0 && (
                <div className="flex items-center justify-between gap-2 border-t border-ligne pt-2">
                  <span className="text-sm text-stone-300">
                    Points d'héritage : +{extras[cle]}
                  </span>
                  <span className="flex gap-1">
                    <button
                      type="button"
                      className="flex h-11 w-11 items-center justify-center rounded-lg border border-ligne bg-fond text-xl font-bold disabled:opacity-30"
                      disabled={extras[cle] <= 0}
                      onClick={() => majExtra(cle, -1)}
                      aria-label={`${nom} : retirer un point d'héritage`}
                    >
                      −
                    </button>
                    <button
                      type="button"
                      className="flex h-11 w-11 items-center justify-center rounded-lg border border-ligne bg-fond text-xl font-bold disabled:opacity-30"
                      disabled={extrasPoses >= pointsHeritage || valeur + 1 > max}
                      onClick={() => majExtra(cle, 1)}
                      aria-label={`${nom} : ajouter un point d'héritage`}
                    >
                      +
                    </button>
                  </span>
                </div>
              )}

              <ol className="flex flex-col gap-1 border-t border-ligne pt-2">
                {Object.entries(paliers).map(([niveau, effet]) => {
                  const atteint = valeur >= Number(niveau)
                  return (
                    <li
                      key={niveau}
                      className={`flex items-center gap-2 rounded-lg px-2 py-1 text-sm ${
                        atteint ? 'bg-or/15 font-semibold text-or' : 'text-stone-400'
                      }`}
                    >
                      <span className="font-titre">{niveau}</span>
                      <span>{effet}</span>
                      {atteint && <span aria-hidden>●</span>}
                    </li>
                  )
                })}
              </ol>
            </div>
          )
        })}
      </div>

      {pointsHeritage > 0 && (
        <p className="text-sm text-stone-300">
          Points d'héritage posés : {extrasPoses}/{pointsHeritage} — aucune caractéristique
          au-delà de {max}.
        </p>
      )}
    </section>
  )
}
