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

/** Les trois clés de caractéristique, dans l'ordre de la répartition. */
export type CleCarac = 'p' | 'r' | 'e'

/**
 * D20 — une acquisition DATÉE : le personnage a atteint ce niveau, ce jour-là,
 * et l'échelon lui a donné ces points de caractéristique.
 *
 * La première entrée est celle de la création (niveau 1) ; chaque montée en
 * ajoute une. Le niveau du personnage se lit de leur nombre, jamais d'un
 * champ saisi — voir src/wizard/historique.ts.
 *
 * Ce qu'un échelon donne d'AUTRE (capacité, don) vit déjà dans `capNiveaux`,
 * `donNiveaux` et `capDons`, rangé par échelon : rien n'y est dupliqué ici.
 */
export interface EntreeNiveau {
  /** Le niveau atteint par cette entrée. */
  niveau: number
  /** Horodatage de l'acquisition (ms epoch). */
  le: number
  /**
   * Points de caractéristique que CET échelon a donnés, par clé de carac.
   * Absent quand l'échelon n'en donne aucun (c'est le cas du niveau 1).
   */
  caracs?: Partial<Record<CleCarac, number>>
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
  /**
   * Champ d'époque (avant D20) : le niveau de départ SAISI à la création. Le
   * code ne l'écrit plus et ne le lit plus pour connaître le niveau — celui-ci
   * se dérive de `historique` (montées + 1). Il reste stocké tel quel sur les
   * fiches d'avant, jamais renommé, jamais effacé (même patron que `voie`),
   * et il n'est lu que comme valeur ARCHIVÉE d'une fiche gelée en lecture
   * seule (src/wizard/historique.ts).
   */
  niveau?: number
  /**
   * D20 — l'historique daté : une entrée par échelon traversé, la création
   * comprise. Son absence est LE critère d'une fiche d'ancienne version.
   */
  historique?: EntreeNiveau[]
  /**
   * D20 — le niveau que le joueur DIT jouer à l'étape « Ton niveau ». Ce
   * n'est pas son niveau : c'est là où le train de montées le mène après la
   * création, qui, elle, se fait toujours au niveau 1.
   */
  cible?: number
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
  /**
   * D18 (troc du guerrier) : le DON pris à la place de la capacité du niveau
   * k — niveau (clé texte, comme capNiveaux) -> id du don. Un emplacement
   * porte l'un ou l'autre, jamais les deux : c'est le même emplacement, avec
   * un autre contenu. La provenance reste donc lisible dans les données
   * stockées — un don rangé ici vient d'un emplacement de capacité.
   */
  donNiveaux?: Record<string, string>
  /**
   * D18 (troc du mage) : la CAPACITÉ prise à la place du don que la table
   * d'évolution donne à l'échelon N — échelon (clé texte) -> id de la
   * capacité, de niveau ≤ N. Une capacité rangée ici vient d'un emplacement
   * de don.
   */
  capDons?: Record<string, string>
  nom?: string
  histoire?: string
  reglesVersion?: string
  /** Choix du flux ≤11 — présent seulement sur une fiche enfant. */
  enfant?: FicheEnfant
}

export const FICHE_VIDE: FicheCreation = {}
