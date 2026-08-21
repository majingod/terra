/**
 * D17 — l'écran de montée de niveau, flux ≤11 (maquette
 * MAQUETTE_MONTER_NIVEAU_D17_v1, écran 3).
 *
 * La planche enfant ne demande AUCUN choix : l'échelon donne ce qu'il donne.
 * L'écran le montre — la capacité de la classe au complet quand l'échelon en
 * porte une, sinon ce que la table ajoute (Lutte, Dégâts) — et confirme.
 *
 * Les deux corpus ne se mélangent pas : tout vient de rules_kids.json, via
 * `gainsMonteeEnfant` et `capacitesEnfantAcquises`. Les stats ne sont pas
 * stockées : elles se recalculent du niveau.
 */
import { capacitesEnfantAcquises, type CapaciteEnfant } from '../../rules/kids'
import { gainsMonteeEnfant } from '../../rules/montee'
import type { Personnage } from '../../db'
import { libelleChapeau, libelleConfirmer, libelleMonter } from '../../wizard/montee'
import { Badge, TexteRegle } from '../creation/ui'

function CarteGain({ titre, children }: { titre: string; children?: React.ReactNode }) {
  return (
    <div className="my-3 rounded-lg border border-border/50 bg-card/50 p-3.5 backdrop-blur-sm">
      <h3 className="m-0 mb-2 font-titre text-xl font-bold text-gold">{titre}</h3>
      {children}
    </div>
  )
}

interface Props {
  personnage: Personnage
  niveauAtteint: number
  onConfirmer: () => void
  onAnnuler: () => void
}

export default function EcranMonteeEnfant({
  personnage,
  niveauAtteint,
  onConfirmer,
  onAnnuler,
}: Props) {
  const gains = gainsMonteeEnfant(niveauAtteint)
  const classeId = personnage.creation?.enfant?.classe
  const capacite: CapaciteEnfant | undefined = gains.capacite
    ? capacitesEnfantAcquises(classeId, niveauAtteint).find((c) => c.niveau === niveauAtteint)
    : undefined

  return (
    <section>
      <h2 className="titre-etape">{libelleMonter(niveauAtteint)}</h2>
      <p className="my-2 text-[15.5px] text-muted-foreground">{libelleChapeau(niveauAtteint)}</p>

      {capacite && (
        <CarteGain titre="Ta nouvelle capacité">
          <b>{capacite.nom_affichage ?? capacite.nom}</b>{' '}
          <Badge variante="gold">niveau {capacite.niveau}</Badge>
          <TexteRegle source={capacite} />
        </CarteGain>
      )}
      {/* Les libellés portent le chiffre de la table, jamais un chiffre écrit ici. */}
      {gains.lutte > 0 && <CarteGain titre={`+${gains.lutte} Lutte`} />}
      {gains.degats > 0 && <CarteGain titre={`+${gains.degats} Dégâts`} />}

      <div className="mt-4 flex gap-2.5">
        <button type="button" className="btn-ghost flex-none" onClick={onAnnuler}>
          Annuler
        </button>
        <button type="button" className="btn-cta" onClick={onConfirmer}>
          {libelleConfirmer(niveauAtteint)}
        </button>
      </div>
    </section>
  )
}
