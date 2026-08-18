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

export interface FicheCreation {
  trancheAge?: TrancheAge
  faction?: string
  race?: string
  /** Bonus au choix de l'Humain (libellé lu du fichier). */
  humainChoix?: string
  classe?: string
  voie?: string
  caracs?: CaracsChoisies
  extras?: ExtrasCaracs
  /** Dons pris : id -> nombre de prises (cumulables ×n). */
  dons?: Record<string, number>
  comps?: string[]
  langChoix?: string[]
  /** Désavantages cochés, DANS L'ORDRE de cochage (A6). */
  desavOrdre?: string[]
  /** Race refusée par le désavantage à variante (Raciste, sous-choix). */
  racisteVar?: string
  /** XP permanent du joueur (GN auxquels il a participé). */
  xpPerm?: number
  /** Achats d'héritage : libellé du fichier -> nombre d'achats. */
  achats?: Record<string, number>
  /** Capacités choisies via « +1 Capacité de niveau N » : niveau -> ids. */
  capChoix?: Record<string, string[]>
  nom?: string
  histoire?: string
  reglesVersion?: string
}

export const FICHE_VIDE: FicheCreation = {}
