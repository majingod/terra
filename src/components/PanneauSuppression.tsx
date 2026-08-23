/**
 * D23 — le panneau de suppression, ouvert sous la carte d'une fiche.
 *
 * C'est le PREMIER geste : l'ouvrir n'efface rien. Il nomme le personnage
 * (⛔ jamais une confirmation générique), reloge le message « ta fiche vit sur
 * cet appareil » là où il compte vraiment — au bord de l'effacement, pas à la
 * fin du wizard — et offre l'export sans jamais l'exiger.
 *
 * Les libellés sont VERBATIM (maquette validée) : ils ne se reformulent pas.
 *
 * Identique pour les ≤11 et les 12+ : même parcours, mêmes mots, mêmes gestes.
 */
import BoutonMaintien from './BoutonMaintien'

/** Le message relogé de D23, mot pour mot. */
export const AVERTISSEMENT_SUPPRESSION =
  'Ta fiche vit seulement sur cet appareil. Une fois supprimée, elle ne pourra pas être récupérée.'

interface Props {
  /** Le nom affiché du personnage — « Sans nom » quand la fiche n'en porte pas. */
  nom: string
  onExporter: () => void
  onSupprimer: () => void
  onAnnuler: () => void
}

export default function PanneauSuppression({ nom, onExporter, onSupprimer, onAnnuler }: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-destructive bg-destructive/10 p-4">
      <p className="text-foreground">
        Supprimer <strong className="font-bold text-destructive-foreground">{nom}</strong> pour de
        bon ?
      </p>

      <p className="rounded-md border-l-2 border-l-gold bg-card/50 px-3 py-2 text-[15px] text-secondary-foreground">
        {AVERTISSEMENT_SUPPRESSION}
      </p>

      {/* Offert, jamais exigé : supprimer sans exporter fonctionne. */}
      <button type="button" className="btn-ghost" onClick={onExporter}>
        Exporter d'abord (fichier JSON)
      </button>

      <BoutonMaintien onMaintienComplet={onSupprimer}>Maintiens pour supprimer</BoutonMaintien>

      <button type="button" className="btn-ghost" onClick={onAnnuler}>
        Annuler
      </button>
    </div>
  )
}
