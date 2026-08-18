/**
 * Étape 6 — Talents (maquette A v3) : dons (cartes, cumulables avec
 * « − Retirer / + Reprendre (×n) » dans la carte, estompées quand le droit
 * est épuisé) puis compétences et artisanats (max lu du fichier, section
 * présente ssi la tranche y a droit — D10). Décocher Érudit avec des
 * langues déjà choisies passe par la fenêtre de répercussions.
 */
import { droitLangues } from '../../rules/langues'
import { getRules } from '../../rules/load'
import { valeurCarac } from '../../rules/stats'
import {
  artisanatsChoisis,
  artisanatsPour,
  consommationDons,
  droitCompetences,
  droitDons,
  listeCompetencesSimples,
  listeDons,
  maxArtisanats,
} from '../../rules/talents'
import { compteAchats } from '../../rules/heritage'
import { surplusCompetences, surplusDons, type Changement } from '../../wizard/validation'
import type { FicheCreation } from '../../wizard/types'
import { Badge, CarteChoix, ErreurNote, Note, Tutoriel, Verbatim } from './ui'

interface Props {
  fiche: FicheCreation
  onMaj: (fiche: FicheCreation) => void
  onChangement: (changement: Changement) => void
}

export default function EtapeTalents({ fiche, onMaj, onChangement }: Props) {
  const regles = getRules()
  const esprit = valeurCarac(fiche, 'e')
  const dons = fiche.dons ?? {}
  const droit = droitDons(esprit, fiche.achats)
  const pris = consommationDons(dons)
  const comps = fiche.comps ?? []
  const droitComps = droitCompetences(fiche.achats)
  const artisanats = fiche.trancheAge ? artisanatsPour(fiche.trancheAge) : []
  const nbArtisanats = artisanatsChoisis(comps).length
  const donsEnTrop = surplusDons(fiche)
  const compsEnTrop = surplusCompetences(fiche)
  const achatsDon = compteAchats(fiche.achats, 'don')
  const achatsComp = compteAchats(fiche.achats, 'competence')

  function majDon(id: string, n: number) {
    const suite = { ...dons }
    if (n <= 0) delete suite[id]
    else suite[id] = n
    onMaj({ ...fiche, dons: suite })
  }

  function basculerComp(id: string) {
    const index = comps.indexOf(id)
    if (index >= 0) {
      const suite = comps.filter((c) => c !== id)
      // Décocher Érudit peut mettre les langues choisies en surplus.
      const droitApres = droitLangues(esprit, suite)
      const impacts =
        (fiche.langChoix ?? []).length > droitApres
          ? [`Sans Érudit, tu perds des choix de langue : il faudra en retirer à l'étape Langues.`]
          : []
      onChangement({ fiche: { ...fiche, comps: suite }, retraits: impacts })
    } else {
      onMaj({ ...fiche, comps: [...comps, id] })
    }
  }

  return (
    <section>
      <h2 className="titre-etape">Tes talents</h2>
      <Tutoriel
        etapeId="talents"
        gestes={[
          <>
            Choisis tes <b>{droit} don{droit > 1 ? 's' : ''}</b> (compteur en haut de la liste).
          </>,
          <>
            Choisis ensuite tes <b>{droitComps} compétence{droitComps > 1 ? 's' : ''}</b> — dont
            au plus {maxArtisanats()} artisanat.
          </>,
          'Retirer un choix : retouche sa carte.',
        ]}
        pourquoi="niveau 1 = 1 don et 1 compétence (table p.5) ; ton Esprit et ton héritage peuvent en ouvrir d'autres."
      />

      <p className="my-2 text-base text-[#96a0b1]">
        <b>Dons</b> — {pris}/{droit}
        {esprit >= 3 ? ' (dont 1 d’Esprit 3)' : ''}
        {achatsDon > 0 ? ` (+ ${achatsDon} d'héritage)` : ''}
      </p>
      {donsEnTrop > 0 && (
        <ErreurNote>
          Retire {donsEnTrop} don{donsEnTrop > 1 ? 's' : ''} : ton droit a baissé.
        </ErreurNote>
      )}
      {listeDons().map((don) => {
        const n = dons[don.id] ?? 0
        const plein = pris >= droit
        return (
          <CarteChoix
            key={don.id}
            petite
            choisi={n > 0}
            eteinte={plein && n === 0}
            onChoisir={() => {
              if (n > 0) majDon(don.id, 0)
              else if (!plein) majDon(don.id, 1)
            }}
          >
            <h3 className="m-0 mb-1 font-titre text-[17.5px] font-bold text-or">
              {don.nom}
              {don.cumulable && <Badge>cumulable</Badge>}
              {n > 1 && <Badge variante="gold">×{n}</Badge>}
            </h3>
            <Verbatim texte={don.verbatim} />
            {don.cumulable && n > 0 && (
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  className="subsel-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    majDon(don.id, n - 1)
                  }}
                >
                  − Retirer
                </button>
                <button
                  type="button"
                  className="subsel-btn"
                  disabled={plein}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!plein) majDon(don.id, n + 1)
                  }}
                >
                  + Reprendre (×{n + 1})
                </button>
              </div>
            )}
          </CarteChoix>
        )
      })}

      <h2 className="titre-mini">Tes compétences</h2>
      <p className="my-2 text-base text-[#96a0b1]">
        <b>Compétences</b> — {comps.length}/{droitComps}
        {achatsComp > 0 ? ` (+ ${achatsComp} d'héritage)` : ''}
      </p>
      {compsEnTrop > 0 && (
        <ErreurNote>
          Retire {compsEnTrop} compétence{compsEnTrop > 1 ? 's' : ''} : ton droit a baissé.
        </ErreurNote>
      )}
      {listeCompetencesSimples().map((comp) => {
        const prise = comps.includes(comp.id)
        const plein = comps.length >= droitComps
        return (
          <CarteChoix
            key={comp.id}
            petite
            choisi={prise}
            eteinte={plein && !prise}
            onChoisir={() => basculerComp(comp.id)}
          >
            <h3 className="m-0 mb-1 font-titre text-[17.5px] font-bold text-or">{comp.nom}</h3>
            <Verbatim texte={comp.base} />
            {comp.materiel && <Badge>Matériel : {comp.materiel}</Badge>}
          </CarteChoix>
        )
      })}

      {artisanats.length > 0 && (
        <>
          <h2 className="titre-mini !text-[19px]">Artisanats</h2>
          <p className="my-1 text-[15px] italic text-[#aab3c2]">
            {regles.competences.artisanats.verbatim_interdiction}
          </p>
          <Note>
            Tu as {regles.age_et_gates.seuil.joueur_regulier} : les artisanats te sont ouverts.{' '}
            <b>Maximum {maxArtisanats()} artisanat</b>, même avec plusieurs compétences.
          </Note>
          {artisanats.map((artisanat) => {
            const pris2 = comps.includes(artisanat.id)
            const bloque =
              (comps.length >= droitComps || nbArtisanats >= maxArtisanats()) && !pris2
            return (
              <CarteChoix
                key={artisanat.id}
                petite
                choisi={pris2}
                eteinte={bloque}
                onChoisir={() => {
                  if (pris2) basculerComp(artisanat.id)
                  else if (!bloque) basculerComp(artisanat.id)
                }}
              >
                <h3 className="m-0 mb-1 font-titre text-[17.5px] font-bold text-or">
                  {artisanat.nom}
                </h3>
                {artisanat.capacites.map((capacite) => (
                  <Verbatim key={capacite.nom} gras={capacite.nom} texte={capacite.verbatim} />
                ))}
                {artisanat.materiel && <Badge>Matériel : {artisanat.materiel}</Badge>}
              </CarteChoix>
            )
          })}
        </>
      )}
    </section>
  )
}
