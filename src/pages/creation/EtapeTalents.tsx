/**
 * Étape 6 — Talents : dons (droit = 1 + Esprit≥3 + achats « +1 Don »,
 * cumulables avec compteur ×n) et compétences (droit = 1 + achats,
 * max 1 artisanat). Artisanats masqués/bloqués ssi tranche ≤11 (D10).
 * Surplus (Esprit qui a baissé) : bandeau rouge « retire N », la
 * navigation avant reste verrouillée par les validateurs.
 */
import { valeurCarac } from '../../rules/stats'
import {
  artisanatsChoisis,
  artisanatsPour,
  droitCompetences,
  droitDons,
  consommationDons,
  listeCompetencesSimples,
  listeDons,
  maxArtisanats,
} from '../../rules/talents'
import { getRules } from '../../rules/load'
import { surplusCompetences, surplusDons } from '../../wizard/validation'
import type { FicheCreation } from '../../wizard/types'
import { BandeauRouge, Compteur, Tutoriel, Verbatim } from './ui'

interface Props {
  fiche: FicheCreation
  onMaj: (fiche: FicheCreation) => void
}

export default function EtapeTalents({ fiche, onMaj }: Props) {
  const esprit = valeurCarac(fiche, 'e')
  const dons = fiche.dons ?? {}
  const droit = droitDons(esprit, fiche.achats)
  const pris = consommationDons(dons)
  const comps = fiche.comps ?? []
  const droitComps = droitCompetences(fiche.achats)
  const artisanats = fiche.trancheAge ? artisanatsPour(fiche.trancheAge) : []
  const nbArtisanats = artisanatsChoisis(comps).length
  const enSurplusDons = surplusDons(fiche)
  const enSurplusComps = surplusCompetences(fiche)

  function majDon(id: string, n: number) {
    const suite = { ...dons }
    if (n <= 0) delete suite[id]
    else suite[id] = n
    onMaj({ ...fiche, dons: suite })
  }

  function basculerComp(id: string) {
    const suite = comps.includes(id) ? comps.filter((c) => c !== id) : [...comps, id]
    onMaj({ ...fiche, comps: suite })
  }

  return (
    <section className="flex flex-col gap-4">
      <h1 className="titre-etape">Tes talents</h1>
      <Tutoriel
        etapeId="talents"
        gestes={[
          `Prends exactement ${droit} don${droit > 1 ? 's' : ''} — les cumulables se prennent ×n.`,
          `Choisis ${droitComps} compétence${droitComps > 1 ? 's' : ''}, dont au plus ${maxArtisanats()} artisanat.`,
        ]}
        pourquoi={`« ${getRules().dons.intro} » — et « ${getRules().competences.artisanats.verbatim_interdiction} »`}
      />

      {enSurplusDons > 0 && (
        <BandeauRouge>
          Ton Esprit a baissé : retire {enSurplusDons} don{enSurplusDons > 1 ? 's' : ''} pour
          continuer.
        </BandeauRouge>
      )}

      <div className="flex items-center justify-between">
        <h2 className="font-titre text-xl font-bold">Dons</h2>
        <span className={`font-titre text-lg font-bold ${pris > droit ? 'text-legion' : 'text-or'}`}>
          {pris}/{droit}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {listeDons().map((don) => {
          const n = dons[don.id] ?? 0
          const plein = pris >= droit
          return (
            <div
              key={don.id}
              className={`rounded-xl border-2 bg-panneau p-3 ${n > 0 ? 'border-or' : 'border-ligne'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-titre text-lg font-bold">
                  {don.nom}
                  {don.cumulable && (
                    <span className="ml-2 text-xs uppercase tracking-wide text-stone-400">
                      cumulable
                    </span>
                  )}
                </span>
                {don.cumulable ? (
                  <Compteur
                    etiquette={don.nom}
                    valeur={n}
                    max={plein ? n : undefined}
                    onChange={(suite) => majDon(don.id, suite)}
                  />
                ) : (
                  <button
                    type="button"
                    aria-pressed={n > 0}
                    disabled={n === 0 && plein}
                    onClick={() => majDon(don.id, n > 0 ? 0 : 1)}
                    className={`min-h-11 rounded-lg border-2 px-4 font-titre font-bold disabled:opacity-30 ${
                      n > 0 ? 'border-or bg-or text-fond' : 'border-ligne'
                    }`}
                  >
                    {n > 0 ? 'Pris' : 'Prendre'}
                  </button>
                )}
              </div>
              <Verbatim texte={don.verbatim} />
            </div>
          )
        })}
      </div>

      {enSurplusComps > 0 && (
        <BandeauRouge>
          Retire {enSurplusComps} compétence{enSurplusComps > 1 ? 's' : ''} pour continuer.
        </BandeauRouge>
      )}

      <div className="flex items-center justify-between">
        <h2 className="font-titre text-xl font-bold">Compétences</h2>
        <span
          className={`font-titre text-lg font-bold ${comps.length > droitComps ? 'text-legion' : 'text-or'}`}
        >
          {comps.length}/{droitComps}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {listeCompetencesSimples().map((comp) => {
          const prise = comps.includes(comp.id)
          const plein = comps.length >= droitComps
          return (
            <div
              key={comp.id}
              className={`rounded-xl border-2 bg-panneau p-3 ${prise ? 'border-or' : 'border-ligne'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-titre text-lg font-bold">{comp.nom}</span>
                <button
                  type="button"
                  aria-pressed={prise}
                  disabled={!prise && plein}
                  onClick={() => basculerComp(comp.id)}
                  className={`min-h-11 rounded-lg border-2 px-4 font-titre font-bold disabled:opacity-30 ${
                    prise ? 'border-or bg-or text-fond' : 'border-ligne'
                  }`}
                >
                  {prise ? 'Prise' : 'Prendre'}
                </button>
              </div>
              {comp.materiel && (
                <p className="text-xs text-stone-400">Matériel : {comp.materiel}</p>
              )}
              <Verbatim texte={comp.base} />
            </div>
          )
        })}
      </div>

      {artisanats.length > 0 && (
        <>
          <h2 className="font-titre text-xl font-bold">
            Artisanats <span className="text-sm text-stone-400">(au plus {maxArtisanats()})</span>
          </h2>
          <div className="flex flex-col gap-2">
            {artisanats.map((artisanat) => {
              const pris = comps.includes(artisanat.id)
              const bloqueArtisanat = !pris && nbArtisanats >= maxArtisanats()
              const plein = comps.length >= droitComps
              return (
                <div
                  key={artisanat.id}
                  className={`rounded-xl border-2 bg-panneau p-3 ${pris ? 'border-or' : 'border-ligne'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-titre text-lg font-bold">{artisanat.nom}</span>
                    <button
                      type="button"
                      aria-pressed={pris}
                      disabled={!pris && (plein || bloqueArtisanat)}
                      onClick={() => basculerComp(artisanat.id)}
                      className={`min-h-11 rounded-lg border-2 px-4 font-titre font-bold disabled:opacity-30 ${
                        pris ? 'border-or bg-or text-fond' : 'border-ligne'
                      }`}
                    >
                      {pris ? 'Pris' : 'Prendre'}
                    </button>
                  </div>
                  {artisanat.materiel && (
                    <p className="text-xs text-stone-400">Matériel : {artisanat.materiel}</p>
                  )}
                  {artisanat.restriction && <Verbatim texte={artisanat.restriction} />}
                  <ul className="mt-1 flex flex-col gap-1">
                    {artisanat.capacites.map((capacite) => (
                      <li key={capacite.nom} className="text-sm">
                        <span className="font-semibold text-or">{capacite.nom}</span>
                        <Verbatim texte={capacite.verbatim} />
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}
