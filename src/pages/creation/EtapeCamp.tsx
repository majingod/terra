/**
 * Étape 2 — Camp : faction puis races filtrées, sur le MÊME écran.
 * A3 : l'avantage affiché d'une faction = ses races et classes exclusives,
 * calculées par critère (jamais listées à la main).
 * Humain : bonus au choix (+1 PV / +1 Mana, libellés du fichier).
 */
import { getRules, type BonusRace } from '../../rules/load'
import { racesPourFaction } from '../../rules/stats'
import { changerFaction, type Changement } from '../../wizard/validation'
import type { FicheCreation } from '../../wizard/types'
import { CarteChoix, Tutoriel, Verbatim } from './ui'

interface Props {
  fiche: FicheCreation
  onMaj: (fiche: FicheCreation) => void
  onChangement: (changement: Changement, avant: FicheCreation) => void
}

function BonusLigne({ bonus }: { bonus: BonusRace }) {
  if (typeof bonus === 'string') {
    return <li className="font-semibold text-or">{bonus}</li>
  }
  if ('choix' in bonus) {
    return <li className="font-semibold text-or">Au choix : {bonus.choix.join(' ou ')}</li>
  }
  return (
    <li>
      <span className="font-semibold text-or">{bonus.nom} — </span>
      <span className="text-sm italic text-stone-300">{bonus.verbatim}</span>
    </li>
  )
}

export default function EtapeCamp({ fiche, onMaj, onChangement }: Props) {
  const factions = getRules().factions.liste
  const critere = getRules().factions.avantage_de_depart
  const races = fiche.faction ? racesPourFaction(fiche.faction) : []
  const raceChoisie = races.find((r) => r.id === fiche.race)
  const choixHumain = raceChoisie?.bonus.find(
    (b): b is { choix: string[] } => typeof b === 'object' && 'choix' in b,
  )

  return (
    <section className="flex flex-col gap-4">
      <h1 className="titre-etape">Choisis ton camp</h1>
      <Tutoriel
        etapeId="camp"
        gestes={[
          'Touche une faction pour voir ce qu’elle débloque.',
          'Puis choisis ta race parmi celles offertes à cette faction.',
          'L’Humain choisit en plus son bonus.',
        ]}
        pourquoi={critere.regle}
      />

      <div className="flex flex-col gap-3">
        {factions.map((faction) => {
          const accent = faction.id === 'legion' ? 'legion' : 'sanctum'
          const racesExclusives = getRules().races.liste.filter((r) => r.faction === faction.id)
          const classesExclusives = getRules().classes_squelette.liste.filter(
            (c) => c.faction === faction.id,
          )
          return (
            <CarteChoix
              key={faction.id}
              choisi={fiche.faction === faction.id}
              accent={accent}
              onChoisir={() => {
                if (fiche.faction === faction.id) return
                onChangement(changerFaction(fiche, faction.id), fiche)
              }}
            >
              <div
                className={`font-titre text-xl font-bold ${
                  faction.id === 'legion' ? 'text-legion' : 'text-sanctum'
                }`}
              >
                {faction.nom}
              </div>
              <Verbatim texte={faction.verbatim} />
              <p className="mt-2 text-sm">
                <span className="font-semibold text-or">Exclusif : </span>
                {[...racesExclusives.map((r) => r.nom), ...classesExclusives.map((c) => c.nom)].join(
                  ', ',
                )}
              </p>
            </CarteChoix>
          )
        })}
      </div>

      {fiche.faction && (
        <>
          <h2 className="font-titre text-xl font-bold">Ta race</h2>
          <div className="flex flex-col gap-3">
            {races.map((race) => (
              <CarteChoix
                key={race.id}
                choisi={fiche.race === race.id}
                onChoisir={() => {
                  if (fiche.race === race.id) return
                  onMaj({ ...fiche, race: race.id, humainChoix: undefined })
                }}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-titre text-xl font-bold">{race.nom}</span>
                  {race.faction !== 'toute' && (
                    <span className="text-xs uppercase tracking-wide text-stone-400">
                      exclusif
                    </span>
                  )}
                </div>
                <p className="text-sm text-stone-300">{race.description_physique}</p>
                <ul className="mt-2 flex flex-col gap-1">
                  {race.bonus.map((bonus, i) => (
                    <BonusLigne key={i} bonus={bonus} />
                  ))}
                </ul>
                <p className="mt-2 text-sm">
                  <span className="font-semibold text-or">Langues de départ : </span>
                  {race.langues_depart
                    .map(
                      (id) => getRules().langues.liste.find((l) => l.id === id)?.nom ?? id,
                    )
                    .join(', ')}
                </p>
              </CarteChoix>
            ))}
          </div>
        </>
      )}

      {choixHumain && (
        <div className="panneau-w flex flex-col gap-2 border-or">
          <h3 className="font-titre text-lg font-bold text-or">Ton bonus d'Humain</h3>
          <div className="flex gap-3">
            {choixHumain.choix.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onMaj({ ...fiche, humainChoix: option })}
                aria-pressed={fiche.humainChoix === option}
                className={`min-h-touch flex-1 rounded-xl border-2 font-titre text-lg font-bold ${
                  fiche.humainChoix === option
                    ? 'border-or bg-or text-fond'
                    : 'border-ligne bg-panneau'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
