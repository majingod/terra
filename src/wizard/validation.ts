/**
 * Validation des étapes du wizard et fenêtre de répercussions.
 *
 * Deux régimes (spec t004) :
 * - « l'impossible se retire tout seul et la fenêtre le nomme » :
 *   changerFaction / changerClasse rendent la fiche corrigée
 *   ET la liste nommée des retraits (la fenêtre l'affiche, Annuler restaure) ;
 * - « le surplus se retire par le joueur » : surplusDons / surplusLangues /
 *   surplusCompetences alimentent les bandeaux rouges « retire N », la
 *   navigation avant restant verrouillée par les validateurs.
 */
import { TRANCHES_AGE, type TrancheAge } from '../rules/age'
import { problemesChoix } from '../rules/capacites'
import { validerRepartition } from '../rules/caracs'
import {
  compteAchats,
  desavantagesDisponibles,
  desavantagesInterditsPour,
  effetAchat,
  listeAchats,
  listeDesavantages,
  totalAchats,
  validerAchats,
} from '../rules/heritage'
import { droitLangues, refusLangues } from '../rules/langues'
import { getRules } from '../rules/load'
import { niveauxPossibles, normaliserNiveau, pointsCaracCumules } from '../rules/niveau'
import {
  classesPourFaction,
  racesPourFaction,
  raceDe,
  valeurCarac,
} from '../rules/stats'
import {
  consommationDons,
  droitCompetences,
  droitDons,
  listeDons,
  refusCompetences,
  refusDons,
} from '../rules/talents'
import {
  echelonsDeDon,
  prendUnDonAuLieuDUneCapacite,
  prendUneCapaciteAuLieuDUnDon,
  plafondDuTrocDeDon,
} from '../rules/troc'
import {
  bassinAchat,
  capaciteParId,
  choixDeNiveaux,
  emplacementsTroques,
  niveauxDeLaFiche,
} from './capacites'
import { niveauCourant } from './historique'
import { capacitesTroquees, donsPris } from './troc'
import type { FicheCreation } from './types'

/**
 * D20-bis (t017, Q23 A, 2026-08-26 — retour terrain) : l'étape « Ton niveau »
 * n'est PLUS une étape du wizard 12+. Elle arrivait avant que le joueur ait
 * compris ce qu'on lui demandait. Tout personnage naît niveau 1 et monte
 * depuis sa fiche, un niveau à la fois. Le camp mène droit à la classe.
 *
 * ⚠️ Le flux ≤11 garde la sienne (`ETAPES_ENFANT`) : chez eux le niveau se
 * DÉCLARE, il n'y a pas de montées.
 */
export const ETAPES = [
  { id: 'age', nom: 'Âge' },
  { id: 'camp', nom: 'Camp' },
  { id: 'classe', nom: 'Classe' },
  { id: 'capacites', nom: 'Tes capacités' },
  { id: 'destin', nom: 'Destin' },
  { id: 'forces', nom: 'Forces' },
  { id: 'talents', nom: 'Talents' },
  { id: 'langues', nom: 'Langues' },
  { id: 'nom', nom: 'Nom' },
  { id: 'fiche', nom: 'Fiche' },
] as const

export type EtapeId = (typeof ETAPES)[number]['id']

/** Tranche d'âge qui poursuit le wizard du Tome (l'autre prend le flux enfant). */
export function trancheQuiContinue(): TrancheAge {
  const interdite = getRules().competences.artisanats.interdit_tranche
  const restantes = TRANCHES_AGE.filter((t) => t !== interdite)
  return restantes[0]
}

/**
 * Tranche qui joue avec la planche enfant : celle à qui le Tome interdit les
 * artisanats (lue du fichier, jamais recopiée). Une seule et même donnée
 * décide donc de la gate artisanats et de l'embranchement du wizard — pas de
 * second marqueur sur le joueur.
 */
export function trancheEnfant(): TrancheAge {
  const interdite = getRules().competences.artisanats.interdit_tranche
  return TRANCHES_AGE.filter((t) => t === interdite)[0]
}

// ---------------------------------------------------------------------------
// Validateurs d'étapes — [] = étape valide
// ---------------------------------------------------------------------------

export function problemesAge(fiche: FicheCreation): string[] {
  if (!fiche.trancheAge) return ["tranche d'âge non choisie"]
  if (fiche.trancheAge !== trancheQuiContinue()) {
    return ['tranche renvoyée vers la feuille enfant']
  }
  return []
}

export function problemesCamp(fiche: FicheCreation): string[] {
  const problemes: string[] = []
  const faction = getRules().factions.liste.find((f) => f.id === fiche.faction)
  if (!faction) return ['faction non choisie']
  const race = racesPourFaction(faction.id).find((r) => r.id === fiche.race)
  if (!race) {
    problemes.push('race non choisie')
    return problemes
  }
  const choix = race.bonus.find(
    (b): b is { choix: string[] } => typeof b === 'object' && 'choix' in b,
  )
  if (choix && (!fiche.humainChoix || !choix.choix.includes(fiche.humainChoix))) {
    problemes.push('bonus au choix non choisi')
  }
  return problemes
}

/**
 * La CIBLE du train de montées (D20). Le personnage naît toujours au niveau 1 ;
 * absente, la cible vaut le niveau minimum — le train ne part pas.
 *
 * ⚠️ CODE DORMANT depuis D20-bis (t017) : plus aucune étape du wizard ne pose
 * de cible. Ce validateur, le champ `cible` et la migration de brouillon de
 * `Creer.tsx` restent pour le CHEMIN HÉRITÉ — un brouillon commencé avant ce
 * lot porte encore une cible, et il monte encore par le train. Chemin assumé,
 * pas un oubli : ⛔ ne rien y ajouter, ⛔ ne rien y retirer sans arbitrage.
 */
export function problemesNiveau(fiche: FicheCreation): string[] {
  if (fiche.cible === undefined) return [] // défaut : niveau min de la table
  if (!niveauxPossibles().includes(fiche.cible)) {
    return [`niveau hors table : ${fiche.cible}`]
  }
  return []
}

export function problemesClasse(fiche: FicheCreation): string[] {
  if (!fiche.faction) return ['faction manquante']
  const classe = classesPourFaction(fiche.faction).find((c) => c.id === fiche.classe)
  if (!classe) return ['classe non choisie']
  return []
}

/**
 * Étape « Tes capacités » (D16) : un choix par niveau du personnage, pris
 * dans TOUT l'arbre de la classe, de niveau ≤ l'échelon d'acquisition,
 * jamais deux fois la même. Le critère trié vit dans src/rules/capacites.ts ;
 * ici s'ajoutent les deux vérifications de contexte — la capacité existe bien
 * dans l'arbre de la classe, et l'emplacement du niveau k ne porte pas plus
 * haut que k.
 */
export function problemesCapacites(fiche: FicheCreation): string[] {
  if (!fiche.classe) return ['classe manquante']
  const problemes: string[] = []
  const catalogueDons = listeDons()
  for (const niveau of niveauxDeLaFiche(fiche)) {
    const id = fiche.capNiveaux?.[String(niveau)]
    const donTroque = fiche.donNiveaux?.[String(niveau)]
    // D18 : un emplacement porte une capacité OU un don, jamais les deux.
    if (id && donTroque) {
      problemes.push(`l'emplacement du niveau ${niveau} porte à la fois une capacité et un don`)
    }
    if (donTroque) {
      if (!prendUnDonAuLieuDUneCapacite(fiche.classe)) {
        problemes.push(`cette classe ne troque pas ses capacités contre des dons`)
      } else if (!catalogueDons.some((don) => don.id === donTroque)) {
        problemes.push(`don inconnu à l'emplacement du niveau ${niveau} : ${donTroque}`)
      }
    }
    if (!id) continue
    const capacite = capaciteParId(fiche.classe, id)
    if (!capacite) {
      problemes.push(`capacité hors de l'arbre de la classe : ${id}`)
      continue
    }
    if (capacite.niveau > niveau) {
      problemes.push(`« ${capacite.nom} » dépasse l'emplacement du niveau ${niveau}`)
    }
  }
  problemes.push(
    ...problemesChoix(
      niveauCourant(fiche),
      choixDeNiveaux(fiche),
      emplacementsTroques(fiche).length,
    ),
  )
  const desAchats = new Set(Object.values(fiche.capChoix ?? {}).flat())
  for (const id of Object.values(fiche.capNiveaux ?? {})) {
    if (desAchats.has(id)) {
      const capacite = capaciteParId(fiche.classe, id)
      problemes.push(`« ${capacite?.nom ?? id} » est déjà prise en achat d'héritage`)
    }
  }
  problemes.push(...problemesTrocDeDon(fiche))
  return problemes
}

/**
 * D18 — les capacités prises à la place d'un don (troc du mage) : la classe
 * doit porter ce troc, l'échelon doit être un échelon qui DONNE un don, la
 * capacité doit être de l'arbre de la classe et de niveau ≤ l'échelon, et
 * l'anti-doublon D16 vaut à travers tout.
 */
function problemesTrocDeDon(fiche: FicheCreation): string[] {
  const problemes: string[] = []
  const entrees = Object.entries(fiche.capDons ?? {})
  if (entrees.length === 0) return problemes
  if (!prendUneCapaciteAuLieuDUnDon(fiche.classe)) {
    problemes.push(`cette classe ne troque pas ses dons contre des capacités`)
    return problemes
  }
  const echelons = new Set(echelonsDeDon(niveauCourant(fiche)).map(String))
  const ailleurs = [
    ...Object.values(fiche.capNiveaux ?? {}),
    ...Object.values(fiche.capChoix ?? {}).flat(),
  ]
  const vues = new Set<string>()
  for (const [cle, id] of entrees) {
    if (!echelons.has(cle)) {
      problemes.push(`l'échelon ${cle} ne donne pas de don : rien à troquer`)
    }
    const capacite = capaciteParId(fiche.classe, id)
    if (!capacite) {
      problemes.push(`capacité hors de l'arbre de la classe : ${id}`)
      continue
    }
    const plafond = plafondDuTrocDeDon(Number(cle))
    if (capacite.niveau > plafond) {
      problemes.push(`« ${capacite.nom} » dépasse le niveau du don obtenu (${plafond})`)
    }
    if (vues.has(id) || ailleurs.includes(id)) {
      problemes.push(`« ${capacite.nom} » est déjà prise ailleurs`)
    }
    vues.add(id)
  }
  return problemes
}

export function problemesDestin(fiche: FicheCreation): string[] {
  const problemes: string[] = []
  const ordre = fiche.desavOrdre ?? []
  const disponibles = new Set(desavantagesDisponibles(fiche.classe).map((d) => d.id))
  const vus = new Set<string>()
  for (const id of ordre) {
    if (vus.has(id)) problemes.push(`désavantage en double : ${id}`)
    vus.add(id)
    if (!disponibles.has(id)) problemes.push(`désavantage indisponible : ${id}`)
  }
  const aVariante = listeDesavantages().filter((d) => d.variante_xp !== undefined)
  for (const desavantage of aVariante) {
    if (ordre.includes(desavantage.id) && !fiche.racisteVar) {
      problemes.push(`sous-choix obligatoire : ${desavantage.nom}`)
    }
  }
  const xpPerm = fiche.xpPerm ?? 0
  if (!Number.isInteger(xpPerm) || xpPerm < 0) problemes.push('XP permanent invalide')
  problemes.push(...validerAchats(fiche))
  // Achats de capacité : autant de choix que d'achats, tous dans le bassin.
  const niveaux = new Set<number>()
  for (const achat of listeAchats()) {
    const effet = effetAchat(achat.achat)
    if (effet.type === 'capacite') niveaux.add(effet.niveau)
  }
  for (const niveau of niveaux) {
    const attendus = compteAchats(fiche.achats, 'capacite', niveau)
    const choisis = fiche.capChoix?.[String(niveau)] ?? []
    if (choisis.length !== attendus) {
      problemes.push(`capacités de niveau ${niveau} : ${choisis.length}/${attendus} choisies`)
    }
    const bassin = new Set(bassinAchat(fiche, niveau).map((c) => c.id))
    for (const id of choisis) {
      if (!bassin.has(id)) problemes.push(`capacité hors bassin : ${id}`)
    }
    if (new Set(choisis).size !== choisis.length) {
      problemes.push(`capacités de niveau ${niveau} en double`)
    }
  }
  return problemes
}

/**
 * Points de caractéristique à placer librement en plus de la répartition de
 * création : ceux que les échelons de niveau ajoutent (table d'évolution) et
 * ceux achetés à l'héritage. Aucun rythme n'est écrit ici.
 */
export function pointsCaracAPlacer(fiche: FicheCreation): number {
  return pointsCaracCumules(niveauCourant(fiche)) + totalAchats(fiche.achats, 'carac')
}

/** Points de caractéristique posés au-delà du droit (le joueur les retire). */
export function surplusPointsCarac(fiche: FicheCreation): number {
  const extras = fiche.extras ?? { p: 0, r: 0, e: 0 }
  return Math.max(0, extras.p + extras.r + extras.e - pointsCaracAPlacer(fiche))
}

export function problemesForces(fiche: FicheCreation): string[] {
  const problemes: string[] = []
  const { p, r, e } = fiche.caracs ?? {}
  if (p === undefined || r === undefined || e === undefined) {
    return ['jetons non tous posés']
  }
  if (!validerRepartition([p, r, e])) {
    problemes.push('répartition refusée : il faut exactement les jetons du fichier')
  }
  const extras = fiche.extras ?? { p: 0, r: 0, e: 0 }
  const aPlacer = pointsCaracAPlacer(fiche)
  const distribues = extras.p + extras.r + extras.e
  if (extras.p < 0 || extras.r < 0 || extras.e < 0) {
    problemes.push('point de caractéristique négatif')
  }
  if (distribues !== aPlacer) {
    problemes.push(`points de caractéristique : ${distribues}/${aPlacer} posés`)
  }
  const max = getRules().caracteristiques.creation.max
  for (const carac of ['p', 'r', 'e'] as const) {
    if (valeurCarac(fiche, carac) > max) {
      problemes.push(`caractéristique au-delà de ${max}`)
    }
  }
  return problemes
}

export function problemesTalents(fiche: FicheCreation): string[] {
  const problemes: string[] = []
  const esprit = valeurCarac(fiche, 'e')
  // D18 : la règle « un don non cumulable ne se prend qu'une fois » se juge
  // sur TOUTES les prises — celles de l'étape des dons et celles des
  // emplacements de capacité troqués.
  problemes.push(...refusDons(donsPris(fiche)))
  const droit = droitDons(esprit, fiche.achats, niveauCourant(fiche))
  const pris = consommationDonsDeLaFiche(fiche)
  if (pris !== droit) problemes.push(`dons : ${pris}/${droit}`)
  const comps = fiche.comps ?? []
  problemes.push(...refusCompetences(comps, fiche.trancheAge))
  const droitComps = droitCompetences(fiche.achats, niveauCourant(fiche))
  if (comps.length !== droitComps) problemes.push(`compétences : ${comps.length}/${droitComps}`)
  return problemes
}

export function problemesLangues(fiche: FicheCreation): string[] {
  const problemes: string[] = []
  const langChoix = fiche.langChoix ?? []
  problemes.push(...refusLangues(langChoix, fiche.race, fiche.classe))
  const droit = droitLangues(valeurCarac(fiche, 'e'), fiche.comps ?? [])
  if (langChoix.length !== droit) problemes.push(`langues : ${langChoix.length}/${droit}`)
  return problemes
}

export function problemesNom(fiche: FicheCreation): string[] {
  if (!fiche.nom || fiche.nom.trim().length === 0) return ['nom du personnage manquant']
  return []
}

const VALIDATEURS: Record<EtapeId, (fiche: FicheCreation) => string[]> = {
  age: problemesAge,
  camp: problemesCamp,
  // D20-bis : plus d'entrée `niveau` — l'étape n'existe plus dans `ETAPES`.
  classe: problemesClasse,
  capacites: problemesCapacites,
  destin: problemesDestin,
  forces: problemesForces,
  talents: problemesTalents,
  langues: problemesLangues,
  nom: problemesNom,
  fiche: () => [],
}

export function problemesEtape(fiche: FicheCreation, etape: EtapeId): string[] {
  return VALIDATEURS[etape](fiche)
}

export function etapeValide(fiche: FicheCreation, etape: EtapeId): boolean {
  return problemesEtape(fiche, etape).length === 0
}

/** La fiche (étape 9) est valide ssi toutes les précédentes le sont. */
export function etapesValides(fiche: FicheCreation): boolean[] {
  const valides = ETAPES.map((etape) => etapeValide(fiche, etape.id))
  const precedentes = valides.slice(0, -1).every(Boolean)
  valides[valides.length - 1] = precedentes
  return valides
}

/**
 * Une étape est accessible ssi TOUTES les précédentes sont valides
 * (pastilles : ✓ cliquable, 🔒 sinon).
 */
export function etapeAccessible(fiche: FicheCreation, index: number): boolean {
  const valides = etapesValides(fiche)
  return valides.slice(0, index).every(Boolean)
}

// ---------------------------------------------------------------------------
// Surplus (régime « le joueur retire ») — bandeaux rouges « retire N »
// ---------------------------------------------------------------------------

/**
 * Droits de don consommés par la fiche : les dons choisis, plus (D18) les
 * capacités prises À LA PLACE d'un don — un troc ne crée pas de droit, il
 * change ce qu'on met dans celui qu'on a.
 *
 * Un don pris à la place d'une CAPACITÉ (troc du guerrier) ne compte pas
 * ici : il occupe un emplacement de capacité, pas un droit de don.
 */
export function consommationDonsDeLaFiche(fiche: FicheCreation): number {
  return consommationDons(fiche.dons ?? {}) + capacitesTroquees(fiche).length
}

export function surplusDons(fiche: FicheCreation): number {
  const droit = droitDons(valeurCarac(fiche, 'e'), fiche.achats, niveauCourant(fiche))
  return Math.max(0, consommationDonsDeLaFiche(fiche) - droit)
}

export function surplusCompetences(fiche: FicheCreation): number {
  return Math.max(
    0,
    (fiche.comps ?? []).length - droitCompetences(fiche.achats, niveauCourant(fiche)),
  )
}

export function surplusLangues(fiche: FicheCreation): number {
  const droit = droitLangues(valeurCarac(fiche, 'e'), fiche.comps ?? [])
  return Math.max(0, (fiche.langChoix ?? []).length - droit)
}

// ---------------------------------------------------------------------------
// Répercussions (régime « l'impossible se retire tout seul »)
// ---------------------------------------------------------------------------

export interface Changement {
  /** Fiche résultante — appliquée seulement à la CONFIRMATION. */
  fiche: FicheCreation
  /** Impacts nommés pour la fenêtre « Si tu continues : ». */
  retraits: string[]
}

const CAP_CHOIX_VIDE: Record<string, string[]> = { 1: [], 2: [] }

function nbCapChoix(fiche: FicheCreation): number {
  return Object.values(fiche.capChoix ?? {}).reduce((somme, ids) => somme + ids.length, 0)
}

function nbCapNiveaux(fiche: FicheCreation): number {
  return (
    Object.keys(fiche.capNiveaux ?? {}).length + Object.keys(fiche.donNiveaux ?? {}).length
  )
}

/**
 * Changement de CIBLE — porté par l'étape « Ton niveau » jusqu'à D20-bis (t017),
 * qui l'a retirée du wizard 12+. CODE DORMANT : plus aucun écran ne l'appelle.
 *
 * La cible ne donne rien : elle dit seulement jusqu'où le train de montées
 * mènera le personnage après sa création, qui se fait toujours au niveau 1.
 * Aucun droit n'en dépend, donc aucun retrait à nommer — la fenêtre de
 * répercussions ne s'ouvre pas.
 *
 * ⛔ Il n'y a plus de « baisse de niveau » à la création : on ne peut plus
 * naître au-dessus du niveau 1. Le retour EN ARRIÈRE sur un niveau déjà
 * traversé, et sa fenêtre de répercussions, sont le lot 2.
 */
export function changerCible(fiche: FicheCreation, cible: number): Changement {
  return { fiche: { ...fiche, cible: normaliserNiveau(cible) }, retraits: [] }
}

/**
 * Changement de classe (maquette v3, D16) : les capacités appartiennent à
 * l'arbre de l'ANCIENNE classe — elles se vident, et la fenêtre le dit avant
 * que quoi que ce soit ne bouge. Les achats d'héritage restent (à rechoisir),
 * les désavantages interdits à la nouvelle classe sont décochés.
 */
export function changerClasse(fiche: FicheCreation, nouvelleClasse: string): Changement {
  if (fiche.classe === nouvelleClasse) return { fiche, retraits: [] }
  const retraits: string[] = []
  if (nbCapNiveaux(fiche) > 0) {
    retraits.push(`Tes capacités seront à rechoisir : elles sont celles de ton ancienne classe.`)
  }
  if (nbCapChoix(fiche) > 0) retraits.push(`Tes capacités d'héritage seront à rechoisir.`)
  const interdits = desavantagesInterditsPour(nouvelleClasse)
  const decoches = interdits.filter((d) => (fiche.desavOrdre ?? []).includes(d.id))
  for (const desavantage of decoches) {
    retraits.push(`Le désavantage « ${desavantage.nom} » sera décoché (interdit à cette classe).`)
  }
  const idsDecoches = new Set(decoches.map((d) => d.id))
  return {
    fiche: {
      ...fiche,
      classe: nouvelleClasse,
      capNiveaux: {},
      capChoix: { ...CAP_CHOIX_VIDE },
      // D18 : le troc appartient à l'ancienne classe — il part avec elle.
      donNiveaux: {},
      capDons: {},
      desavOrdre: (fiche.desavOrdre ?? []).filter((id) => !idsDecoches.has(id)),
    },
    retraits,
  }
}

/**
 * Changement de faction (maquette v3) : une race ou classe réservée à
 * l'autre faction est retirée ; les langues au choix sont à revoir quand la
 * race part ; les capacités sont à rechoisir quand la classe part.
 */
export function changerFaction(fiche: FicheCreation, nouvelleFaction: string): Changement {
  if (fiche.faction === nouvelleFaction) return { fiche, retraits: [] }
  const retraits: string[] = []
  let suite: FicheCreation = { ...fiche, faction: nouvelleFaction }
  const race = raceDe(fiche.race)
  const raceRetiree =
    race !== undefined && !racesPourFaction(nouvelleFaction).some((r) => r.id === race.id)
  const classe = getRules().classes_squelette.liste.find((c) => c.id === fiche.classe)
  const classeRetiree =
    classe !== undefined && !classesPourFaction(nouvelleFaction).some((c) => c.id === classe.id)
  if (raceRetiree) {
    retraits.push(`Ta race « ${race.nom} » sera retirée (réservée à l'autre faction).`)
    suite = { ...suite, race: undefined, humainChoix: undefined }
    if ((fiche.langChoix ?? []).length > 0) {
      retraits.push(`Tes langues supplémentaires seront à revoir.`)
      suite = { ...suite, langChoix: [] }
    }
  }
  if (classeRetiree) {
    retraits.push(`Ta classe « ${classe.nom} » sera retirée (réservée à l'autre faction).`)
    if (nbCapNiveaux(fiche) > 0) retraits.push(`Tes capacités seront à rechoisir.`)
    if (nbCapChoix(fiche) > 0) retraits.push(`Tes capacités d'héritage seront à rechoisir.`)
    suite = {
      ...suite,
      classe: undefined,
      capNiveaux: {},
      capChoix: { ...CAP_CHOIX_VIDE },
      donNiveaux: {},
      capDons: {},
    }
  }
  return { fiche: suite, retraits }
}
