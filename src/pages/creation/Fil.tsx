/**
 * Le fil de progression à DEUX étages (MAQUETTE_FIL_D20_v2, validée) :
 * « TON PERSONNAGE » — les étapes de la création — puis « TES NIVEAUX » — les
 * échelons que le personnage traverse.
 *
 * ⛔ Les pastilles s'ENROULENT (`flex-wrap`). Jamais de défilement horizontal :
 * une rangée qui défile cache des pastilles sans le dire. ⛔ Aucune media
 * query — l'enroulement s'adapte seul, du plus petit téléphone à la tablette.
 *
 * D20 lot 2 — le RETOUR RÉTROACTIF : une pastille de niveau TRAVERSÉ (verte,
 * et à partir du deuxième échelon de la table) se touche, et rouvre la montée
 * de ce niveau-là avec les choix d'alors. Les niveaux au-dessus restent.
 *
 * ⛔ Ligne de coupe 1 : la pastille du PREMIER échelon ne se touche pas — ce
 * n'est pas une montée, c'est la création, et ses choix se corrigent déjà par
 * l'étage « TON PERSONNAGE ». La pastille « ici » et les pâles non plus : les
 * pâles se montent par le bouton de montée, comme aujourd'hui.
 *
 * Sans `onCorriger`, l'étage reste en AFFICHAGE SEUL, exactement comme au
 * lot 1 : c'est l'appelant qui ouvre le geste, jamais la rangée toute seule.
 */
import { niveauMin, niveauxPossibles } from '../../rules/niveau'
import Pastilles, { type EtapeDeStepper } from './Pastilles'

/** L'état d'une pastille de niveau (maquette : les trois seuls qui existent). */
type EtatNiveau = 'fait' | 'ici' | 'aVenir'

const HABILLAGE: Record<EtatNiveau, string> = {
  // verte = fait · orange plein = ici · pâle éteinte = pas encore atteint
  fait: 'border-chart-4/60 bg-chart-4 text-white',
  ici: 'border-primary bg-primary text-white',
  aVenir: 'border-border/50 bg-card/50 text-muted-foreground opacity-45',
}

const MOT: Record<EtatNiveau, string> = {
  fait: 'fait',
  ici: 'en cours',
  aVenir: 'pas encore atteint',
}

/** Ce que le lecteur d'écran annonce sur une pastille qui se touche. */
export function libelleCorrigerLeNiveau(niveau: number): string {
  return `Niveau ${niveau} — ${MOT.fait} · corriger tes choix`
}

/**
 * L'étage « TES NIVEAUX ».
 *
 * `onCorriger` allume le retour rétroactif : les niveaux TRAVERSÉS à partir
 * du deuxième échelon de la table deviennent touchables (halo discret). Sans
 * lui, rien ne se touche — l'étage reste en affichage seul.
 */
export function PastillesNiveaux({
  ici,
  onCorriger,
}: {
  ici: number
  onCorriger?: (niveau: number) => void
}) {
  const premier = niveauMin()
  return (
    <nav aria-label="Tes niveaux" className="pb-1">
      <ol className="m-0 flex list-none flex-wrap gap-2 p-0 px-1 py-1">
        {niveauxPossibles().map((niveau) => {
          const etat: EtatNiveau = niveau < ici ? 'fait' : niveau === ici ? 'ici' : 'aVenir'
          // ⛔ Seules les MONTÉES traversées se touchent : ni la création, ni
          // « ici », ni les pâles (elles se montent par le bouton de montée).
          const corrigeable = onCorriger !== undefined && etat === 'fait' && niveau > premier
          const peau = `flex h-8 min-w-8 items-center justify-center rounded-full border-[1.5px] px-2 font-sans text-[13px] ${HABILLAGE[etat]}`
          if (!corrigeable) {
            return (
              <li key={niveau} className="flex-none">
                <span
                  aria-label={`Niveau ${niveau} — ${MOT[etat]}`}
                  aria-current={etat === 'ici' ? 'step' : undefined}
                  className={peau}
                >
                  {niveau}
                </span>
              </li>
            )
          }
          return (
            <li key={niveau} className="flex-none">
              <button
                type="button"
                aria-label={libelleCorrigerLeNiveau(niveau)}
                onClick={() => onCorriger(niveau)}
                className={`${peau} ring-2 ring-chart-4/40`}
              >
                {niveau}
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

interface FilProps {
  etapes: readonly EtapeDeStepper[]
  valides: boolean[]
  etape: number
  onAller: (index: number) => void
  barre?: boolean
  /** Le niveau que le joueur remplit en ce moment (création : le niveau 1). */
  ici: number
  /** D20 lot 2 — allume le retour rétroactif sur les montées traversées. */
  onCorrigerLeNiveau?: (niveau: number) => void
  /** Fil figé : la fiche est créée, le train roule — plus rien ne se touche. */
  fige?: boolean
}

/** Un titre d'étage — un mot, pas un titre de page (pas un `heading`). */
function Etage({ children }: { children: React.ReactNode }) {
  return (
    <p className="m-0 px-1 pt-1 font-sans text-[11.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </p>
  )
}

export default function Fil({
  etapes,
  valides,
  etape,
  onAller,
  barre,
  ici,
  fige,
  onCorrigerLeNiveau,
}: FilProps) {
  return (
    <div className="pas-a-imprimer">
      <Etage>Ton personnage</Etage>
      <Pastilles
        etapes={etapes}
        valides={valides}
        etape={etape}
        onAller={onAller}
        barre={barre}
        fige={fige}
      />
      <Etage>Tes niveaux</Etage>
      <PastillesNiveaux ici={ici} onCorriger={onCorrigerLeNiveau} />
    </div>
  )
}
