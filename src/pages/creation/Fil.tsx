/**
 * Le fil de progression à DEUX étages (MAQUETTE_FIL_D20_v2, validée) :
 * « TON PERSONNAGE » — les étapes de la création — puis « TES NIVEAUX » — les
 * échelons que le personnage traverse.
 *
 * ⛔ Les pastilles s'ENROULENT (`flex-wrap`). Jamais de défilement horizontal :
 * une rangée qui défile cache des pastilles sans le dire. ⛔ Aucune media
 * query — l'enroulement s'adapte seul, du plus petit téléphone à la tablette.
 *
 * Dans ce lot le second étage est en AFFICHAGE SEUL : les pastilles de niveau
 * ne se touchent pas pour revenir en arrière. Le retour rétroactif et sa
 * fenêtre de répercussions sont le lot 2.
 */
import { niveauxPossibles } from '../../rules/niveau'
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

/** L'étage « TES NIVEAUX » — affichage seul (lot 1). */
export function PastillesNiveaux({ ici }: { ici: number }) {
  return (
    <nav aria-label="Tes niveaux" className="pb-1">
      <ol className="m-0 flex list-none flex-wrap gap-2 p-0 px-1 py-1">
        {niveauxPossibles().map((niveau) => {
          const etat: EtatNiveau = niveau < ici ? 'fait' : niveau === ici ? 'ici' : 'aVenir'
          return (
            <li key={niveau} className="flex-none">
              <span
                aria-label={`Niveau ${niveau} — ${MOT[etat]}`}
                aria-current={etat === 'ici' ? 'step' : undefined}
                className={`flex h-8 min-w-8 items-center justify-center rounded-full border-[1.5px] px-2 font-sans text-[13px] ${HABILLAGE[etat]}`}
              >
                {niveau}
              </span>
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
      <PastillesNiveaux ici={ici} />
    </div>
  )
}
