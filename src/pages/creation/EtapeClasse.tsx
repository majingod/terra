/**
 * Étape 3 — Classe (accordéon) : une classe s'ouvre sur ses 3 voies ;
 * la voie est obligatoire. D4 : l'écran de choix de voie peut NOMMER les
 * niveaux 2-5 (validé maquette) — seul le niveau 1 montre son verbatim.
 */
import { useState } from 'react'
import { branchesDe, capacitesDeBase } from '../../rules/branches'
import { classesPourFaction } from '../../rules/stats'
import { changerClasse, changerVoie, type Changement } from '../../wizard/validation'
import type { FicheCreation } from '../../wizard/types'
import { CarteChoix, Tutoriel, Verbatim } from './ui'

interface Props {
  fiche: FicheCreation
  onChangement: (changement: Changement, avant: FicheCreation) => void
}

export default function EtapeClasse({ fiche, onChangement }: Props) {
  const classes = fiche.faction ? classesPourFaction(fiche.faction) : []
  const [ouverte, setOuverte] = useState<string | undefined>(fiche.classe)

  return (
    <section className="flex flex-col gap-4">
      <h1 className="titre-etape">Choisis ta classe, puis ta voie</h1>
      <Tutoriel
        etapeId="classe"
        gestes={[
          'Touche une classe pour l’ouvrir et voir ses trois voies.',
          'Choisis la classe, puis choisis une voie — elle est obligatoire.',
        ]}
        pourquoi="La voie se choisit à la création, sans panachage : chaque voie liste ses capacités de niveau 1 à 5, tu commences avec celle de niveau 1."
      />
      <div className="flex flex-col gap-3">
        {classes.map((classe) => {
          const estOuverte = ouverte === classe.id
          const estChoisie = fiche.classe === classe.id
          return (
            <div
              key={classe.id}
              className={`carte-choix rounded-2xl border-2 bg-panneau ${
                estChoisie ? 'border-or' : 'border-ligne'
              }`}
            >
              <button
                type="button"
                className="flex min-h-touch w-full items-center justify-between gap-2 p-4 text-left"
                aria-expanded={estOuverte}
                onClick={() => setOuverte(estOuverte ? undefined : classe.id)}
              >
                <span>
                  <span className="font-titre text-xl font-bold">{classe.nom}</span>
                  {classe.faction !== 'toute' && (
                    <span className="ml-2 text-xs uppercase tracking-wide text-stone-400">
                      exclusif
                    </span>
                  )}
                  <span className="block text-sm text-stone-300">
                    {classe.pv_base} PV · {classe.mana_base} Mana de base
                  </span>
                </span>
                <span aria-hidden className="text-or">
                  {estOuverte ? '▾' : '▸'}
                </span>
              </button>

              {estOuverte && (
                <div className="flex flex-col gap-3 px-4 pb-4">
                  {classe.ressource_speciale && (
                    <p className="text-sm">
                      <span className="font-semibold text-or">
                        {classe.ressource_speciale.nom} —{' '}
                      </span>
                      <span className="italic text-stone-300">
                        {classe.ressource_speciale.verbatim}
                      </span>
                    </p>
                  )}
                  {classe.code && (
                    <p className="text-sm">
                      <span className="font-semibold text-or">Code — </span>
                      <span className="italic text-stone-300">{classe.code}</span>
                    </p>
                  )}
                  {classe.echange && (
                    <p className="text-sm">
                      <span className="font-semibold text-or">Échange — </span>
                      <span className="italic text-stone-300">{classe.echange}</span>
                    </p>
                  )}
                  {classe.focus_requis && (
                    <p className="text-sm">
                      <span className="font-semibold text-or">Focus — </span>
                      <span className="italic text-stone-300">{classe.focus_requis}</span>
                    </p>
                  )}
                  {capacitesDeBase(classe.id).length > 0 && (
                    <div>
                      <h3 className="font-titre font-bold text-or">Capacités de base</h3>
                      <ul className="mt-1 flex flex-col gap-2">
                        {capacitesDeBase(classe.id).map((capacite) => (
                          <li key={capacite.id}>
                            <span className="font-semibold">{capacite.nom}</span>
                            <Verbatim texte={capacite.verbatim} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {!estChoisie && (
                    <button
                      type="button"
                      className="btn-continuer"
                      onClick={() => onChangement(changerClasse(fiche, classe.id), fiche)}
                    >
                      Prendre {classe.nom}
                    </button>
                  )}

                  <h3 className="font-titre font-bold text-or">Ses trois voies</h3>
                  {branchesDe(classe.id).map((voie) => (
                    <CarteChoix
                      key={voie.id}
                      choisi={estChoisie && fiche.voie === voie.id}
                      onChoisir={() => {
                        if (estChoisie && fiche.voie === voie.id) return
                        if (!estChoisie) {
                          // Prendre la classe ET la voie d'un geste.
                          const changement = changerClasse(fiche, classe.id)
                          const complet = changerVoie(changement.fiche, voie.id)
                          onChangement(
                            {
                              fiche: complet.fiche,
                              retraits: [...changement.retraits, ...complet.retraits],
                            },
                            fiche,
                          )
                        } else {
                          onChangement(changerVoie(fiche, voie.id), fiche)
                        }
                      }}
                    >
                      <div className="font-titre text-lg font-bold">{voie.nom}</div>
                      <ul className="mt-1 flex flex-col gap-1">
                        {voie.capacites
                          .slice()
                          .sort((a, b) => a.niveau - b.niveau)
                          .map((capacite) => (
                            <li key={capacite.id} className="text-sm">
                              <span className="font-semibold text-or">
                                Niv {capacite.niveau} — {capacite.nom}
                              </span>
                              {capacite.niveau === 1 && <Verbatim texte={capacite.verbatim} />}
                            </li>
                          ))}
                      </ul>
                    </CarteChoix>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
