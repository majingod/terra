/**
 * Le sélecteur de capacités en accordéons par voie (maquette v5).
 *
 * Extrait tel quel de l'étape « Tes capacités » (D16) pour être RÉUTILISÉ —
 * la création s'en sert pour chaque emplacement de niveau, la montée de
 * niveau (D17) pour l'échelon atteint. Un seul écran de choix de capacité
 * existe dans l'app : celui-ci.
 *
 * Il ne calcule aucun bassin et ne connaît aucune règle : il rend les options
 * qu'on lui donne (`optionsDuNiveau`, qui s'appuie sur `capacitesDisponibles`
 * et l'anti-doublon global).
 */
import { useState } from 'react'
import type { CapaciteDeVoie } from '../../rules/capacites'
import type { Don } from '../../rules/load'
import type { OptionDeCapacite } from '../../wizard/capacites'
import type { OptionDeDon } from '../../wizard/troc'
import { Badge, TexteRegle } from './ui'

/** Les options d'un emplacement, regroupées par voie, dans l'ordre de l'arbre. */
export function groupesParVoie(options: OptionDeCapacite[]) {
  const groupes: Array<{ voieId: string; voieNom: string; options: OptionDeCapacite[] }> = []
  for (const option of options) {
    const dernier = groupes.find((g) => g.voieId === option.capacite.voieId)
    if (dernier) dernier.options.push(option)
    else
      groupes.push({
        voieId: option.capacite.voieId,
        voieNom: option.capacite.voieNom,
        options: [option],
      })
  }
  return groupes
}

/**
 * Une carte de capacité choisissable (maquette v5) : nom en Cinzel, badge de
 * niveau, description au complet — jamais de troncature, jamais d'aperçu,
 * jamais de chevron de carte. Choisie : contour orangé 2 px, halo léger,
 * coche ronde dégradée or, fond teinté `--primary` ~8 %, nom en or.
 *
 * `avecVoie` affiche le nom de la voie en italique — les achats XP (à plat,
 * sans étage voie) en ont besoin ; dans un accordéon de voie, c'est redondant
 * avec l'en-tête et ne s'affiche pas.
 */
export function CarteCapacite({
  capacite,
  choisie,
  onChoisir,
  avecVoie,
}: {
  capacite: CapaciteDeVoie
  choisie: boolean
  onChoisir: () => void
  avecVoie?: boolean
}) {
  return (
    <button
      type="button"
      aria-pressed={choisie}
      onClick={onChoisir}
      className={`my-1.5 block min-h-touch w-full rounded-lg border p-2.5 text-left transition-all duration-300 ${
        choisie
          ? 'border-2 border-primary bg-primary/[0.08] glow-gold'
          : 'border-border/50 bg-muted/40'
      }`}
    >
      <span className="flex items-center gap-2">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <b className={`font-titre text-[17px] ${choisie ? 'text-gold' : ''}`}>{capacite.nom}</b>
          {avecVoie && <i className="text-[14.5px] text-muted-foreground">{capacite.voieNom}</i>}
        </span>
        <span className="ml-auto flex flex-none items-center gap-1.5">
          <Badge>niv {capacite.niveau}</Badge>
          {choisie && (
            <span
              aria-hidden
              className="coche-or flex h-6 w-6 flex-none items-center justify-center rounded-full text-[13px] text-primary-foreground"
            >
              ✓
            </span>
          )}
        </span>
      </span>
      <TexteRegle source={capacite} />
    </button>
  )
}

/**
 * Une carte indisponible : rayée, sans description, insensible au toucher.
 * `raison` dit POURQUOI quand ce n'est pas « déjà choisie » — D18 s'en sert
 * pour le plafond du troc et pour un don non cumulable déjà pris.
 */
function CarteIndisponible({ nom, raison }: { nom: string; raison?: string }) {
  return (
    <div className="my-1.5 flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 p-2.5 opacity-45">
      <b className="font-titre text-[17px] line-through">{nom}</b>
      <span className="ml-auto flex-none text-right text-[13.5px] italic text-muted-foreground">
        {raison ?? 'déjà choisie'}
      </span>
    </div>
  )
}

/**
 * La carte d'un DON offert dans un emplacement de capacité (D18, troc du
 * guerrier) : mêmes gestes et même peau que `CarteCapacite` — texte complet,
 * contour orangé au choix, retoucher désélectionne. Le badge dit « don »
 * plutôt qu'un échelon : un don n'en a pas.
 */
export function CarteDonTroc({
  don,
  choisi,
  onChoisir,
}: {
  don: Don
  choisi: boolean
  onChoisir: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={choisi}
      onClick={onChoisir}
      className={`my-1.5 block min-h-touch w-full rounded-lg border p-2.5 text-left transition-all duration-300 ${
        choisi
          ? 'border-2 border-primary bg-primary/[0.08] glow-gold'
          : 'border-border/50 bg-muted/40'
      }`}
    >
      <span className="flex items-center gap-2">
        <b className={`font-titre text-[17px] ${choisi ? 'text-gold' : ''}`}>{don.nom}</b>
        <span className="ml-auto flex flex-none items-center gap-1.5">
          <Badge>don</Badge>
          {don.cumulable && <Badge>cumulable</Badge>}
          {choisi && (
            <span
              aria-hidden
              className="coche-or flex h-6 w-6 flex-none items-center justify-center rounded-full text-[13px] text-primary-foreground"
            >
              ✓
            </span>
          )}
        </span>
      </span>
      <TexteRegle source={don} />
    </button>
  )
}

/**
 * L'accordéon d'une voie, dans un emplacement ouvert (maquette v5) : fermé
 * par défaut. En-tête tactile : chevron (pivote à l'ouverture) · nom de la
 * voie en Cinzel · pastille de compte à droite — le nombre de capacités
 * CHOISISSABLES pour cet emplacement (niveau ≤ k, moins les déjà-prises),
 * jamais le total de la voie. Voie portant le choix courant : un point
 * orangé et le nom de la capacité choisie s'intercalent avant la pastille —
 * repliée ou non (maquette v5), pour qu'on sache toujours où vit le choix.
 */
function AccordeonVoie({
  voieNom,
  options,
  ouverte,
  onBasculer,
  onChoisir,
}: {
  voieNom: string
  options: OptionDeCapacite[]
  ouverte: boolean
  onBasculer: () => void
  onChoisir: (id: string) => void
}) {
  const choisissables = options.filter((option) => !option.dejaPrise).length
  const choix = options.find((option) => option.choisie)
  return (
    <div className="my-2 overflow-hidden rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm">
      <button
        type="button"
        aria-expanded={ouverte}
        onClick={onBasculer}
        className="flex min-h-touch w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        <span
          aria-hidden
          className={`flex-none text-muted-foreground transition-transform duration-200 ${
            ouverte ? 'rotate-90' : ''
          }`}
        >
          ▸
        </span>
        <h4 className="m-0 flex-none font-titre text-[15px] font-semibold uppercase tracking-wide text-gold">
          {voieNom}
        </h4>
        {choix && (
          <span className="flex min-w-0 items-center gap-1.5 text-[14px] text-muted-foreground">
            <span aria-hidden className="h-2 w-2 flex-none rounded-full bg-primary" />
            <span className="truncate">{choix.capacite.nom}</span>
          </span>
        )}
        <span className="ml-auto flex-none">
          <Badge>{choisissables}</Badge>
        </span>
      </button>
      {ouverte && (
        <div className="border-t border-border/40 px-3 pb-2.5 pt-1">
          {options.map((option) =>
            option.dejaPrise ? (
              <CarteIndisponible
                key={option.capacite.id}
                nom={option.capacite.nom}
                raison={option.raison}
              />
            ) : (
              <CarteCapacite
                key={option.capacite.id}
                capacite={option.capacite}
                choisie={option.choisie}
                onChoisir={() => onChoisir(option.capacite.id)}
              />
            ),
          )}
        </div>
      )}
    </div>
  )
}

/**
 * D18 — l'accordéon de troc : UNE VOIE DE PLUS sous les vraies voies, mêmes
 * gestes, même pastille de compte. Elle offre des dons au lieu de capacités ;
 * un don non cumulable déjà pris s'y montre éteint, avec sa raison.
 */
function AccordeonTroc({
  titre,
  options,
  ouverte,
  onBasculer,
  onChoisir,
}: {
  titre: string
  options: OptionDeDon[]
  ouverte: boolean
  onBasculer: () => void
  onChoisir: (id: string) => void
}) {
  const choisissables = options.filter((option) => !option.indisponible).length
  const choix = options.find((option) => option.choisi)
  return (
    <div className="my-2 overflow-hidden rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm">
      <button
        type="button"
        aria-expanded={ouverte}
        onClick={onBasculer}
        className="flex min-h-touch w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        <span
          aria-hidden
          className={`flex-none text-muted-foreground transition-transform duration-200 ${
            ouverte ? 'rotate-90' : ''
          }`}
        >
          ▸
        </span>
        <h4 className="m-0 font-titre text-[15px] font-semibold uppercase tracking-wide text-gold">
          {titre}
        </h4>
        {choix && (
          <span className="flex min-w-0 items-center gap-1.5 text-[14px] text-muted-foreground">
            <span aria-hidden className="h-2 w-2 flex-none rounded-full bg-primary" />
            <span className="truncate">{choix.don.nom}</span>
          </span>
        )}
        <span className="ml-auto flex-none">
          <Badge>{choisissables}</Badge>
        </span>
      </button>
      {ouverte && (
        <div className="border-t border-border/40 px-3 pb-2.5 pt-1">
          {options.map((option) =>
            option.indisponible ? (
              <CarteIndisponible
                key={option.don.id}
                nom={option.don.nom}
                raison={option.raison}
              />
            ) : (
              <CarteDonTroc
                key={option.don.id}
                don={option.don}
                choisi={option.choisi}
                onChoisir={() => onChoisir(option.don.id)}
              />
            ),
          )}
        </div>
      )}
    </div>
  )
}

/** Ce qu'un emplacement offre en troc (D18) — absent quand la classe n'en a pas. */
export interface TrocDeLEmplacement {
  titre: string
  options: OptionDeDon[]
  onChoisir: (id: string) => void
}

/**
 * Les trois voies d'un emplacement, en accordéons repliés par défaut. Les
 * voies ouvertes sont un état LOCAL : remonter le composant (une `key` par
 * emplacement) les replie, comme la maquette le demande à chaque changement
 * d'emplacement.
 *
 * D18 : quand la classe troque ses capacités contre des dons, `troc` ajoute
 * une voie de plus SOUS les vraies voies. Le choix reste unique pour
 * l'emplacement, toutes voies confondues — c'est l'appelant qui le tient,
 * comme il tenait déjà l'exclusivité entre les trois voies.
 */
export default function SelecteurCapacites({
  options,
  onChoisir,
  troc,
}: {
  options: OptionDeCapacite[]
  onChoisir: (id: string) => void
  troc?: TrocDeLEmplacement
}) {
  const [voiesOuvertes, setVoiesOuvertes] = useState<Set<string>>(new Set())

  function basculerVoie(voieId: string) {
    setVoiesOuvertes((precedent) => {
      const suite = new Set(precedent)
      if (suite.has(voieId)) suite.delete(voieId)
      else suite.add(voieId)
      return suite
    })
  }

  return (
    <>
      {groupesParVoie(options).map((groupe) => (
        <AccordeonVoie
          key={groupe.voieId}
          voieNom={groupe.voieNom}
          options={groupe.options}
          ouverte={voiesOuvertes.has(groupe.voieId)}
          onBasculer={() => basculerVoie(groupe.voieId)}
          onChoisir={onChoisir}
        />
      ))}
      {troc && (
        <AccordeonTroc
          titre={troc.titre}
          options={troc.options}
          ouverte={voiesOuvertes.has(TROC)}
          onBasculer={() => basculerVoie(TROC)}
          onChoisir={troc.onChoisir}
        />
      )}
    </>
  )
}

/** Clé d'ouverture de la voie de troc — elle n'a pas d'id de voie à elle. */
const TROC = '\u0000troc'

/**
 * D18-bis — le troc du mage : sous les dons, UN SEUL en-tête
 * (« ✦ Troquer contre une capacité », le plafond de l'échelon à droite), puis
 * les voies de la classe en accordéons ORDINAIRES — chacune garde son nom et
 * son compte de choisissables, comme n'importe quel accordéon depuis #20.
 *
 * Les capacités au-dessus du plafond, et celles déjà prises ailleurs, s'y
 * montrent éteintes avec leur raison plutôt que d'être escamotées.
 */
export function SelecteurTrocDeDon({
  titre,
  plafond,
  options,
  onChoisir,
}: {
  titre: string
  /** Ce que l'en-tête porte à droite (« niveau ≤ N »). */
  plafond: string
  options: OptionDeCapacite[]
  onChoisir: (id: string) => void
}) {
  const [voiesOuvertes, setVoiesOuvertes] = useState<Set<string>>(new Set())
  return (
    <>
      <div className="mt-4 flex items-baseline gap-2 border-t border-gold-dark/60 pt-3">
        <h4 className="m-0 flex-1 font-titre text-[15px] font-semibold text-gold">{titre}</h4>
        <span className="flex-none text-[13.5px] text-muted-foreground">{plafond}</span>
      </div>
      {groupesParVoie(options).map((groupe) => (
        <AccordeonVoie
          key={groupe.voieId}
          voieNom={groupe.voieNom}
          options={groupe.options}
          ouverte={voiesOuvertes.has(groupe.voieId)}
          onBasculer={() =>
            setVoiesOuvertes((precedent) => {
              const suite = new Set(precedent)
              if (suite.has(groupe.voieId)) suite.delete(groupe.voieId)
              else suite.add(groupe.voieId)
              return suite
            })
          }
          onChoisir={onChoisir}
        />
      ))}
    </>
  )
}
