/**
 * Étape 5 — Forces (maquette A v3) : trois jetons dorés (3-2-1, lus du
 * fichier) à prendre en main puis poser sur une caractéristique ; retoucher
 * une caractéristique remplie reprend son jeton. Paliers de la table p.5
 * affichés sous chaque caractéristique, allumés quand atteints (lecture
 * cumulative A4). Points d'héritage en plus, plafond lu du fichier.
 */
import { useState } from 'react'
import { repartitionAttendue } from '../../rules/caracs'
import { totalAchats } from '../../rules/heritage'
import { getRules } from '../../rules/load'
import { valeurCarac } from '../../rules/stats'
import { surplusDons, surplusLangues } from '../../wizard/validation'
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
    couleur: 'text-[#e06060]',
  },
  {
    cle: 'r',
    table: 'resistance',
    nom: 'Résistance',
    sousTitre: 'Points de vie et sauvegardes',
    couleur: 'text-[#66c284]',
  },
  {
    cle: 'e',
    table: 'esprit',
    nom: 'Esprit',
    sousTitre: 'Mana, dons et langues',
    couleur: 'text-[#6fa8ef]',
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
  const pointsHeritage = totalAchats(fiche.achats, 'carac')
  const extras = fiche.extras ?? { p: 0, r: 0, e: 0 }
  const poses = extras.p + extras.r + extras.e
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
    if (delta > 0 && (poses >= pointsHeritage || valeurCarac(fiche, cle) >= max)) return
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
          ...(pointsHeritage > 0
            ? [`Place ensuite ton point d’héritage avec les + à droite (max ${max}).`]
            : []),
        ]}
        pourquoi={`« ${regles.caracteristiques.creation.verbatim} »`}
      />

      <div className="mb-2 text-center text-[14.5px] text-[#96a0b1]">
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
              className={`flex h-14 w-14 items-center justify-center rounded-full border-2 font-wordmark text-2xl font-extrabold text-or transition-transform ${
                enMain === jeton
                  ? 'scale-105 border-or shadow-[0_0_0_3px_#f2b13533]'
                  : 'border-[#6b4d12]'
              } ${utilise ? 'pointer-events-none opacity-20' : ''}`}
              style={{ background: 'radial-gradient(circle at 35% 30%, #2a1f08, #161005)' }}
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
              className="mt-2 flex cursor-pointer items-center gap-2.5 rounded-[14px] border border-ligne bg-panneau px-3.5 py-3"
            >
              <div className="flex-1">
                <b className={`text-lg ${couleur}`}>{nom}</b>
                <small className="block text-[#96a0b1]">{sousTitre}</small>
              </div>
              {pointsHeritage > 0 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={extras[cle] === 0}
                    onClick={(e) => {
                      e.stopPropagation()
                      majExtra(cle, -1)
                    }}
                    aria-label={`${nom} : retirer un point d'héritage`}
                    className="h-11 w-11 rounded-full border-[1.5px] border-ligne bg-[#0b101b] text-[17px] disabled:opacity-30"
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
                    aria-label={`${nom} : ajouter un point d'héritage`}
                    className="h-11 w-11 rounded-full border-[1.5px] border-ligne bg-[#0b101b] text-[17px]"
                  >
                    +
                  </button>
                </div>
              )}
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-full border-2 font-wordmark text-xl font-extrabold ${
                  jeton !== undefined
                    ? 'border-solid border-or bg-[#1c1305] text-or'
                    : 'border-dashed border-[#3a4a63] text-[#6b7688]'
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
                        ? 'border-[#6b4d12] bg-[#1c1305] text-or'
                        : 'border-ligne bg-[#0b101b] text-[#6b7688]'
                    }`}
                  >
                    <b className={`mr-1 ${atteint ? 'text-or' : 'text-[#96a0b1]'}`}>{niveau}</b>
                    {effet}
                  </span>
                )
              })}
            </div>
          </div>
        )
      })}

      {pointsHeritage > 0 && (
        <Note>
          Héritage : <b>{pointsHeritage} point{pointsHeritage > 1 ? 's' : ''}</b> de
          caractéristique à placer en plus ({poses}/{pointsHeritage}) — maximum {max} par
          caractéristique.
        </Note>
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
