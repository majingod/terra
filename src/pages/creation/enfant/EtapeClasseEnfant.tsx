/**
 * Flux ≤11 — étape Classe. Les quatre classes de la planche, avec leur Lutte
 * et leurs pouvoirs. Aucun pouvoir ne se choisit : ils viennent avec la
 * classe et le niveau. Ceux au-dessus du niveau du personnage sont montrés
 * comme à venir (même règle d'affichage progressif que la fiche 12+).
 */
import {
  capacitesEnfantAcquises,
  classesEnfant,
  normaliserNiveauEnfant,
  statsEnfant,
} from '../../../rules/kids'
import { avecChoixEnfant, choixEnfant } from '../../../wizard/enfant'
import type { FicheCreation } from '../../../wizard/types'
import { Badge, CarteChoix, TexteRegle, TitreCarte, Tutoriel } from '../ui'

interface Props {
  fiche: FicheCreation
  onMaj: (fiche: FicheCreation) => void
}

export default function EtapeClasseEnfant({ fiche, onMaj }: Props) {
  const choix = choixEnfant(fiche)
  const niveau = normaliserNiveauEnfant(choix.niveau)
  return (
    <section>
      <h2 className="titre-etape">Ta classe</h2>
      <Tutoriel
        etapeId="enfant-classe"
        gestes={[
          'Lis les quatre classes et leurs pouvoirs.',
          'Touche celle que tu veux jouer.',
        ]}
        pourquoi="ta classe donne ta Lutte et tes pouvoirs. Tu n’as rien d’autre à choisir : ils arrivent tout seuls avec ton niveau."
      />
      {classesEnfant().map((classe) => {
        const acquises = new Set(capacitesEnfantAcquises(classe.id, niveau).map((c) => c.id))
        const stats = statsEnfant(classe.id, niveau)
        return (
          <CarteChoix
            key={classe.id}
            choisi={choix.classe === classe.id}
            onChoisir={() => onMaj(avecChoixEnfant(fiche, { classe: classe.id }))}
          >
            <TitreCarte>{classe.nom}</TitreCarte>
            <p className="my-1">
              <Badge variante="lutte">Lutte {stats?.lutte ?? classe.lutte}</Badge>
              {stats && <Badge variante="pv">PV {stats.pv}</Badge>}
              {stats && <Badge variante="lutte">Dégâts {stats.degats}</Badge>}
            </p>
            {classe.capacites.map((capacite) => (
              <div key={capacite.id} className="border-t border-border/30 py-1.5 first:border-t-0">
                <b>{capacite.nom_affichage ?? capacite.nom}</b>{' '}
                <Badge variante={acquises.has(capacite.id) ? 'gold' : undefined}>
                  {acquises.has(capacite.id)
                    ? `niveau ${capacite.niveau} · tu l’as`
                    : `niveau ${capacite.niveau} · plus tard`}
                </Badge>
                <TexteRegle source={capacite} />
              </div>
            ))}
          </CarteChoix>
        )
      })}
    </section>
  )
}
