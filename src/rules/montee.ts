/**
 * D17 — ce qu'une montée de niveau APPORTE, lu des tables d'évolution.
 *
 * Le GN existe depuis deux ans : un personnage gagne un niveau ENTRE deux GN,
 * après une quête réussie. Ce module ne sait rien de l'écran ; il répond à
 * deux questions, et seulement à celles-là :
 *   - « ce personnage peut-il monter ? » (le plafond est le dernier échelon
 *     de sa table, pas un 5 écrit ici) ;
 *   - « qu'est-ce que l'échelon atteint ajoute ? » (la LIGNE de la table de
 *     cet échelon, jamais un rythme recopié).
 *
 * D5 : aucun chiffre de règle ici. Les deux corpus restent séparés — le 12+
 * lit `evolution.table` de rules.json, le ≤11 celle de rules_kids.json, et
 * jamais l'un pour l'autre.
 *
 * D16 : la capacité d'un niveau n'est PAS dans la table du Tome — c'est la
 * règle arbitrée « 1 capacité par niveau, de niveau ≤ l'échelon atteint »,
 * qui vit dans src/rules/capacites.ts. La montée la porte donc toujours,
 * comme chaque échelon de la création.
 */
import type { LigneEvolution } from './load'
import {
  niveauMaxEnfant,
  normaliserNiveauEnfant,
  tableEvolutionEnfant,
  type LigneEvolutionEnfant,
} from './kids'
import { niveauMax, normaliserNiveau, tableEvolution } from './niveau'

/**
 * Le niveau que ce personnage atteindrait en montant — `undefined` quand sa
 * table s'arrête là (D12 : au-delà, « vois ton MJ »).
 */
export function niveauAtteignable(niveau?: number): number | undefined {
  const actuel = normaliserNiveau(niveau)
  return actuel < niveauMax() ? actuel + 1 : undefined
}

/** La même question, sur la table de la planche enfant. */
export function niveauAtteignableEnfant(niveau?: number): number | undefined {
  const actuel = normaliserNiveauEnfant(niveau)
  return actuel < niveauMaxEnfant() ? actuel + 1 : undefined
}

/** Ce que l'échelon atteint AJOUTE, lu de sa ligne de table (12+). */
export interface GainsMontee {
  /** Le niveau atteint. */
  niveau: number
  /** Points de caractéristique à placer (0 quand l'échelon n'en donne pas). */
  caracPoints: number
  /** Dons à choisir. */
  dons: number
  /** Compétences que l'échelon ajoute (aucune, aux échelons de montée). */
  competences: number
}

function ligneDeLaTable(niveauAtteint: number): LigneEvolution {
  const ligne = tableEvolution().find((l) => l.niv === niveauAtteint)
  if (!ligne) {
    throw new Error(`rules.json : aucun échelon ${niveauAtteint} dans la table d'évolution.`)
  }
  return ligne
}

/**
 * Les gains de l'échelon atteint. La capacité n'y figure pas : elle est
 * TOUJOURS due (D16), et son bassin se demande à `capacitesDisponibles`.
 */
export function gainsMontee(niveauAtteint: number): GainsMontee {
  const ligne = ligneDeLaTable(niveauAtteint)
  return {
    niveau: ligne.niv,
    caracPoints: ligne.carac_points ?? 0,
    dons: ligne.dons ?? 0,
    competences: ligne.competence ?? 0,
  }
}

/** Ce que l'échelon atteint AJOUTE sur la planche enfant. */
export interface GainsMonteeEnfant {
  niveau: number
  /** L'échelon donne la capacité de la classe à ce niveau. */
  capacite: boolean
  lutte: number
  degats: number
}

function ligneDeLaTableEnfant(niveauAtteint: number): LigneEvolutionEnfant {
  const ligne = tableEvolutionEnfant().find((l) => l.niv === niveauAtteint)
  if (!ligne) {
    throw new Error(
      `rules_kids.json : aucun échelon ${niveauAtteint} dans la table d'évolution.`,
    )
  }
  return ligne
}

export function gainsMonteeEnfant(niveauAtteint: number): GainsMonteeEnfant {
  const ligne = ligneDeLaTableEnfant(niveauAtteint)
  return {
    niveau: ligne.niv,
    capacite: ligne.capacite === true,
    lutte: ligne.lutte ?? 0,
    degats: ligne.degats ?? 0,
  }
}
