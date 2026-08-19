/**
 * Flux ≤11 — étape Niveau. Le joueur touche le niveau qu'il a déjà atteint ;
 * la planche décide de ce qui vient avec. Aucun chiffre n'est écrit ici :
 * les échelons proposés et ce qu'ils apportent viennent de la table de
 * rules_kids.json. Baisser son niveau passe par la fenêtre de répercussions.
 */
import {
  echelonsAcquisEnfant,
  niveauxPossiblesEnfant,
  normaliserNiveauEnfant,
} from '../../../rules/kids'
import { changerNiveauEnfant, choixEnfant } from '../../../wizard/enfant'
import type { Changement } from '../../../wizard/validation'
import type { FicheCreation } from '../../../wizard/types'
import { Badge, CarteChoix, TitreCarte, Tutoriel } from '../ui'

interface Props {
  fiche: FicheCreation
  onChangement: (changement: Changement) => void
}

export default function EtapeNiveauEnfant({ fiche, onChangement }: Props) {
  const niveau = normaliserNiveauEnfant(choixEnfant(fiche).niveau)
  return (
    <section>
      <h2 className="titre-etape">Ton niveau</h2>
      <Tutoriel
        etapeId="enfant-niveau"
        gestes={[
          'Touche le niveau de ton personnage.',
          'Niveau 1 si tu commences aujourd’hui — c’est déjà choisi pour toi.',
          'Si tu redescends plus tard, on te dira ce que tu perds avant de le faire.',
        ]}
        pourquoi="ton niveau décide combien de pouvoirs tu as, et combien de Lutte et de Dégâts tu ajoutes."
      />
      {niveauxPossiblesEnfant().map((valeur) => {
        const echelons = echelonsAcquisEnfant(valeur)
        const capacites = echelons.filter((ligne) => ligne.capacite).length
        const lutte = echelons.reduce((total, ligne) => total + (ligne.lutte ?? 0), 0)
        const degats = echelons.reduce((total, ligne) => total + (ligne.degats ?? 0), 0)
        return (
          <CarteChoix
            key={valeur}
            choisi={niveau === valeur}
            onChoisir={() => {
              if (niveau === valeur) return
              onChangement(changerNiveauEnfant(fiche, valeur))
            }}
          >
            <TitreCarte>Niveau {valeur}</TitreCarte>
            <p className="my-1">
              <Badge variante="gold">
                {capacites} pouvoir{capacites > 1 ? 's' : ''}
              </Badge>
              {lutte > 0 && <Badge variante="lutte">+{lutte} en Lutte</Badge>}
              {degats > 0 && <Badge variante="lutte">+{degats} en Dégâts</Badge>}
            </p>
          </CarteChoix>
        )
      })}
    </section>
  )
}
