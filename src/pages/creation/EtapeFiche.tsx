/**
 * Étape 9 — Fiche : récapitulatif D4 (l'acquis seulement), version des
 * règles lue du fichier, bouton Imprimer/PDF (window.print() + feuille de
 * style print : fiche seule, noir sur blanc) et enregistrement.
 */
import FicheAffichage from './FicheAffichage'
import { Tutoriel } from './ui'
import type { FicheCreation } from '../../wizard/types'

interface Props {
  fiche: FicheCreation
  onEnregistrer: () => void
}

export default function EtapeFiche({ fiche, onEnregistrer }: Props) {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="titre-etape pas-a-imprimer">Ta fiche</h1>
      <Tutoriel
        etapeId="fiche"
        gestes={[
          'Relis ta fiche — tout ce qui est acquis y est.',
          'Enregistre-la sur cet appareil.',
          'Si tu veux, imprime-la ou garde-la en PDF.',
        ]}
        pourquoi="La fiche vit sur ton téléphone, sans réseau. L'enregistrer la garde dans « Mes fiches » ; l'imprimer donne la version papier pour la table de jeu."
      />
      <FicheAffichage fiche={fiche} />
      <div className="pas-a-imprimer flex flex-col gap-3">
        <button type="button" className="btn-continuer" onClick={onEnregistrer}>
          Enregistrer la fiche
        </button>
        <button
          type="button"
          className="btn-secondaire !border-2 !text-base"
          onClick={() => window.print()}
        >
          Imprimer / PDF
        </button>
      </div>
    </section>
  )
}
