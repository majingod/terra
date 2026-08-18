/**
 * Étape 9 — Fiche (maquette A v3) : le récapitulatif, le bouton
 * Imprimer/PDF (window.print() + feuille de style print : fiche seule,
 * noir sur blanc). « Créer la fiche » vit dans la barre du bas.
 */
import FicheAffichage from './FicheAffichage'
import type { FicheCreation } from '../../wizard/types'

export default function EtapeFiche({ fiche }: { fiche: FicheCreation }) {
  return (
    <section>
      <h2 className="titre-etape pas-a-imprimer">Ta fiche</h2>
      <FicheAffichage fiche={fiche} />
      <button
        type="button"
        className="btn-ghost pas-a-imprimer w-full"
        onClick={() => window.print()}
      >
        🖨 Imprimer / Enregistrer en PDF
      </button>
      <p className="note pas-a-imprimer">
        « Créer la fiche » l'enregistre sur ton appareil (elle reste dans « Mes fiches », export
        JSON toujours disponible) ; ce bouton imprime la fiche seule, en clair sur fond blanc.
      </p>
    </section>
  )
}
