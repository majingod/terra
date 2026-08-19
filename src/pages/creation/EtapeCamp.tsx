/**
 * Étape 2 — Camp (maquette A v3) : faction puis races filtrées, même écran.
 * L'Humain choisit son bonus DANS sa carte (+1 PV / +1 Mana, libellés du
 * fichier). Changer de race retire les langues au choix devenues acquises.
 */
import { getRules, type BonusRace } from '../../rules/load'
import { languesAcquises } from '../../rules/langues'
import { racesPourFaction } from '../../rules/stats'
import { changerFaction, type Changement } from '../../wizard/validation'
import type { FicheCreation } from '../../wizard/types'
import { Badge, BadgeBonus, CarteChoix, TexteRegle, TitreCarte, Tutoriel } from './ui'

interface Props {
  fiche: FicheCreation
  onMaj: (fiche: FicheCreation) => void
  onChangement: (changement: Changement) => void
}

function estChoix(bonus: BonusRace): bonus is { choix: string[] } {
  return typeof bonus === 'object' && 'choix' in bonus
}

export default function EtapeCamp({ fiche, onMaj, onChangement }: Props) {
  const regles = getRules()
  const races = fiche.faction ? racesPourFaction(fiche.faction) : []

  function nomLangue(id: string): string {
    return regles.langues.liste.find((l) => l.id === id)?.nom ?? id
  }

  function choisirRace(raceId: string) {
    if (fiche.race === raceId) return
    // Les langues au choix devenues acquises avec la nouvelle race sortent.
    const acquises = new Set(languesAcquises(raceId, fiche.classe))
    onMaj({
      ...fiche,
      race: raceId,
      humainChoix: undefined,
      langChoix: (fiche.langChoix ?? []).filter((l) => !acquises.has(l)),
    })
  }

  return (
    <section>
      <h2 className="titre-etape">Choisis ton camp</h2>
      <Tutoriel
        etapeId="camp"
        gestes={[
          'Touche ta faction : Sanctum ou Légion.',
          'Les races de ta faction apparaissent dessous — touches-en une.',
          'Humain ? Choisis aussi ton bonus (+1 PV ou +1 Mana).',
        ]}
        pourquoi="la faction limite les races et les classes (Tome p.7). Changer de faction plus tard peut retirer des choix déjà faits — une fenêtre te le dira."
      />
      {regles.factions.liste.map((faction) => {
        const peau = faction.id === 'legion' ? 'legion' : 'sanctum'
        return (
          <CarteChoix
            key={faction.id}
            choisi={fiche.faction === faction.id}
            peau={peau}
            onChoisir={() => {
              if (fiche.faction === faction.id) return
              onChangement(changerFaction(fiche, faction.id))
            }}
          >
            <TitreCarte peau={peau}>{faction.nom}</TitreCarte>
            <TexteRegle source={faction} />
          </CarteChoix>
        )
      })}

      {fiche.faction && (
        <>
          <h2 className="titre-mini">Ta race</h2>
          {races.map((race) => {
            const choix = race.bonus.find(estChoix)
            return (
              <CarteChoix
                key={race.id}
                choisi={fiche.race === race.id}
                onChoisir={() => choisirRace(race.id)}
              >
                <TitreCarte>{race.nom}</TitreCarte>
                <p className="my-1 text-[15.5px] text-muted-foreground">{race.description_physique}</p>
                <p className="my-1">
                  {race.bonus.map((bonus, i) => {
                    if (typeof bonus === 'string') return <BadgeBonus key={i} libelle={bonus} />
                    if (estChoix(bonus)) {
                      return (
                        <Badge key={i} variante="gold">
                          au choix : {bonus.choix.join(' ou ')}
                        </Badge>
                      )
                    }
                    return <Badge key={i}>{bonus.nom}</Badge>
                  })}
                  {(race.malus ?? []).map((malus, i) =>
                    typeof malus === 'string' ? <BadgeBonus key={`m${i}`} libelle={malus} /> : null,
                  )}
                </p>
                {race.bonus.map((bonus, i) =>
                  typeof bonus === 'object' && 'nom' in bonus ? (
                    <TexteRegle key={i} gras={bonus.nom} source={bonus} />
                  ) : null,
                )}
                <p className="my-1">
                  <Badge>Langues : {race.langues_depart.map(nomLangue).join(', ')}</Badge>
                </p>
                {choix && fiche.race === race.id && (
                  <div className="mt-2.5 flex gap-2">
                    {choix.choix.map((option) => (
                      <button
                        key={option}
                        type="button"
                        aria-pressed={fiche.humainChoix === option}
                        onClick={(e) => {
                          e.stopPropagation()
                          onMaj({ ...fiche, humainChoix: option })
                        }}
                        className={`subsel-btn ${fiche.humainChoix === option ? 'subsel-btn-on' : ''}`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </CarteChoix>
            )
          })}
        </>
      )}
    </section>
  )
}
