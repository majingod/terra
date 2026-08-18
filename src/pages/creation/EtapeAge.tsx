/**
 * Étape 1 — Âge (D10 + A5, maquette A v3) : tranche '≤11' | '12+', jamais
 * de date de naissance ni d'âge exact. « ≤11 » → écran feuille enfant,
 * l'app n'est jamais bloquée (encyclopédie accessible).
 */
import { Link } from 'react-router-dom'
import { getRules } from '../../rules/load'
import { trancheQuiContinue } from '../../wizard/validation'
import type { FicheCreation } from '../../wizard/types'
import { CarteChoix, TitreCarte, Tutoriel } from './ui'

interface Props {
  fiche: FicheCreation
  onMaj: (fiche: FicheCreation) => void
}

export default function EtapeAge({ fiche, onMaj }: Props) {
  const seuil = getRules().age_et_gates.seuil
  const renvoye = fiche.trancheAge !== undefined && fiche.trancheAge !== trancheQuiContinue()
  return (
    <section>
      <h2 className="titre-etape">Avant de commencer</h2>
      <Tutoriel
        etapeId="age"
        gestes={['Touche ta tranche d’âge.', 'C’est tout — on passe à la suite.']}
        pourquoi="chaque tranche a ses règles. On ne demande jamais ton nom ni ta date de naissance."
      />
      <CarteChoix choisi={renvoye} onChoisir={() => onMaj({ ...fiche, trancheAge: '≤11' })}>
        <TitreCarte>{seuil.enfant}</TitreCarte>
        <p className="my-1 text-[15.5px] text-[#96a0b1]">
          Fiche papier simplifiée, pensée pour toi.
        </p>
      </CarteChoix>
      <CarteChoix
        choisi={fiche.trancheAge === trancheQuiContinue()}
        onChoisir={() => onMaj({ ...fiche, trancheAge: trancheQuiContinue() })}
      >
        <TitreCarte>{seuil.joueur_regulier}</TitreCarte>
        <p className="my-1 text-[15.5px] text-[#96a0b1]">Création complète dans l'app.</p>
      </CarteChoix>

      {renvoye && (
        <div className="px-2 py-6 text-center">
          <div aria-hidden className="text-[44px]">
            💀
          </div>
          <h2 className="titre-etape">Ta fiche est sur papier !</h2>
          <p className="text-[17px] text-[#96a0b1]">
            Les {seuil.enfant} jouent avec la <b>feuille enfant</b>, plus simple et plus le fun.
            <br />
            Demande-la à l'accueil du GN.
          </p>
          <p className="text-[17px] text-[#96a0b1]">
            L'app reste ouverte pour toi : l'encyclopédie est pour tout le monde.
          </p>
          <Link to="/encyclopedie" className="btn-ghost my-1.5 w-full">
            Consulter l'encyclopédie
          </Link>
          <button
            type="button"
            className="btn-ghost w-full"
            onClick={() => onMaj({ ...fiche, trancheAge: undefined })}
          >
            ↩ Changer ma réponse
          </button>
        </div>
      )}
    </section>
  )
}
