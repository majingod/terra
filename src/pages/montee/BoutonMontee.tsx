/**
 * D17 — le bouton de montée au bas de la fiche, et la ligne qui le remplace
 * au plafond de la table (maquette écrans 1 et 4).
 *
 * Les deux portent `pas-a-imprimer` : la feuille papier ne montre jamais un
 * bouton d'app, ni une ligne qui parle au joueur plutôt qu'au personnage.
 * D12 : au-delà du dernier échelon, « vois ton MJ » — le plafond vient de la
 * table du corpus concerné, jamais d'un 5 écrit ici.
 */
import { libelleMonter, libellePlafond } from '../../wizard/montee'

export default function BoutonMontee({
  niveauAtteint,
  plafond,
  onMonter,
}: {
  /** Le niveau atteignable — absent quand la table s'arrête là. */
  niveauAtteint?: number
  plafond: number
  onMonter: () => void
}) {
  if (niveauAtteint === undefined) {
    return (
      <p className="pas-a-imprimer my-0 rounded-lg border border-dashed border-border/50 px-3 py-2.5 text-center text-[15px] text-muted-foreground">
        {libellePlafond(plafond)}
      </p>
    )
  }
  return (
    <button type="button" className="pas-a-imprimer btn-grand" onClick={onMonter}>
      {libelleMonter(niveauAtteint)}
    </button>
  )
}
