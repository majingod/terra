/**
 * Flux ≤11 — étape Métier (D24). Une compétence de niveau 1 parmi les
 * quatre de la planche (competencesEnfant()) ; le matériel se suggère, ne
 * s'exige jamais. L'app AFFICHE l'avantage avancé (atelier de faction rang
 * 2) — elle ne l'accorde jamais nulle part.
 */
import { competencesEnfant } from '../../../rules/kids'
import { changerMetierEnfant, choixEnfant } from '../../../wizard/enfant'
import type { Changement } from '../../../wizard/validation'
import type { FicheCreation } from '../../../wizard/types'
import { Badge, CarteChoix, TexteRegle, TitreCarte, Tutoriel } from '../ui'

interface Props {
  fiche: FicheCreation
  onChangement: (changement: Changement) => void
}

export default function EtapeMetierEnfant({ fiche, onChangement }: Props) {
  const choix = choixEnfant(fiche)
  return (
    <section>
      <h2 className="titre-etape">Ton métier</h2>
      <Tutoriel
        etapeId="enfant-metier"
        gestes={['Choisis le métier de ton personnage — tape une carte.']}
        pourquoi="ton métier te donne un avantage en jeu. Plus tard, l'atelier de ta faction (rang 2) pourra l'améliorer."
      />
      {competencesEnfant().map((competence) => (
        <CarteChoix
          key={competence.id}
          choisi={choix.competence === competence.id}
          onChoisir={() => {
            if (choix.competence === competence.id) return
            onChangement(changerMetierEnfant(fiche, competence.id))
          }}
        >
          <TitreCarte>{competence.nom_affichage ?? competence.nom}</TitreCarte>
          {competence.affichage ? (
            <TexteRegle source={{ affichage: competence.affichage }} />
          ) : (
            <>
              <TexteRegle source={{ verbatim: competence.description }} />
              <TexteRegle source={{ verbatim: competence.base }} />
            </>
          )}
          {competence.materiel && (
            <Badge>{`🎒 Apporte si tu peux : ${competence.materiel} — pas grave si tu n'en as pas.`}</Badge>
          )}
          <details
            className="mt-1.5 border-t border-border/30 pt-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            <summary className="cursor-pointer text-sm text-secondary-foreground">
              🔒 Avantage avancé — à l'atelier de faction rang 2
            </summary>
            <TexteRegle source={{ verbatim: competence.avance }} />
          </details>
        </CarteChoix>
      ))}
    </section>
  )
}
