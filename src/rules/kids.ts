/**
 * Chargement du corpus ENFANT (≤11 ans) — src/data/rules_kids.json.
 *
 * Autorité distincte : la planche de cartes, pas le Tome. Ce module ne lit
 * JAMAIS rules.json et rules.json n'est jamais lu par le flux enfant : les
 * deux corpus ne se mélangent pas. Comme pour `load.ts`, aucun nom ni aucun
 * chiffre de règle n'est recopié ici — seule la FORME du fichier est décrite,
 * et l'affectation de conformité en bas fait vérifier cette forme par tsc.
 */
import rulesKidsJson from '../data/rules_kids.json'

export interface MetaKids {
  fichier: string
  version: string
  date: string
  tranche: string
  autorite: string
  transcription: string
  structure: string
  regle_maison_source: string
  textes_faction_source: string
}

/** Un texte de la planche : verbatim intact, correction d'affichage validée. */
export interface CapaciteEnfant {
  id: string
  niveau: number
  /** Nom tel qu'écrit sur la planche. */
  nom: string
  /** Nom corrigé à l'affichage, quand la planche en porte une coquille. */
  nom_affichage?: string
  verbatim: string
  affichage?: string
}

export interface ClasseEnfant {
  id: string
  nom: string
  lutte: number
  capacites: CapaciteEnfant[]
}

export interface FactionEnfant {
  id: string
  nom: string
  affichage: string
}

/** Ce qu'un échelon ajoute : une capacité, de la Lutte, ou des Dégâts. */
export interface LigneEvolutionEnfant {
  niv: number
  capacite?: boolean
  lutte?: number
  degats?: number
}

export interface RulesKids {
  meta: MetaKids
  stats_communes: {
    pv: number
    degats: number
    race: { nom: string; note: string }
  }
  evolution: {
    regle: string
    table: LigneEvolutionEnfant[]
  }
  regle_maison: { nom: string; affichage: string }
  factions: { regle_choix: string; liste: FactionEnfant[] }
  classes: { liste: ClasseEnfant[] }
}

/** Conformité vérifiée à la compilation (comme pour rules.json). */
const rulesKids: RulesKids = rulesKidsJson

export function getRulesKids(): RulesKids {
  return rulesKids
}

/** Version du corpus enfant, lue du fichier — jamais une constante recopiée. */
export function getVersionKids(): string {
  return getRulesKids().meta.version
}

// ---------------------------------------------------------------------------
// Classes et factions
// ---------------------------------------------------------------------------

export function classesEnfant(): ClasseEnfant[] {
  return getRulesKids().classes.liste
}

export function classeEnfant(classeId?: string): ClasseEnfant | undefined {
  return classesEnfant().find((classe) => classe.id === classeId)
}

/** Choix libre : la faction ne filtre aucune classe (arbitrage Fred). */
export function factionsEnfant(): FactionEnfant[] {
  return getRulesKids().factions.liste
}

export function factionEnfant(factionId?: string): FactionEnfant | undefined {
  return factionsEnfant().find((faction) => faction.id === factionId)
}

/** La race de la planche enfant : fixe, sans bonus. */
export function raceEnfant(): { nom: string; note: string } {
  return getRulesKids().stats_communes.race
}

export function regleMaisonEnfant(): { nom: string; affichage: string } {
  return getRulesKids().regle_maison
}

// ---------------------------------------------------------------------------
// Niveaux — les bornes viennent de la table, jamais du code
// ---------------------------------------------------------------------------

/** La table d'évolution enfant, triée par échelon croissant. */
export function tableEvolutionEnfant(): LigneEvolutionEnfant[] {
  return [...getRulesKids().evolution.table].sort((a, b) => a.niv - b.niv)
}

export function niveauxPossiblesEnfant(): number[] {
  return tableEvolutionEnfant().map((ligne) => ligne.niv)
}

export function niveauMinEnfant(): number {
  const niveaux = niveauxPossiblesEnfant()
  if (niveaux.length === 0) {
    throw new Error("rules_kids.json : table d'évolution vide.")
  }
  return niveaux[0]
}

export function niveauMaxEnfant(): number {
  const niveaux = niveauxPossiblesEnfant()
  return niveaux[niveaux.length - 1]
}

/** Ramène un niveau dans les bornes de la table ; défaut = niveau min. */
export function normaliserNiveauEnfant(niveau?: number): number {
  if (niveau === undefined || !Number.isFinite(niveau)) return niveauMinEnfant()
  return Math.min(niveauMaxEnfant(), Math.max(niveauMinEnfant(), Math.trunc(niveau)))
}

/** Les échelons 1..N, dans l'ordre — ce que le niveau a déjà apporté. */
export function echelonsAcquisEnfant(niveau?: number): LigneEvolutionEnfant[] {
  const plafond = normaliserNiveauEnfant(niveau)
  return tableEvolutionEnfant().filter((ligne) => ligne.niv <= plafond)
}

/**
 * Capacités que la classe donne d'office à ce niveau : tous les échelons ≤ N.
 * Vide sans classe choisie. Aucune capacité ne se choisit chez les enfants —
 * elles viennent avec la classe et le niveau.
 */
export function capacitesEnfantAcquises(classeId?: string, niveau?: number): CapaciteEnfant[] {
  const classe = classeEnfant(classeId)
  if (!classe) return []
  const plafond = normaliserNiveauEnfant(niveau)
  return classe.capacites
    .filter((capacite) => capacite.niveau <= plafond)
    .sort((a, b) => a.niveau - b.niveau)
}

export interface StatsEnfant {
  pv: number
  degats: number
  lutte: number
}

/**
 * PV, Dégâts et Lutte au niveau demandé : les bases communes de la planche,
 * la Lutte de la classe, plus ce que les échelons 1..N ajoutent.
 */
export function statsEnfant(classeId?: string, niveau?: number): StatsEnfant | undefined {
  const classe = classeEnfant(classeId)
  if (!classe) return undefined
  const communes = getRulesKids().stats_communes
  const echelons = echelonsAcquisEnfant(niveau)
  const somme = (champ: (ligne: LigneEvolutionEnfant) => number) =>
    echelons.reduce((total, ligne) => total + champ(ligne), 0)
  return {
    pv: communes.pv,
    degats: communes.degats + somme((ligne) => ligne.degats ?? 0),
    lutte: classe.lutte + somme((ligne) => ligne.lutte ?? 0),
  }
}
