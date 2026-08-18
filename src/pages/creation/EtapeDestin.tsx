/**
 * Étape 4 — Destin : désavantages (A6 : cochés librement, XP = somme des 3
 * premiers cochés, badge « RP seulement » au-delà), XP joueur, achats
 * d'héritage avec budget XP unique collant et pickers de capacité inline
 * (bassin t004 : capacités de niveau N de ta classe, autres voies).
 */
import {
  budgetXp,
  compteAchats,
  depenseXp,
  desavantagesDisponibles,
  desavantagesRpSeulement,
  effetAchat,
  listeAchats,
  plafondDesavantagesXp,
  xpDesavantage,
  xpRestant,
} from '../../rules/heritage'
import { getRules } from '../../rules/load'
import { bassinCapacites } from '../../wizard/capacites'
import type { FicheCreation } from '../../wizard/types'
import { Compteur, Tutoriel, Verbatim } from './ui'

interface Props {
  fiche: FicheCreation
  onMaj: (fiche: FicheCreation) => void
}

export default function EtapeDestin({ fiche, onMaj }: Props) {
  const regles = getRules()
  const plafond = plafondDesavantagesXp()
  const ordre = fiche.desavOrdre ?? []
  const rpSeulement = new Set(desavantagesRpSeulement(ordre))
  const disponibles = desavantagesDisponibles(fiche.classe)
  const budget = budgetXp(fiche)
  const depense = depenseXp(fiche.achats)
  const restant = xpRestant(fiche)

  function basculerDesavantage(id: string) {
    const coche = ordre.includes(id)
    const suite = coche ? ordre.filter((d) => d !== id) : [...ordre, id]
    const desavantage = disponibles.find((d) => d.id === id)
    const nettoie: FicheCreation = { ...fiche, desavOrdre: suite }
    if (coche && desavantage?.variante_xp !== undefined) {
      nettoie.racisteVar = undefined
    }
    onMaj(nettoie)
  }

  function majAchat(achat: string, compte: number) {
    const achats = { ...(fiche.achats ?? {}) }
    if (compte <= 0) delete achats[achat]
    else achats[achat] = compte
    const suite: FicheCreation = { ...fiche, achats }
    // Un achat de capacité retiré retire les choix en trop (du dernier au premier).
    const capChoix = { ...(fiche.capChoix ?? {}) }
    for (const [niveau, ids] of Object.entries(capChoix)) {
      const droit = compteAchats(achats, 'capacite', Number(niveau))
      if (ids.length > droit) capChoix[niveau] = ids.slice(0, droit)
    }
    suite.capChoix = capChoix
    onMaj(suite)
  }

  function basculerCapacite(niveau: number, id: string) {
    const cle = String(niveau)
    const actuels = fiche.capChoix?.[cle] ?? []
    const droit = compteAchats(fiche.achats, 'capacite', niveau)
    let suite: string[]
    if (actuels.includes(id)) {
      suite = actuels.filter((c) => c !== id)
    } else {
      if (actuels.length >= droit) return
      suite = [...actuels, id]
    }
    onMaj({ ...fiche, capChoix: { ...(fiche.capChoix ?? {}), [cle]: suite } })
  }

  return (
    <section className="flex flex-col gap-4">
      <h1 className="titre-etape">Ton destin : désavantages et héritage</h1>
      <Tutoriel
        etapeId="destin"
        gestes={[
          'Coche librement tes désavantages — les XP des ' +
            plafond +
            ' premiers cochés remplissent ton budget.',
          'Indique tes XP permanents de joueur (1 par GN joué).',
          'Dépense ton budget dans les achats d’héritage.',
        ]}
        pourquoi={`« ${regles.heritage.desavantages.regle_plafond.verbatim} » — et « ${regles.heritage.regle_generale} »`}
      />

      {/* Budget XP unique, collant */}
      <div className="sticky top-32 z-10 flex items-center justify-between rounded-xl border-2 border-or bg-panneau px-4 py-2 shadow-lg">
        <span className="font-titre font-bold">Budget XP</span>
        <span className="font-titre text-lg font-bold">
          <span className="text-or">{budget}</span>
          <span className="text-stone-400"> − {depense} = </span>
          <span className={restant < 0 ? 'text-legion' : 'text-ok'}>{restant}</span>
        </span>
      </div>

      <h2 className="font-titre text-xl font-bold">Désavantages</h2>
      <div className="flex flex-col gap-2">
        {disponibles.map((desavantage) => {
          const coche = ordre.includes(desavantage.id)
          const position = ordre.indexOf(desavantage.id)
          const enRp = coche && rpSeulement.has(desavantage.id)
          const xp = xpDesavantage(desavantage, fiche)
          return (
            <div
              key={desavantage.id}
              className={`rounded-xl border-2 bg-panneau p-3 ${coche ? 'border-or' : 'border-ligne'}`}
            >
              <label className="flex min-h-11 cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={coche}
                  onChange={() => basculerDesavantage(desavantage.id)}
                  className="mt-1 h-7 w-7 accent-or"
                />
                <span className="flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-titre text-lg font-bold">{desavantage.nom}</span>
                    {coche && enRp ? (
                      <span className="rounded-full border border-ligne px-2 py-0.5 text-xs uppercase tracking-wide text-stone-400">
                        RP seulement
                      </span>
                    ) : (
                      <span className="font-titre font-bold text-or">
                        +{xp} XP
                        {desavantage.variante_xp !== undefined && !fiche.racisteVar
                          ? ` à +${desavantage.variante_xp} XP`
                          : ''}
                      </span>
                    )}
                  </span>
                  {coche && position >= 0 && (
                    <span className="text-xs text-stone-400">coché en {position + 1}ᵉ</span>
                  )}
                  <Verbatim texte={desavantage.verbatim} />
                </span>
              </label>

              {desavantage.variante_xp !== undefined && coche && (
                <div className="mt-2 border-t border-ligne pt-2">
                  <p className="text-sm font-semibold text-or">
                    Quelle race ton personnage refuse-t-il ? (obligatoire)
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {regles.races.liste.map((race) => (
                      <button
                        key={race.id}
                        type="button"
                        aria-pressed={fiche.racisteVar === race.id}
                        onClick={() => onMaj({ ...fiche, racisteVar: race.id })}
                        className={`min-h-11 rounded-full border px-3 font-semibold ${
                          fiche.racisteVar === race.id
                            ? 'border-or bg-or text-fond'
                            : 'border-ligne'
                        }`}
                      >
                        {race.nom}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
      {ordre.length > plafond && (
        <p className="text-sm text-stone-300">
          Seuls tes {plafond} premiers désavantages cochés donnent de l'XP — les suivants sont
          là pour le jeu de rôle seulement.
        </p>
      )}

      <h2 className="font-titre text-xl font-bold">XP permanents du joueur</h2>
      <div className="panneau-w flex items-center justify-between gap-3">
        <span className="text-sm italic text-stone-300">{regles.heritage.xp_permanent}</span>
        <Compteur
          etiquette="XP permanents"
          valeur={fiche.xpPerm ?? 0}
          onChange={(xpPerm) => onMaj({ ...fiche, xpPerm })}
        />
      </div>

      <h2 className="font-titre text-xl font-bold">Achats d'héritage</h2>
      <div className="flex flex-col gap-2">
        {listeAchats().map((achat) => {
          const compte = fiche.achats?.[achat.achat] ?? 0
          const effet = effetAchat(achat.achat)
          const plusBloque = restant < achat.cout_xp
          return (
            <div key={achat.achat} className="rounded-xl border border-ligne bg-panneau p-3">
              <div className="flex items-center justify-between gap-2">
                <span>
                  <span className="font-titre text-lg font-bold">{achat.achat}</span>
                  <span className="ml-2 font-semibold text-or">{achat.cout_xp} XP</span>
                  {achat.max_achats !== undefined && (
                    <span className="ml-2 text-xs text-stone-400">max {achat.max_achats}</span>
                  )}
                </span>
                <Compteur
                  etiquette={achat.achat}
                  valeur={compte}
                  max={
                    plusBloque
                      ? compte
                      : achat.max_achats !== undefined
                        ? achat.max_achats
                        : undefined
                  }
                  onChange={(suite) => majAchat(achat.achat, suite)}
                />
              </div>
              {achat.restriction && (
                <p className="mt-1 text-xs italic text-stone-400">{achat.restriction}</p>
              )}

              {effet.type === 'capacite' && compte > 0 && (
                <div className="mt-2 border-t border-ligne pt-2">
                  <p className="text-sm font-semibold text-or">
                    Choisis {compte} capacité{compte > 1 ? 's' : ''} de niveau {effet.niveau}{' '}
                    (autres voies de ta classe) —{' '}
                    {(fiche.capChoix?.[String(effet.niveau)] ?? []).length}/{compte}
                  </p>
                  <div className="mt-1 flex flex-col gap-2">
                    {bassinCapacites(fiche.classe, fiche.voie, effet.niveau).map((capacite) => {
                      const prise = (fiche.capChoix?.[String(effet.niveau)] ?? []).includes(
                        capacite.id,
                      )
                      return (
                        <button
                          key={capacite.id}
                          type="button"
                          aria-pressed={prise}
                          onClick={() => basculerCapacite(effet.niveau, capacite.id)}
                          className={`min-h-11 rounded-lg border p-2 text-left ${
                            prise ? 'border-or bg-or/10' : 'border-ligne'
                          }`}
                        >
                          <span className="font-semibold">{capacite.nom}</span>
                          <Verbatim texte={capacite.verbatim} />
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
