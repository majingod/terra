/**
 * Flux ≤11 — étape Camp. Les deux factions, avec le texte enfant validé.
 * Le camp ne limite AUCUNE classe : n'importe quelle classe dans n'importe
 * quelle faction (règle lue du fichier, pas écrite ici).
 */
import { factionsEnfant, getRulesKids } from '../../../rules/kids'
import { avecChoixEnfant, choixEnfant } from '../../../wizard/enfant'
import type { FicheCreation } from '../../../wizard/types'
import { CarteChoix, Note, TexteRegle, TitreCarte, Tutoriel } from '../ui'

interface Props {
  fiche: FicheCreation
  onMaj: (fiche: FicheCreation) => void
}

export default function EtapeCampEnfant({ fiche, onMaj }: Props) {
  const choix = choixEnfant(fiche)
  return (
    <section>
      <h2 className="titre-etape">Choisis ton camp</h2>
      <Tutoriel
        etapeId="enfant-camp"
        gestes={['Lis les deux camps.', 'Touche celui que tu préfères.']}
        pourquoi="ton camp dit avec qui tu joues et comment ton personnage voit le monde. Il ne t’empêche de choisir aucune classe."
      />
      {factionsEnfant().map((faction) => {
        const peau = faction.id === 'legion' ? 'legion' : 'sanctum'
        return (
          <CarteChoix
            key={faction.id}
            choisi={choix.faction === faction.id}
            peau={peau}
            onChoisir={() => onMaj(avecChoixEnfant(fiche, { faction: faction.id }))}
          >
            <TitreCarte peau={peau}>{faction.nom}</TitreCarte>
            <TexteRegle source={faction} />
          </CarteChoix>
        )
      })}
      <Note>{getRulesKids().factions.regle_choix}</Note>
    </section>
  )
}
