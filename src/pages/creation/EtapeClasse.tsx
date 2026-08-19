/**
 * Étape — Classe : toucher une classe la CHOISIT (avec fenêtre de
 * répercussions au besoin) et ouvre ses trois voies dedans.
 *
 * D4-bis (t006) : au MOMENT DU CHOIX, le wizard montre l'ARBRE COMPLET de la
 * voie — les cinq échelons, verbatim complet, aucun réduit à un badge. Les
 * échelons que ton niveau te donne sont marqués « acquis » ; les suivants
 * sont montrés pour que tu saches où mène la voie. La fiche, elle, ne montre
 * que l'acquis.
 */
import { branchesDe, capacitesDeBase } from '../../rules/branches'
import { capacitesAcquises, normaliserNiveau } from '../../rules/niveau'
import { classesPourFaction } from '../../rules/stats'
import { changerClasse, changerVoie, type Changement } from '../../wizard/validation'
import type { FicheCreation } from '../../wizard/types'
import ArbreVoie from '../../components/ArbreVoie'
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
          'Touche une classe : ses trois voies s’ouvrent dedans.',
          'Touche la voie qui te parle — elle se choisit à la création, sans panachage.',
          <>
            Chaque voie montre son arbre complet ; au niveau {niveau}, tu tiens les échelons
            marqués « acquis ».
          </>,
        ]}
        pourquoi="la classe donne tes PV, ton Mana et tes capacités de base ; la voie donne les capacités de ton niveau — et tu vois d'avance où elle mène."
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

            {ouverte && (
              <div className="mt-2 border-t border-border/30 pt-1.5">
                {branchesDe(classe.id).map((voie) => {
                  // « Acquis » ne se dit que de TA voie : tant qu'elle n'est
                  // pas choisie, l'arbre est montré sans rien te promettre.
                  const choisie = fiche.voie === voie.id
                  const acquises = new Set(
                    choisie ? capacitesAcquises(classe.id, voie.id, niveau).map((c) => c.id) : [],
                  )
                  return (
                    <CarteChoix
                      key={voie.id}
                      petite
                      choisi={choisie}
                      onChoisir={() => {
                        if (fiche.voie === voie.id) return
                        onChangement(changerVoie(fiche, voie.id))
                      }}
                    >
                      <h3 className="m-0 mb-1 font-titre text-[17.5px] font-bold text-gold">
                        {voie.nom}
                      </h3>
                      <ArbreVoie capacites={voie.capacites} acquises={acquises} />
                    </CarteChoix>
                  )
                })}
              </div>
            )}
          </CarteChoix>
        )
      })}
      <Note>
        L'arbre entier est montré ici, au moment du choix. Ta fiche, elle, ne portera que ce que
        tu as acquis — et tout vit dans l'encyclopédie.
      </Note>
    </section>
  )
}
