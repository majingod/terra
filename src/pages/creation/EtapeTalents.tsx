/**
 * Étape 6 — Talents (maquette A v3) : dons (cartes, cumulables avec
 * « − Retirer / + Reprendre (×n) » dans la carte, estompées quand le droit
 * est épuisé — la carte vit dans `SelecteurDons`, la montée de niveau D17
 * réutilise la même) puis compétences et artisanats (max lu du fichier, section
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
import { donsCumules, normaliserNiveau } from '../../rules/niveau'
import { surplusCompetences, surplusDons, type Changement } from '../../wizard/validation'
import type { FicheCreation } from '../../wizard/types'
import { CarteDon } from './SelecteurDons'
import { Badge, CarteChoix, ErreurNote, Note, TexteRegle, Tutoriel } from './ui'

interface Props {
  fiche: FicheCreation
  onMaj: (fiche: FicheCreation) => void
  onChangement: (changement: Changement) => void
}

export default function EtapeTalents({ fiche, onMaj, onChangement }: Props) {
  const regles = getRules()
  const esprit = valeurCarac(fiche, 'e')
  const dons = fiche.dons ?? {}
  const niveau = normaliserNiveau(fiche.niveau)
  const droit = droitDons(esprit, fiche.achats, niveau)
  const pris = consommationDons(dons)
  const comps = fiche.comps ?? []
  const droitComps = droitCompetences(fiche.achats, niveau)
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
        pourquoi={`ton niveau ${niveau} donne ${donsCumules(niveau)} don${donsCumules(niveau) > 1 ? 's' : ''} cumulé${donsCumules(niveau) > 1 ? 's' : ''} (table d'évolution) ; ton Esprit et ton héritage peuvent en ouvrir d'autres.`}
      />

      <p className="my-2 text-base text-muted-foreground">
        <b>Dons</b> — {pris}/{droit}
        {niveau > 1 ? ` (dont ${donsCumules(niveau)} de niveau ${niveau})` : ''}
        {esprit >= 3 ? ' (dont 1 d’Esprit 3)' : ''}
        {achatsDon > 0 ? ` (+ ${achatsDon} d'héritage)` : ''}
      </p>
      {donsEnTrop > 0 && (
        <ErreurNote>
          Retire {donsEnTrop} don{donsEnTrop > 1 ? 's' : ''} : ton droit a baissé.
        </ErreurNote>
      )}
      {listeDons().map((don) => (
        <CarteDon
          key={don.id}
          don={don}
          n={dons[don.id] ?? 0}
          plein={pris >= droit}
          onMaj={majDon}
        />
      ))}

      <h2 className="titre-mini">Tes compétences</h2>
      <p className="my-2 text-base text-muted-foreground">
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
            <h3 className="m-0 mb-1 font-titre text-[17.5px] font-bold text-gold">{comp.nom}</h3>
            <TexteRegle source={{ verbatim: comp.base }} />
            {comp.materiel && <Badge>Matériel : {comp.materiel}</Badge>}
          </CarteChoix>
        )
      })}

      {artisanats.length > 0 && (
        <>
          <h2 className="titre-mini !text-[19px]">Artisanats</h2>
          <p className="my-1 text-[15px] italic text-secondary-foreground">
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
                <h3 className="m-0 mb-1 font-titre text-[17.5px] font-bold text-gold">
                  {artisanat.nom}
                </h3>
                {artisanat.capacites.map((capacite) => (
                  <TexteRegle key={capacite.nom} gras={capacite.nom} source={capacite} />
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
