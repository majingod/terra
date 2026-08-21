/**
 * Étape — « Ton niveau » (D12, D20). Le GN existe depuis deux ans : la plupart
 * des joueurs ne sont pas niveau 1. Le joueur dit toujours ici le niveau qu'il
 * joue — mais depuis D20 cette étape ne REMPLIT plus le niveau : elle fixe une
 * CIBLE. Le personnage naît au niveau 1, puis le train de montées le mène
 * jusque-là, un échelon à la fois, et chaque échelon est daté.
 *
 * D5 : ni les échelons proposés ni le nombre de dons ne sont écrits ici — ils
 * viennent de `evolution.table`.
 */
import {
  donsCumules,
  niveauMax,
  niveauMin,
  niveauxPossibles,
  normaliserNiveau,
  pointsCaracCumules,
  regleAuDelaDuPlafond,
} from '../../rules/niveau'
import { changerCible, type Changement } from '../../wizard/validation'
import type { FicheCreation } from '../../wizard/types'
import { Badge, CarteChoix, Note, TexteRegle, TitreCarte, Tutoriel } from './ui'

interface Props {
  fiche: FicheCreation
  onChangement: (changement: Changement) => void
}

export default function EtapeNiveau({ fiche, onChangement }: Props) {
  const cible = normaliserNiveau(fiche.cible)
  const depart = niveauMin()
  const plafond = niveauMax()

  return (
    <section>
      <h2 className="titre-etape">Ton niveau</h2>
      <Tutoriel
        etapeId="niveau"
        gestes={[
          'Touche le niveau que ton personnage a déjà atteint.',
          `Niveau ${depart} si tu commences aujourd’hui — c’est le défaut.`,
          `Ta fiche se crée au niveau ${depart}, puis tu montes les niveaux un par un, tout de suite après.`,
        ]}
        pourquoi="ton personnage a été niveau 1 avant d'être niveau 2 : en traversant chaque niveau, ta fiche garde la trace de ce que tu as gagné, et quand."
      />

      {niveauxPossibles().map((valeur) => {
        const dons = donsCumules(valeur)
        const points = pointsCaracCumules(valeur)
        return (
          <CarteChoix
            key={valeur}
            choisi={cible === valeur}
            onChoisir={() => {
              if (cible === valeur) return
              onChangement(changerCible(fiche, valeur))
            }}
          >
            <TitreCarte>Niveau {valeur}</TitreCarte>
            <p className="my-1">
              <Badge variante="gold">
                {dons} don{dons > 1 ? 's' : ''}
              </Badge>
              {points > 0 && (
                <Badge variante="gold">
                  {points} point{points > 1 ? 's' : ''} de caractéristique
                </Badge>
              )}
              <Badge>
                {valeur} capacité{valeur > 1 ? 's' : ''} à choisir
              </Badge>
            </p>
          </CarteChoix>
        )
      })}

      {cible > depart && (
        <Note>
          Tu vas d’abord remplir ton niveau {depart}. Ensuite, l’app t’emmène directement au niveau{' '}
          {depart + 1}, puis jusqu’au niveau {cible} — sans repasser par ta fiche entre chaque.
        </Note>
      )}

      <h2 className="titre-mini">Au-delà du niveau {plafond}</h2>
      <TexteRegle source={{ verbatim: regleAuDelaDuPlafond() }} />
      <Note>
        Le wizard s’arrête au niveau {plafond} : au-delà, vois ton MJ à l’accueil — ta fiche se
        complètera avec lui.
      </Note>
    </section>
  )
}
