/**
 * Étape 5 — Forces (maquette A v3) : trois jetons dorés (3-2-1, lus du
 * fichier) à prendre en main puis poser sur une caractéristique ; retoucher
 * une caractéristique remplie reprend son jeton. Paliers de la table p.5
 * affichés sous chaque caractéristique, allumés quand atteints (lecture
 * cumulative A4). Points de caractéristique en plus — ceux des échelons de
 * niveau (table d'évolution) et ceux achetés à l'héritage — placés librement
 * sur le même composant, plafond lu du fichier.
 */
import { useState } from 'react'
import { repartitionAttendue } from '../../rules/caracs'
import { totalAchats } from '../../rules/heritage'
import { getRules } from '../../rules/load'
import { normaliserNiveau, pointsCaracCumules } from '../../rules/niveau'
import { valeurCarac } from '../../rules/stats'
import {
  pointsCaracAPlacer,
  surplusDons,
  surplusLangues,
  surplusPointsCarac,
} from '../../wizard/validation'
import type { FicheCreation } from '../../wizard/types'
import { ErreurNote, Note, Tutoriel } from './ui'

type CleCarac = 'p' | 'r' | 'e'

const CARACS: Array<{
  cle: CleCarac
  table: 'puissance' | 'resistance' | 'esprit'
  nom: string
  sousTitre: string
  couleur: string
}> = [
  {
    cle: 'p',
    table: 'puissance',
    nom: 'Puissance',
    sousTitre: 'Lutte et dégâts au corps à corps',
    couleur: 'text-legion-texte',
  },
  {
    cle: 'r',
    table: 'resistance',
    nom: 'Résistance',
    sousTitre: 'Points de vie et sauvegardes',
    couleur: 'text-chart-4',
  },
  {
    cle: 'e',
    table: 'esprit',
    nom: 'Esprit',
    sousTitre: 'Mana, dons et langues',
    couleur: 'text-sanctum-texte',
  },
]

interface Props {
  fiche: FicheCreation
  onMaj: (fiche: FicheCreation) => void
}

export default function EtapeForces({ fiche, onMaj }: Props) {
  const regles = getRules()
  const jetons = repartitionAttendue().sort((a, b) => b - a)
  const max = regles.caracteristiques.creation.max
  const niveau = normaliserNiveau(fiche.niveau)
  const pointsHeritage = totalAchats(fiche.achats, 'carac')
  const pointsNiveau = pointsCaracCumules(niveau)
  const pointsEnPlus = pointsCaracAPlacer(fiche)
  const extras = fiche.extras ?? { p: 0, r: 0, e: 0 }
  const poses = extras.p + extras.r + extras.e
  const caracsEnTrop = surplusPointsCarac(fiche)
  /** Les + / − restent là tant qu'il y a un point à poser OU un à reprendre. */
  const montrerPoints = pointsEnPlus > 0 || poses > 0
  const [enMain, setEnMain] = useState<number | null>(null)
  const utilises = Object.values(fiche.caracs ?? {}).filter((v) => v !== undefined)
  const donsEnTrop = surplusDons(fiche)
  const languesEnTrop = surplusLangues(fiche)

  function toucherCarac(cle: CleCarac) {
    const caracs = { ...(fiche.caracs ?? {}) }
    if (enMain !== null) {
      for (const autre of ['p', 'r', 'e'] as CleCarac[]) {
        if (caracs[autre] === enMain) caracs[autre] = undefined
      }
      caracs[cle] = enMain
      setEnMain(null)
      onMaj({ ...fiche, caracs })
    } else if (caracs[cle] !== undefined) {
      setEnMain(caracs[cle])
      caracs[cle] = undefined
      onMaj({ ...fiche, caracs })
    }
  }

  function majExtra(cle: CleCarac, delta: 1 | -1) {
    const valeur = extras[cle] + delta
    if (valeur < 0) return
    if (delta > 0 && (poses >= pointsEnPlus || valeurCarac(fiche, cle) >= max)) return
    onMaj({ ...fiche, extras: { ...extras, [cle]: valeur } })
  }

  return (
    <section>
      <h2 className="titre-etape">Tes forces</h2>
      <Tutoriel
        etapeId="forces"
        gestes={[
          'Prends un jeton doré (3, 2 ou 1).',
          'Pose-le sur une caractéristique en la touchant.',
          'Répète pour les trois jetons — chacun ne sert qu’une fois.',
          'Sous chaque caractéristique, la table montre le bonus de chaque palier : les paliers atteints s’allument et s’additionnent.',
          ...(pointsEnPlus > 0
            ? [
                `Place ensuite tes ${pointsEnPlus} point${pointsEnPlus > 1 ? 's' : ''} de caractéristique en plus avec les + à droite — aucune caractéristique ne va au-delà de ${max}.`,
              ]
            : []),
        ]}
        pourquoi={`« ${regles.caracteristiques.creation.verbatim} »`}
      />

      <div className="mb-2 text-center text-[14.5px] text-muted-foreground">
        {enMain !== null ? (
          <>
            Jeton <b>{enMain}</b> en main — touche une caractéristique.
          </>
        ) : (
          'Prends un jeton, puis pose-le.'
        )}
      </div>
      <div className="my-3 flex justify-center gap-3">
        {jetons.map((jeton) => {
          const utilise = utilises.includes(jeton)
          return (
            <button
              key={jeton}
              type="button"
              disabled={utilise}
              aria-pressed={enMain === jeton}
              onClick={() => setEnMain(enMain === jeton ? null : jeton)}
              className={`flex h-14 w-14 items-center justify-center rounded-full border-2 font-wordmark text-2xl font-extrabold text-gold transition-transform ${
                enMain === jeton
                  ? 'scale-105 border-gold shadow-[0_0_0_3px_#f2b13533]'
                  : 'border-gold/40'
              } ${utilise ? 'pointer-events-none opacity-20' : ''}`}
              style={{
                background:
                  'radial-gradient(circle at 35% 30%, oklch(var(--gold) / 0.15), oklch(var(--card)))',
              }}
            >
              {jeton}
            </button>
          )
        })}
      </div>

      {CARACS.map(({ cle, table, nom, sousTitre, couleur }) => {
        const jeton = fiche.caracs?.[cle]
        const valeur = valeurCarac(fiche, cle)
        const paliers = regles.caracteristiques.table[table]
        return (
          <div key={cle}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => toucherCarac(cle)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  toucherCarac(cle)
                }
              }}
              className="mt-2 flex cursor-pointer items-center gap-2.5 rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm px-3.5 py-3"
            >
              <div className="flex-1">
                <b className={`text-lg ${couleur}`}>{nom}</b>
                <small className="block text-muted-foreground">{sousTitre}</small>
              </div>
              {montrerPoints && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={extras[cle] === 0}
                    onClick={(e) => {
                      e.stopPropagation()
                      majExtra(cle, -1)
                    }}
                    aria-label={`${nom} : retirer un point de caractéristique`}
                    className="h-11 w-11 rounded-full border-[1.5px] border-border/50 bg-input text-[17px] disabled:opacity-30"
                  >
                    −
                  </button>
                  <span className="badge badge-gold">+{extras[cle]}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      majExtra(cle, 1)
                    }}
                    aria-label={`${nom} : ajouter un point de caractéristique`}
                    className="h-11 w-11 rounded-full border-[1.5px] border-border/50 bg-input text-[17px]"
                  >
                    +
                  </button>
                </div>
              )}
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-full border-2 font-wordmark text-xl font-extrabold ${
                  jeton !== undefined
                    ? 'border-solid border-gold bg-gold/10 text-gold'
                    : 'border-dashed border-border text-muted-foreground'
                }`}
              >
                {jeton !== undefined ? `${jeton}${extras[cle] ? `+${extras[cle]}` : ''}` : ''}
              </div>
            </div>
            <div className="mb-3 mt-1 flex flex-wrap gap-1.5 pl-0.5">
              {Object.entries(paliers).map(([niveau, effet]) => {
                const atteint = valeur >= Number(niveau)
                return (
                  <span
                    key={niveau}
                    className={`rounded-lg border px-2 py-0.5 font-sans text-xs ${
                      atteint
                        ? 'border-gold/40 bg-gold/10 text-gold'
                        : 'border-border/50 bg-input text-muted-foreground'
                    }`}
                  >
                    <b className={`mr-1 ${atteint ? 'text-gold' : 'text-muted-foreground'}`}>{niveau}</b>
                    {effet}
                  </span>
                )
              })}
            </div>
          </div>
        )
      })}

      {montrerPoints && (
        <Note>
          <b>
            {pointsEnPlus} point{pointsEnPlus > 1 ? 's' : ''}
          </b>{' '}
          de caractéristique à placer en plus ({poses}/{pointsEnPlus})
          {pointsNiveau > 0 && ` — dont ${pointsNiveau} de ton niveau ${niveau}`}
          {pointsHeritage > 0 && ` — dont ${pointsHeritage} d’héritage`} — maximum {max} par
          caractéristique.
        </Note>
      )}
      {caracsEnTrop > 0 && (
        <ErreurNote>
          Retire {caracsEnTrop} point{caracsEnTrop > 1 ? 's' : ''} de caractéristique : ton droit
          a baissé.
        </ErreurNote>
      )}
      {valeurCarac(fiche, 'e') === 1 && (
        <Note>
          Esprit 1 : ton personnage est <b>Illettré</b> (table p.5).
        </Note>
      )}
      {valeurCarac(fiche, 'e') >= 3 && (
        <Note>
          Esprit 3 : <b>+1 don</b> et <b>+1 langue</b> — tu les choisiras aux étapes Talents et
          Langues.
        </Note>
      )}
      {(donsEnTrop > 0 || languesEnTrop > 0) && (
        <ErreurNote>
          Ton Esprit a baissé :{' '}
          {donsEnTrop > 0 && `retire ${donsEnTrop} don${donsEnTrop > 1 ? 's' : ''} (étape Talents)`}
          {donsEnTrop > 0 && languesEnTrop > 0 && ' et '}
          {languesEnTrop > 0 &&
            `retire ${languesEnTrop} langue${languesEnTrop > 1 ? 's' : ''} (étape Langues)`}
          .
        </ErreurNote>
      )}
    </section>
  )
}
