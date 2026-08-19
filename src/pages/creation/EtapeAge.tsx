/**
 * Étape 1 — Âge (D10 + A5, maquette A v3) : tranche '≤11' | '12+', jamais
 * de date de naissance ni d'âge exact.
 *
 * Les deux tranches créent leur fiche dans l'app : la tranche enfant
 * s'embranche ici vers le flux de la planche (camp → niveau → classe → nom
 * → fiche), l'autre poursuit le wizard du Tome.
 */
import { getRules } from '../../rules/load'
import { trancheEnfant, trancheQuiContinue } from '../../wizard/validation'
import type { FicheCreation } from '../../wizard/types'
import { CarteChoix, TitreCarte, Tutoriel } from './ui'

interface Props {
  fiche: FicheCreation
  onMaj: (fiche: FicheCreation) => void
}

export default function EtapeAge({ fiche, onMaj }: Props) {
  const seuil = getRules().age_et_gates.seuil
  return (
    <section>
      <h2 className="titre-etape">Avant de commencer</h2>
      <Tutoriel
        etapeId="age"
        gestes={['Touche ta tranche d’âge.', 'C’est tout — on passe à la suite.']}
        pourquoi="chaque tranche a ses règles, et la suite de la création s’y adapte. On ne demande jamais ton nom ni ta date de naissance."
      />
      <CarteChoix
        choisi={fiche.trancheAge === trancheEnfant()}
        onChoisir={() => onMaj({ ...fiche, trancheAge: trancheEnfant() })}
      >
        <TitreCarte>{seuil.enfant}</TitreCarte>
        <p className="my-1 text-[15.5px] text-muted-foreground">
          Création avec les règles simplifiées de la planche de cartes.
        </p>
      </CarteChoix>
      <CarteChoix
        choisi={fiche.trancheAge === trancheQuiContinue()}
        onChoisir={() => onMaj({ ...fiche, trancheAge: trancheQuiContinue() })}
      >
        <TitreCarte>{seuil.joueur_regulier}</TitreCarte>
        <p className="my-1 text-[15.5px] text-muted-foreground">
          Création complète avec les règles du Tome.
        </p>
      </CarteChoix>
    </section>
  )
}
