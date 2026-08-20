/**
 * L'entrée d'installation, sur l'Accueil — la seule porte vers « garder
 * Terra Mortis sur son écran d'accueil ».
 *
 * Le terrain est sans signal fiable : un joueur qui arrive avec l'app
 * ouverte dans un onglet, mais pas installée, perd sa fiche dès que la page
 * se recharge. L'installation n'est pas un confort, c'est la condition pour
 * que l'app existe sur place.
 *
 * La rangée est donc TOUJOURS là tant que l'app n'est pas installée, dans le
 * flot de la page — jamais un bandeau flottant, jamais une modale au
 * chargement, et ⛔ sans bouton « fermer » : c'est exactement ce qui rendait
 * l'ancien bandeau introuvable ensuite.
 *
 *   1. le navigateur offre l'installation → bouton « Installer » ;
 *   2. le navigateur se tait → bouton « Comment faire », qui ouvre les
 *      gestes à faire, navigateur par navigateur ;
 *   3. l'app tourne déjà installée → rien du tout.
 */
import { useState, useSyncExternalStore, type ReactNode } from 'react'
import {
  dejaInstallee,
  offreRetenue,
  passerLaMainAuNavigateur,
  sAbonner,
} from '../pwa/offreInstallation'

type Onglet = 'android' | 'samsung' | 'ios'

const ONGLETS: { id: Onglet; libelle: string }[] = [
  { id: 'android', libelle: 'Android' },
  { id: 'samsung', libelle: 'Samsung' },
  { id: 'ios', libelle: 'iPhone / iPad' },
]

const PAS: Record<Onglet, string[]> = {
  android: [
    'Touche les trois points ⋮ en haut à droite de Chrome.',
    'Choisis « Ajouter à l’écran d’accueil ».',
    'Confirme avec « Installer ».',
  ],
  samsung: [
    'Touche le menu ☰ en bas à droite de Samsung Internet.',
    'Choisis « Ajouter la page à ».',
    'Choisis « Écran d’accueil ».',
  ],
  ios: [
    'Touche le bouton Partager, en bas de l’écran (le carré avec une flèche vers le haut).',
    'Fais défiler et choisis « Sur l’écran d’accueil ».',
    'Touche « Ajouter », en haut à droite.',
  ],
}

/**
 * L'onglet ouvert en premier, deviné de l'agent. ⚠️ Une devinette est une
 * COMMODITÉ, jamais un filtre : les trois onglets restent atteignables sur
 * tous les appareils.
 */
export function ongletDevine(agent: string): Onglet {
  if (/iPhone|iPad|iPod/i.test(agent)) return 'ios'
  if (/Samsung/i.test(agent)) return 'samsung'
  return 'android'
}

function FeuilleInstructions({ onFermer }: { onFermer: () => void }): ReactNode {
  const [onglet, setOnglet] = useState<Onglet>(() =>
    ongletDevine(typeof navigator === 'undefined' ? '' : navigator.userAgent),
  )

  return (
    <div
      className="pas-a-imprimer fixed inset-0 z-[100] flex items-end justify-center bg-black/60"
      onClick={onFermer}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Garder Terra Mortis sur ton écran d’accueil"
        className="terra-card max-h-[88dvh] w-full max-w-[440px] overflow-y-auto rounded-b-none p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div aria-hidden className="mx-auto mb-4 h-1 w-11 rounded-full bg-border" />

        <h2 className="terra-heading m-0 text-xl text-gold">
          Garder Terra Mortis sur ton écran d’accueil
        </h2>
        <p className="m-0 mb-4 mt-1 text-[15px] text-muted-foreground">
          Une fois installée, elle s’ouvre en un tap et fonctionne sans réseau, sur le terrain.
        </p>

        <div role="tablist" aria-label="Choisis ton navigateur" className="mb-4 flex gap-2">
          {ONGLETS.map((o) => (
            <button
              key={o.id}
              type="button"
              role="tab"
              aria-selected={onglet === o.id}
              className={`subsel-btn min-h-touch ${onglet === o.id ? 'subsel-btn-on' : ''}`}
              onClick={() => setOnglet(o.id)}
            >
              {o.libelle}
            </button>
          ))}
        </div>

        <ol className="m-0 flex list-decimal flex-col gap-2 pl-5 text-[16px] leading-snug">
          {PAS[onglet].map((pas) => (
            <li key={pas}>{pas}</li>
          ))}
        </ol>

        <p className="note">
          Comment savoir que ça a marché : l’icône Terra Mortis apparaît sur ton écran d’accueil,
          et quand tu l’ouvres, la barre d’adresse du navigateur a disparu.
        </p>

        <button type="button" className="btn-secondaire mt-4" onClick={onFermer}>
          Fermer
        </button>
      </div>
    </div>
  )
}

export default function EntreeInstallation() {
  // L'offre est retenue hors de React : elle peut être arrivée AVANT ce
  // rendu, et l'abonnement la sert quand même.
  const offre = useSyncExternalStore(sAbonner, offreRetenue, () => null)
  const installee = useSyncExternalStore(sAbonner, dejaInstallee, () => false)
  const [instructions, setInstructions] = useState(false)

  if (installee) return null

  return (
    <>
      <div className="carte pas-a-imprimer flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="terra-heading text-[16px] text-gold">Installer l’app</div>
          <p className="m-0 mt-0.5 text-[15px] leading-snug text-muted-foreground">
            Sur ton écran d’accueil, elle s’ouvre sans réseau.
          </p>
        </div>

        {offre ? (
          <button
            type="button"
            className="btn-cta min-h-touch flex-none"
            onClick={passerLaMainAuNavigateur}
          >
            Installer
          </button>
        ) : (
          <button
            type="button"
            className="btn-ghost min-h-touch flex-none"
            onClick={() => setInstructions(true)}
          >
            Comment faire
          </button>
        )}
      </div>

      {instructions && <FeuilleInstructions onFermer={() => setInstructions(false)} />}
    </>
  )
}
