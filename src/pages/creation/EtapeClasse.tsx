/**
 * Étape — Classe : toucher une classe la CHOISIT (avec fenêtre de
 * répercussions au besoin). La classe donne les PV, le Mana et les capacités
 * de base.
 *
 * D16 : il n'y a plus de choix de voie ici. Les capacités se choisissent une
 * par niveau, dans tout l'arbre de la classe, à l'étape « Tes capacités » qui
 * suit — la voie n'est plus qu'une étiquette portée par chaque capacité.
 */
import { capacitesDeBase } from '../../rules/branches'
import { normaliserNiveau } from '../../rules/niveau'
import { classesPourFaction } from '../../rules/stats'
import { changerClasse, type Changement } from '../../wizard/validation'
import type { FicheCreation } from '../../wizard/types'
import { Badge, CarteChoix, Note, TexteRegle, TitreCarte, Tutoriel } from './ui'

interface Props {
  fiche: FicheCreation
  onChangement: (changement: Changement) => void
}

export default function EtapeClasse({ fiche, onChangement }: Props) {
  const classes = fiche.faction ? classesPourFaction(fiche.faction) : []
  const niveau = normaliserNiveau(fiche.niveau)

  return (
    <section>
      <h2 className="titre-etape">Choisis ta classe</h2>
      <Tutoriel
        etapeId="classe"
        gestes={[
          'Touche la classe qui te parle : elle donne tes PV, ton Mana et tes capacités de base.',
          <>
            Tes capacités se choisissent à l’étape suivante — au niveau {niveau}, tu en choisis{' '}
            {niveau}.
          </>,
        ]}
        pourquoi="la classe donne tes PV, ton Mana et tes capacités de base ; les capacités, elles, se prennent une par niveau dans tout l'arbre de la classe."
      />
      {classes.map((classe) => {
        const ouverte = fiche.classe === classe.id
        return (
          <CarteChoix
            key={classe.id}
            choisi={ouverte}
            onChoisir={() => {
              if (ouverte) return
              onChangement(changerClasse(fiche, classe.id))
            }}
          >
            <TitreCarte>{classe.nom}</TitreCarte>
            <p className="my-1">
              <Badge variante="pv">{classe.pv_base} PV</Badge>
              <Badge variante="mana">{classe.mana_base} Mana</Badge>
              {classe.focus_requis && <Badge variante="lutte">Focus requis</Badge>}
              {classe.ressource_speciale && (
                <Badge variante="gold">{classe.ressource_speciale.nom}</Badge>
              )}
            </p>
            {capacitesDeBase(classe.id).map((capacite) => (
              <TexteRegle key={capacite.id} gras={capacite.nom} source={capacite} />
            ))}
            {classe.echange && <TexteRegle source={{ verbatim: classe.echange }} />}
            {classe.code && <TexteRegle gras="Code" source={{ verbatim: classe.code }} />}
            {classe.ressource_speciale && (
              <TexteRegle
                gras={classe.ressource_speciale.nom}
                source={classe.ressource_speciale}
              />
            )}

          </CarteChoix>
        )
      })}
      <Note>
        L'arbre entier de chaque classe vit dans l'encyclopédie. À l'étape suivante, tu choisis
        tes capacités dedans — une par niveau, n'importe quelle voie.
      </Note>
    </section>
  )
}
