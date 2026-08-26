/**
 * D20 lot 2 · C4 — la garde d'intention de la montée (Q4, t016, Fred
 * 2026-08-26).
 *
 * Une montée est un geste LOURD : elle s'ajoute à la fiche pour de bon. Entre
 * le toucher du bouton et l'écran de montée, l'app demande donc de la volonté
 * — le même geste que la suppression (D23) : un maintien de `DUREE_MAINTIEN_MS`.
 *
 * La fenêtre NOMME le personnage et le niveau visé : ⛔ jamais une
 * confirmation générique, ici pas plus qu'au bord de l'effacement.
 *
 * ⛔ Cette garde ne vaut PAS pour le train de création : la cible choisie à
 * l'étape « Ton niveau » EST l'intention, et trois maintiens d'affilée
 * puniraient le chemin normal. Elle ne vaut pas non plus pour la correction
 * par pastille : sa fenêtre de répercussions est sa garde.
 *
 * ⚠️ ≤11 : elle s'applique aussi — le bouton de montée est partagé, et une
 * montée d'enfant s'ajoute à sa fiche exactement comme celle d'un 12+.
 *
 * `BoutonMaintien` est réutilisé TEL QUEL : auto-répétition clavier,
 * `touch-action`, `contextmenu` Android et chrono testable y sont déjà réglés
 * et gatés (D23 · G2).
 */
import BoutonMaintien from '../../components/BoutonMaintien'

/** La question de la fenêtre — elle nomme le personnage et le niveau visé. */
export function libelleIntentionMontee(nom: string, niveauAtteint: number): string {
  return `Tu t'apprêtes à monter ${nom} au niveau ${niveauAtteint} — cette montée s'ajoutera à sa fiche.`
}

/** Le libellé du bouton à maintien, verbatim. */
export const LIBELLE_MAINTIEN_MONTEE = 'Maintiens pour monter'

interface Props {
  /** Le nom affiché du personnage — « Sans nom » quand la fiche n'en porte pas. */
  nom: string
  niveauAtteint: number
  onMonter: () => void
  onAnnuler: () => void
}

export default function FenetreIntentionMontee({
  nom,
  niveauAtteint,
  onMonter,
  onAnnuler,
}: Props) {
  return (
    <div className="pas-a-imprimer flex flex-col gap-3 rounded-lg border border-primary/60 bg-card p-4">
      <p className="m-0 text-foreground">{libelleIntentionMontee(nom, niveauAtteint)}</p>

      <BoutonMaintien onMaintienComplet={onMonter}>{LIBELLE_MAINTIEN_MONTEE}</BoutonMaintien>

      <button type="button" className="btn-ghost" onClick={onAnnuler}>
        Annuler
      </button>
    </div>
  )
}
