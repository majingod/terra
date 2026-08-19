/**
 * Étape — « Ton niveau » (D12). Le GN existe depuis deux ans : la plupart des
 * joueurs ne sont pas niveau 1. Le joueur entre son niveau, et le Tome lui
 * donne ce qui va avec.
 *
 * D5 : ni les échelons proposés ni le nombre de dons ne sont écrits ici — ils
 * viennent de `evolution.table`. Baisser le niveau passe par la fenêtre de
 * répercussions existante (changerNiveau).
 */
import {
  donsCumules,
  niveauMax,
  niveauxPossibles,
  normaliserNiveau,
  regleAuDelaDuPlafond,
} from '../../rules/niveau'
import { changerNiveau, type Changement } from '../../wizard/validation'
import type { FicheCreation } from '../../wizard/types'
import { Badge, CarteChoix, Note, TexteRegle, TitreCarte, Tutoriel } from './ui'

interface Props {
  fiche: FicheCreation
  onChangement: (changement: Changement) => void
}

export default function EtapeNiveau({ fiche, onChangement }: Props) {
  const niveau = normaliserNiveau(fiche.niveau)
  const plafond = niveauMax()

  return (
    <section>
      <h2 className="titre-etape">Ton niveau</h2>
      <Tutoriel
        etapeId="niveau"
        gestes={[
          'Touche le niveau que ton personnage a déjà atteint.',
          'Niveau 1 si tu commences aujourd’hui — c’est le défaut.',
          'Baisser ton niveau après coup te dira ce qu’il faudra retirer.',
        ]}
        pourquoi="ton niveau décide combien de dons tu choisis et quelles capacités de ta voie tu tiens déjà."
      />

      {niveauxPossibles().map((valeur) => {
        const dons = donsCumules(valeur)
        return (
          <CarteChoix
            key={valeur}
            choisi={niveau === valeur}
            onChoisir={() => {
              if (niveau === valeur) return
              onChangement(changerNiveau(fiche, valeur))
            }}
          >
            <TitreCarte>Niveau {valeur}</TitreCarte>
            <p className="my-1">
              <Badge variante="gold">
                {dons} don{dons > 1 ? 's' : ''}
              </Badge>
              <Badge>capacités de ta voie jusqu’à l’échelon {valeur}</Badge>
            </p>
          </CarteChoix>
        )
      })}

      <h2 className="titre-mini">Au-delà du niveau {plafond}</h2>
      <TexteRegle source={{ verbatim: regleAuDelaDuPlafond() }} />
      <Note>
        Le wizard s’arrête au niveau {plafond} : au-delà, vois ton MJ à l’accueil — ta fiche se
        complètera avec lui.
      </Note>
    </section>
  )
}
