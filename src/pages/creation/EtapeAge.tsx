/**
 * Étape 1 — Âge (D10 + A5) : première question, tranche '≤11' | '12+'.
 * « ≤11 » → écran de renvoi vers la feuille enfant à l'accueil du GN,
 * l'app n'est jamais bloquée (encyclopédie accessible).
 * Aucune date de naissance, aucun âge exact.
 */
import { Link } from 'react-router-dom'
import { getRules } from '../../rules/load'
import { trancheQuiContinue } from '../../wizard/validation'
import type { FicheCreation } from '../../wizard/types'
import { CarteChoix, Tutoriel } from './ui'

interface Props {
  fiche: FicheCreation
  onMaj: (fiche: FicheCreation) => void
}

export default function EtapeAge({ fiche, onMaj }: Props) {
  const seuil = getRules().age_et_gates.seuil
  const renvoye = fiche.trancheAge !== undefined && fiche.trancheAge !== trancheQuiContinue()
  return (
    <section className="flex flex-col gap-4">
      <h1 className="titre-etape">Quel âge a le joueur ou la joueuse ?</h1>
      <Tutoriel
        etapeId="age"
        gestes={[
          'Touche la carte qui correspond à ton âge.',
          'Puis appuie sur Continuer.',
        ]}
        pourquoi={`« ${seuil.joueur_regulier} » et « ${seuil.enfant} » n'ont pas les mêmes règles de création. On ne demande ni ta date de naissance ni ton âge exact — seulement la tranche.`}
      />
      <CarteChoix
        choisi={fiche.trancheAge === trancheQuiContinue()}
        onChoisir={() => onMaj({ ...fiche, trancheAge: trancheQuiContinue() })}
      >
        <div className="font-titre text-xl font-bold">{seuil.joueur_regulier}</div>
        <p className="text-sm text-stone-300">Création complète sur cet assistant.</p>
      </CarteChoix>
      <CarteChoix
        choisi={renvoye}
        onChoisir={() => onMaj({ ...fiche, trancheAge: '≤11' })}
      >
        <div className="font-titre text-xl font-bold">{seuil.enfant}</div>
        <p className="text-sm text-stone-300">Création avec la feuille enfant, à l'accueil.</p>
      </CarteChoix>

      {renvoye && (
        <div className="panneau-w flex flex-col gap-3 border-or">
          <h2 className="font-titre text-lg font-bold text-or">Passe par l'accueil du GN</h2>
          <p>
            Pour les joueuses et joueurs de {seuil.enfant}, le personnage se crée avec la
            <strong> feuille enfant</strong>, disponible à l'accueil du GN — on t'y aidera.
          </p>
          <p className="text-sm text-stone-300">
            Tu peux quand même tout explorer ici en attendant :
          </p>
          <Link to="/encyclopedie" className="btn-continuer">
            Ouvrir l'encyclopédie
          </Link>
          <Link to="/" className="btn-secondaire !border-2 !text-base">
            Retour à l'accueil de l'app
          </Link>
        </div>
      )}
    </section>
  )
}
