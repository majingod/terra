/**
 * Étape 3 — Classe (maquette A v3) : toucher une classe la CHOISIT (avec
 * fenêtre de répercussions au besoin) et ouvre ses trois voies dedans.
 * D4 : seul le niveau 1 des voies est détaillé ; les niveaux 2-5 sont
 * seulement nommés (validé maquette).
 */
import { branchesDe, capacitesDeBase } from '../../rules/branches'
import { classesPourFaction } from '../../rules/stats'
import { changerClasse, changerVoie, type Changement } from '../../wizard/validation'
import type { FicheCreation } from '../../wizard/types'
import { Badge, CarteChoix, Note, TitreCarte, Tutoriel, Verbatim } from './ui'

interface Props {
  fiche: FicheCreation
  onChangement: (changement: Changement) => void
}

export default function EtapeClasse({ fiche, onChangement }: Props) {
  const classes = fiche.faction ? classesPourFaction(fiche.faction) : []

  return (
    <section>
      <h2 className="titre-etape">Choisis ta classe</h2>
      <Tutoriel
        etapeId="classe"
        gestes={[
          'Touche une classe : ses trois voies s’ouvrent dedans.',
          'Touche la voie qui te parle — elle se choisit à la création, sans panachage.',
          'Seul le niveau 1 est détaillé : c’est ce que tu joueras samedi.',
        ]}
        pourquoi="la classe donne tes PV, ton Mana et tes capacités de base ; la voie donne ta capacité de niveau 1."
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
              <Verbatim key={capacite.id} gras={capacite.nom} texte={capacite.verbatim} />
            ))}
            {classe.echange && <Verbatim texte={classe.echange} />}
            {classe.code && <Verbatim gras="Code" texte={classe.code} />}
            {classe.ressource_speciale && (
              <Verbatim
                gras={classe.ressource_speciale.nom}
                texte={classe.ressource_speciale.verbatim}
              />
            )}

            {ouverte && (
              <div className="mt-2 border-t border-[#182234] pt-1.5">
                {branchesDe(classe.id).map((voie) => {
                  const capNiveau1 = voie.capacites.find((c) => c.niveau === 1)
                  return (
                    <CarteChoix
                      key={voie.id}
                      petite
                      choisi={fiche.voie === voie.id}
                      onChoisir={() => {
                        if (fiche.voie === voie.id) return
                        onChangement(changerVoie(fiche, voie.id))
                      }}
                    >
                      <h3 className="m-0 mb-1 font-titre text-[17.5px] font-bold text-or">
                        {voie.nom}
                      </h3>
                      {capNiveau1 && (
                        <Verbatim gras={`Niv 1 — ${capNiveau1.nom}`} texte={capNiveau1.verbatim} />
                      )}
                      <p className="my-1">
                        {voie.capacites
                          .filter((c) => c.niveau > 1)
                          .sort((a, b) => a.niveau - b.niveau)
                          .map((c) => (
                            <Badge key={c.id}>
                              Niv {c.niveau} · {c.nom}
                            </Badge>
                          ))}
                      </p>
                    </CarteChoix>
                  )
                })}
              </div>
            )}
          </CarteChoix>
        )
      })}
      <Note>
        Affichage progressif : la suite se dévoile en montant de niveau — et tout vit dans
        l'encyclopédie.
      </Note>
    </section>
  )
}
