/**
 * Étape 4 — Destin (maquette A v3) : désavantages (A6 : cochage libre, XP
 * des 3 premiers, « RP seulement » au-delà ; interdits estompés, jamais
 * cachés), XP permanents du joueur, achats d'héritage avec budget XP
 * unique collant et pickers de capacité inline. Décocher ou décrémenter ce
 * dont dépendent d'autres choix passe par la fenêtre de répercussions.
 */
import {
  compteAchats,
  depenseXp,
  effetAchat,
  listeAchats,
  listeDesavantages,
  plafondDesavantagesXp,
  xpDesavantage,
  xpDesavantages,
  xpRestant,
} from '../../rules/heritage'
import { getRules } from '../../rules/load'
import { valeurCarac } from '../../rules/stats'
import { consommationDons, droitCompetences, droitDons } from '../../rules/talents'
import { bassinAchat, capaciteParId } from '../../wizard/capacites'
import { surplusPointsCarac, type Changement } from '../../wizard/validation'
import type { FicheCreation } from '../../wizard/types'
import { CarteCapacite } from './SelecteurCapacites'
import { Badge, CarteChoix, ErreurNote, Note, TexteRegle, TitreCarte, Tutoriel } from './ui'

interface Props {
  fiche: FicheCreation
  onMaj: (fiche: FicheCreation) => void
  onChangement: (changement: Changement) => void
}

export default function EtapeDestin({ fiche, onMaj, onChangement }: Props) {
  const regles = getRules()
  const plafond = plafondDesavantagesXp()
  const ordre = fiche.desavOrdre ?? []
  const depense = depenseXp(fiche.achats)
  const reste = xpRestant(fiche)

  function classeNom(id: string): string {
    return regles.classes_squelette.liste.find((c) => c.id === id)?.nom ?? id
  }

  function basculerDesavantage(id: string) {
    const desavantage = listeDesavantages().find((d) => d.id === id)
    if (!desavantage) return
    const index = ordre.indexOf(id)
    if (index >= 0) {
      const nouvelOrdre = ordre.filter((d) => d !== id)
      const suite: FicheCreation = {
        ...fiche,
        desavOrdre: nouvelOrdre,
        racisteVar: desavantage.variante_xp !== undefined ? undefined : fiche.racisteVar,
      }
      const futur = xpDesavantages(nouvelOrdre, suite) + (fiche.xpPerm ?? 0)
      const manque = depense - futur
      const impacts =
        manque > 0
          ? [
              `Décocher « ${desavantage.nom} » enlève des XP : ton héritage dépassera ton budget de ${manque} XP — il faudra retirer des achats.`,
            ]
          : []
      onChangement({ fiche: suite, retraits: impacts })
    } else {
      onMaj({ ...fiche, desavOrdre: [...ordre, id] })
    }
  }

  function majAchat(achat: (typeof regles.heritage.avantages.liste)[number], delta: 1 | -1) {
    const n = fiche.achats?.[achat.achat] ?? 0
    const suiteN = n + delta
    if (suiteN < 0) return
    const achats = { ...(fiche.achats ?? {}) }
    if (suiteN === 0) delete achats[achat.achat]
    else achats[achat.achat] = suiteN
    let suite: FicheCreation = { ...fiche, achats }
    if (delta === 1) {
      onMaj(suite)
      return
    }
    // Décrément : préviens quand des choix déjà faits en dépendent.
    const impacts: string[] = []
    const effet = effetAchat(achat.achat)
    if (effet.type === 'don') {
      const droit = droitDons(valeurCarac(fiche, 'e'), achats, fiche.niveau)
      if (consommationDons(fiche.dons ?? {}) > droit) {
        impacts.push(`Tu as déjà choisi tes dons : il faudra en retirer 1 à l'étape Talents.`)
      }
    }
    if (effet.type === 'competence') {
      if ((fiche.comps ?? []).length > droitCompetences(achats, fiche.niveau)) {
        impacts.push(
          `Tu as déjà choisi tes compétences : il faudra en retirer 1 à l'étape Talents.`,
        )
      }
    }
    if (effet.type === 'carac') {
      if (surplusPointsCarac({ ...fiche, achats }) > 0) {
        impacts.push(`Un point déjà placé à l'étape Forces sera à retirer.`)
      }
    }
    if (effet.type === 'capacite') {
      const choisis = fiche.capChoix?.[String(effet.niveau)] ?? []
      if (choisis.length > suiteN) {
        const capChoix = { ...(fiche.capChoix ?? {}) }
        const perdue = choisis[choisis.length - 1]
        const nomPerdue = capaciteParId(fiche.classe, perdue)?.nom ?? perdue
        capChoix[String(effet.niveau)] = choisis.slice(0, suiteN)
        suite = { ...suite, capChoix }
        impacts.push(`Ta capacité « ${nomPerdue} » sera retirée.`)
      }
    }
    onChangement({ fiche: suite, retraits: impacts })
  }

  function basculerCapacite(niveau: number, id: string) {
    const cle = String(niveau)
    const actuels = fiche.capChoix?.[cle] ?? []
    const droit = compteAchats(fiche.achats, 'capacite', niveau)
    let suite: string[]
    if (actuels.includes(id)) suite = actuels.filter((c) => c !== id)
    else if (actuels.length < droit) suite = [...actuels, id]
    else return
    onMaj({ ...fiche, capChoix: { ...(fiche.capChoix ?? {}), [cle]: suite } })
  }

  return (
    <section>
      <h2 className="titre-etape">Ton destin</h2>
      <Tutoriel
        etapeId="destin"
        gestes={[
          'Coche des désavantages si tu en veux — chacun donne des XP temporaires.',
          'Entre tes XP permanents de joueur (un MJ les confirmera).',
          'Dépense ton total dans les achats d’héritage dessous.',
          'Les achats « +1 don », « +1 compétence » et « +1 point de caractéristique » ouvriront des choix de plus aux étapes suivantes.',
        ]}
        pourquoi={`l'XP, permanent ou temporaire, ne se dépense qu'à la création (Tome p.20).`}
      />

      <div className="sticky top-2 z-40">
        <div
          className={`my-2 flex items-center justify-between rounded-lg border border-border/50 bg-popover px-3.5 py-2.5 font-sans text-[14.5px] text-muted-foreground`}
        >
          <span>
            XP : +{xpDesavantages(ordre, fiche)} désavantages · +{fiche.xpPerm ?? 0} joueur · −
            {depense} dépensés
          </span>
          <b className={`text-base ${reste < 0 ? 'text-destructive' : 'text-gold'}`}>{reste} XP</b>
        </div>
      </div>
      <Note>
        <b>{regles.heritage.desavantages.regle_plafond.verbatim}</b> Tu peux en cocher plus pour
        ton RP, mais seuls les {plafond} premiers cochés donnent de l'XP.
      </Note>

      {listeDesavantages().map((desavantage) => {
        const coche = ordre.includes(desavantage.id)
        const rang = ordre.indexOf(desavantage.id)
        const interdit = (desavantage.interdit_classes ?? []).includes(fiche.classe ?? '')
        const aVariante = desavantage.variante_xp !== undefined
        const badgeXp = aVariante
          ? fiche.racisteVar === 'faction'
            ? `+${desavantage.variante_xp} XP`
            : `+${desavantage.xp} à +${desavantage.variante_xp} XP`
          : `+${xpDesavantage(desavantage, fiche)} XP`
        return (
          <CarteChoix
            key={desavantage.id}
            choisi={coche}
            eteinte={interdit}
            onChoisir={() => basculerDesavantage(desavantage.id)}
          >
            <TitreCarte>
              {desavantage.nom} <Badge variante="xp">{badgeXp}</Badge>
              {coche && rang >= plafond && <Badge>RP seulement — pas d'XP</Badge>}
              {(desavantage.interdit_classes ?? []).length > 0 && (
                <Badge>
                  Interdit : {(desavantage.interdit_classes ?? []).map(classeNom).join(', ')}
                </Badge>
              )}
            </TitreCarte>
            <TexteRegle source={desavantage} />
            {aVariante && coche && (
              <div className="mt-2.5 flex gap-2">
                <button
                  type="button"
                  aria-pressed={fiche.racisteVar === 'autre'}
                  onClick={(e) => {
                    e.stopPropagation()
                    onMaj({ ...fiche, racisteVar: 'autre' })
                  }}
                  className={`subsel-btn ${fiche.racisteVar === 'autre' ? 'subsel-btn-on' : ''}`}
                >
                  Race d'une autre faction · +{desavantage.xp}
                </button>
                <button
                  type="button"
                  aria-pressed={fiche.racisteVar === 'faction'}
                  onClick={(e) => {
                    e.stopPropagation()
                    onMaj({ ...fiche, racisteVar: 'faction' })
                  }}
                  className={`subsel-btn ${fiche.racisteVar === 'faction' ? 'subsel-btn-on' : ''}`}
                >
                  Race de ta faction · +{desavantage.variante_xp}
                </button>
              </div>
            )}
          </CarteChoix>
        )
      })}

      <h2 className="titre-mini">Ton héritage</h2>
      <label className="my-2 block text-[17px] font-semibold" htmlFor="xpperm">
        XP permanents du joueur
      </label>
      <input
        id="xpperm"
        type="number"
        min={0}
        max={99}
        value={fiche.xpPerm ?? 0}
        onChange={(e) =>
          onMaj({ ...fiche, xpPerm: Math.max(0, parseInt(e.target.value || '0', 10)) })
        }
        className="w-full rounded-lg border-[1.5px] border-border/50 bg-input p-3 font-corps text-[16.5px] text-foreground focus:border-primary focus:outline-none"
      />
      <p className="mt-1 text-sm text-muted-foreground">
        {regles.heritage.xp_permanent} À confirmer avec un MJ à l'accueil.
      </p>

      {listeAchats().map((achat) => {
        const n = fiche.achats?.[achat.achat] ?? 0
        const max = achat.max_achats ?? 99
        const effet = effetAchat(achat.achat)
        return (
          <div
            key={achat.achat}
            className="my-2 flex items-start gap-2.5 rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm p-3"
          >
            <div className="flex-1">
              <b className="text-[16.5px] text-gold">{achat.achat}</b>{' '}
              <Badge variante="xp">{achat.cout_xp} XP</Badge>
              {achat.max_achats !== undefined && <Badge>max {achat.max_achats}</Badge>}
              {achat.restriction && (
                <p className="my-0.5 text-sm text-muted-foreground">{achat.restriction}</p>
              )}
              {effet.type === 'capacite' && n > 0 && (
                <div className="mt-1.5">
                  <p className="my-1 text-sm text-muted-foreground">
                    Choisis {n > 1 ? `${n} capacités` : 'la capacité'} de niveau {effet.niveau} (
                    {(fiche.capChoix?.[String(effet.niveau)] ?? []).length}/{n}) :
                  </p>
                  <div className="flex flex-col">
                    {bassinAchat(fiche, effet.niveau).map((capacite) => {
                      const prise = (fiche.capChoix?.[String(effet.niveau)] ?? []).includes(
                        capacite.id,
                      )
                      return (
                        <CarteCapacite
                          key={capacite.id}
                          capacite={capacite}
                          choisie={prise}
                          avecVoie
                          onChoisir={() => basculerCapacite(effet.niveau, capacite.id)}
                        />
                      )
                    })}
                  </div>
                </div>
              )}
              {effet.type === 'carac' && n > 0 && (
                <p className="my-0.5 text-sm text-muted-foreground">
                  S'ouvre à l'étape « Forces » (max {regles.caracteristiques.creation.max} par
                  caractéristique).
                </p>
              )}
              {(effet.type === 'don' || effet.type === 'competence') && n > 0 && (
                <p className="my-0.5 text-sm text-muted-foreground">S'ouvre à l'étape « Talents ».</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={n === 0}
                onClick={() => majAchat(achat, -1)}
                aria-label={`${achat.achat} : moins`}
                className="h-[34px] w-[34px] rounded-full border-[1.5px] border-border/50 bg-input text-lg disabled:opacity-30"
              >
                −
              </button>
              <span className="min-w-[18px] text-center font-semibold">{n}</span>
              <button
                type="button"
                disabled={n >= max}
                onClick={() => majAchat(achat, 1)}
                aria-label={`${achat.achat} : plus`}
                className="h-[34px] w-[34px] rounded-full border-[1.5px] border-border/50 bg-input text-lg disabled:opacity-30"
              >
                +
              </button>
            </div>
          </div>
        )
      })}
      {reste < 0 && <ErreurNote>Tu dépenses plus d'XP que tu n'en as.</ErreurNote>}
      <Note>
        Ligne de coupe D9 ② : au besoin, les achats d'héritage se font sur papier avec un MJ.
      </Note>
    </section>
  )
}
