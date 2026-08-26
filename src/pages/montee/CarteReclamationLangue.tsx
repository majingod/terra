/**
 * D19 ④ — la carte de RÉCLAMATION de la langue d'Esprit, sur l'écran Fiche.
 *
 * Sœur de `CarteReclamationPalier` (D19 ③) : même patron — visible depuis
 * `personnage.creation`, à tout niveau (Q2/Q5, t016), tant qu'un droit de
 * langue dort. Q6 (t016, 2026-08-26) l'ouvre à la Langue des morts pour le
 * sorcier et le chevalier de la mort — le bassin (`languesProposables`) le
 * décide seul, cette carte ne connaît aucune règle de classe.
 *
 * Discrète, hors zone d'impression (`pas-a-imprimer`) — la feuille du
 * terrain ne connaît pas les boutons de l'app.
 */
import { useState } from 'react'
import { droitLangues, languesProposables } from '../../rules/langues'
import { valeurCarac } from '../../rules/stats'
import type { Personnage } from '../../db'
import {
  libelleApprendreCetteLangue,
  libelleCarteLangueDuPalier,
  libelleRaisonLangueDuPalier,
} from '../../wizard/montee'

interface Props {
  personnage: Personnage
  onReclamer: (langueChoisie: string) => void
}

export default function CarteReclamationLangue({ personnage, onReclamer }: Props) {
  const [choisie, setChoisie] = useState<string | undefined>(undefined)
  const fiche = personnage.creation ?? {}
  const langChoix = fiche.langChoix ?? []
  const droit = droitLangues(valeurCarac(fiche, 'e'), fiche.comps ?? [])

  // Aucun droit en souffrance : la carte n'existe pas, comme sa sœur.
  if (langChoix.length >= droit) return null

  const options = languesProposables(fiche.race, fiche.classe).filter(
    (langue) => !langChoix.includes(langue.id),
  )

  return (
    <div className="pas-a-imprimer my-3 rounded-lg border border-dashed border-border/50 bg-card/40 p-3.5">
      <h3 className="m-0 mb-1 font-titre text-xl font-bold text-gold">
        {libelleCarteLangueDuPalier()}
      </h3>
      <p className="m-0 text-[15px] text-muted-foreground">{libelleRaisonLangueDuPalier()}</p>

      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((langue) => (
          <button
            key={langue.id}
            type="button"
            aria-pressed={choisie === langue.id}
            className={`chip ${choisie === langue.id ? 'chip-on' : ''}`}
            onClick={() => setChoisie(choisie === langue.id ? undefined : langue.id)}
          >
            {langue.nom}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="btn-cta mt-3"
        disabled={choisie === undefined}
        onClick={() => onReclamer(choisie as string)}
      >
        {libelleApprendreCetteLangue()}
      </button>
    </div>
  )
}
