/**
 * Forme de la fiche en cours de création (état du wizard).
 * Champs nouveaux du schéma v2 (migration additive D7) — voir src/db/index.ts.
 */
import type { TrancheAge } from '../rules/age'

export interface CaracsChoisies {
  p?: number
  r?: number
  e?: number
}

export interface ExtrasCaracs {
  p: number
  r: number
  e: number
}

/**
 * Choix du flux ≤11 (planche enfant, corpus rules_kids.json). Vit sous
 * `FicheCreation.enfant` : la tranche d'âge reste le champ partagé qui
 * décide du flux, et le corpus 12+ n'est jamais mélangé au corpus enfant.
 */
export interface FicheEnfant {
  faction?: string
  classe?: string
  /** Niveau de départ (1-5 de la table enfant) — défaut : niveau min. */
  niveau?: number
  /** Nom du PERSONNAGE — jamais le vrai nom du joueur. */
  nom?: string
}

export interface FicheCreation {
  trancheAge?: TrancheAge
  faction?: string
  race?: string
  /** Bonus au choix de l'Humain (libellé lu du fichier). */
  humainChoix?: string
  classe?: string
  /**
   * Champ d'époque (avant D16) : la voie choisie à la création. Le code ne
   * l'exige plus et ne l'écrit plus — il reste lu tel quel sur les fiches et
   * les brouillons qui le portent, jamais renommé, jamais effacé.
   */
  voie?: string
  /** Niveau de départ du personnage (D12) — défaut : niveau min de la table. */
  niveau?: number
  caracs?: CaracsChoisies
  extras?: ExtrasCaracs
  /** Dons pris : id -> nombre de prises (cumulables ×n). */
  dons?: Record<string, number>
  comps?: string[]
  langChoix?: string[]
  /** Désavantages cochés, DANS L'ORDRE de cochage (A6). */
  desavOrdre?: string[]
  /** Sous-choix du désavantage à variante (Raciste) : 'autre' | 'faction'. */
  racisteVar?: 'autre' | 'faction'
  /** XP permanent du joueur (GN auxquels il a participé). */
  xpPerm?: number
  /** Achats d'héritage : libellé du fichier -> nombre d'achats. */
  achats?: Record<string, number>
  /** Capacités choisies via « +1 Capacité de niveau N » : niveau -> ids. */
  capChoix?: Record<string, string[]>
  /**
   * D16 : la capacité choisie à CHAQUE niveau du personnage — niveau (clé
   * texte, comme capChoix) -> id de la capacité. L'emplacement du niveau k
   * n'accepte qu'une capacité de niveau ≤ k, jamais deux fois la même.
   */
  capNiveaux?: Record<string, string>
  nom?: string
  histoire?: string
  reglesVersion?: string
  /** Choix du flux ≤11 — présent seulement sur une fiche enfant. */
  enfant?: FicheEnfant
}

export const FICHE_VIDE: FicheCreation = {}
