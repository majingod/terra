/**
 * Flux ≤11 — dernière étape : la fiche et son impression (même feuille de
 * style print que le 12+ : la fiche seule, en clair sur fond blanc).
 * « Créer ma fiche » vit dans la barre du bas.
 */
import FicheEnfantAffichage from './FicheEnfantAffichage'
import type { FicheCreation } from '../../../wizard/types'

export default function EtapeFicheEnfant({ fiche }: { fiche: FicheCreation }) {
  return (
    <section>
      <h2 className="titre-etape pas-a-imprimer">Ta fiche</h2>
      <FicheEnfantAffichage fiche={fiche} />
      <button
        type="button"
        className="btn-ghost pas-a-imprimer w-full"
        onClick={() => window.print()}
      >
        🖨 Imprimer / Enregistrer en PDF
      </button>
    </section>
  )
}
