/**
 * Étape 7 — Langues : acquises d'office (race + Druidique du druide) et
 * langues au choix (droit = Esprit≥3 + Érudit, T8). La Langue des morts
 * n'est jamais proposée à la création.
 */
import { droitLangues, languesAcquises, languesProposables, listeLangues } from '../../rules/langues'
import { getRules } from '../../rules/load'
import { valeurCarac } from '../../rules/stats'
import { surplusLangues } from '../../wizard/validation'
import type { FicheCreation } from '../../wizard/types'
import { BandeauRouge, Tutoriel } from './ui'

interface Props {
  fiche: FicheCreation
  onMaj: (fiche: FicheCreation) => void
}

export default function EtapeLangues({ fiche, onMaj }: Props) {
  const acquises = languesAcquises(fiche.race, fiche.classe)
  const proposables = languesProposables(fiche.race, fiche.classe)
  const droit = droitLangues(valeurCarac(fiche, 'e'), fiche.comps ?? [])
  const choix = fiche.langChoix ?? []
  const surplus = surplusLangues(fiche)

  function basculer(id: string) {
    const suite = choix.includes(id) ? choix.filter((l) => l !== id) : [...choix, id]
    onMaj({ ...fiche, langChoix: suite })
  }

  function nomDe(id: string): string {
    return listeLangues().find((l) => l.id === id)?.nom ?? id
  }

  return (
    <section className="flex flex-col gap-4">
      <h1 className="titre-etape">Tes langues</h1>
      <Tutoriel
        etapeId="langues"
        gestes={[
          'Tes langues acquises sont déjà là — rien à faire.',
          droit > 0
            ? `Choisis ${droit} langue${droit > 1 ? 's' : ''} supplémentaire${droit > 1 ? 's' : ''}.`
            : 'Avec ton Esprit et tes compétences, pas de langue supplémentaire à choisir.',
        ]}
        pourquoi={`« ${getRules().langues.regle} »`}
      />

      <h2 className="font-titre text-xl font-bold">Acquises d'office</h2>
      <div className="flex flex-wrap gap-2">
        {acquises.map((id) => (
          <span
            key={id}
            className="rounded-full border border-ok px-3 py-1.5 font-semibold text-ok"
          >
            {nomDe(id)}
          </span>
        ))}
      </div>

      {surplus > 0 && (
        <BandeauRouge>
          Ton droit de langues a baissé : retire {surplus} langue{surplus > 1 ? 's' : ''} pour
          continuer.
        </BandeauRouge>
      )}

      {(droit > 0 || choix.length > 0) && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="font-titre text-xl font-bold">Au choix</h2>
            <span
              className={`font-titre text-lg font-bold ${choix.length > droit ? 'text-legion' : 'text-or'}`}
            >
              {choix.length}/{droit}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {proposables.map((langue) => {
              const prise = choix.includes(langue.id)
              const plein = choix.length >= droit
              return (
                <div
                  key={langue.id}
                  className={`flex items-center justify-between gap-2 rounded-xl border-2 bg-panneau p-3 ${
                    prise ? 'border-or' : 'border-ligne'
                  }`}
                >
                  <span className="font-titre text-lg font-bold">{langue.nom}</span>
                  <button
                    type="button"
                    aria-pressed={prise}
                    disabled={!prise && plein}
                    onClick={() => basculer(langue.id)}
                    className={`min-h-11 rounded-lg border-2 px-4 font-titre font-bold disabled:opacity-30 ${
                      prise ? 'border-or bg-or text-fond' : 'border-ligne'
                    }`}
                  >
                    {prise ? 'Prise' : 'Prendre'}
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}
