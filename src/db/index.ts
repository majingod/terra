/**
 * Base locale de l'app (TerraMortisDB) — Dexie / IndexedDB.
 *
 * v2 (lot t004) : migration ADDITIVE seulement (D7), sous harnais
 * `migrationD7` : un export JSON complet est écrit et PROUVÉ écrit avant
 * toute mutation, à CHAQUE montée de version. Les fiches v1 restent
 * lisibles telles quelles ; le champ d'époque du scaffold sur le statut du
 * joueur reste stocké sur les vieux enregistrements mais le code n'y fait
 * plus référence — la seule donnée d'âge que le code manipule est la
 * tranche ('≤11' | '12+', D10).
 *
 * Les champs du wizard t004 (trancheAge, humainChoix, caracs {p,r,e},
 * extras, dons ×n, capChoix, capNiveaux, …) vivent sous `creation` : les clés
 * `dons` et `caracs` de la v1 portent d'autres types, les fusionner à plat
 * serait un renommage — interdit par D7.
 *
 * D16 : le champ `voie` de `creation` et le champ `sousBranche` de la v1
 * deviennent optionnels — un changement de TYPE seulement. Ni l'un ni l'autre
 * n'est indexé : aucune montée de version Dexie (D7 n'est pas rouvert).
 */
import Dexie, { type EntityTable } from 'dexie'
import type { TrancheAge } from '../rules/age'
import type { FicheCreation } from '../wizard/types'
import { migrationD7, type ExportEnregistre } from './db'

export interface Caracteristiques {
  puissance: number
  resistance: number
  esprit: number
}

export interface Personnage {
  id?: number
  nomPerso: string
  faction: string
  race: string
  classe: string
  /**
   * Champ d'époque (v1, avant D16) : le nom de la voie unique du personnage.
   * Le code ne l'écrit plus et ne l'exige plus — il reste stocké tel quel sur
   * les vieux enregistrements, jamais renommé, jamais effacé (même patron que
   * le champ d'époque du scaffold sur le statut du joueur).
   */
  sousBranche?: string
  caracs: Caracteristiques
  dons: string[]
  competences: string[]
  capacites: string[]
  langues: string[]
  niveau: number
  ressources: Record<string, number>
  createdAt: number
  updatedAt: number
  // --- Champs v2 (additifs, lot t004) ---
  /** Tranche d'âge — jamais une date de naissance, jamais un âge exact. */
  trancheAge?: TrancheAge
  /** Version des règles (meta.version) lue du fichier à la création. */
  reglesVersion?: string
  /** Fiche complète produite par le wizard t004. */
  creation?: FicheCreation
  /**
   * Horodatage (ms) du retrait de la liste principale. Absent = fiche active.
   *
   * Champ **non indexé** : Dexie ne stocke dans `.stores()` que les index, pas
   * la forme des enregistrements. L'ajouter n'exige donc AUCUNE montée de
   * version, et D7 (export obligatoire avant migration) n'est pas rouvert.
   * Le tri et le filtrage se font en mémoire, sur 30 à 50 fiches.
   *
   * Une fiche retirée n'est jamais effacée : elle reste dans `personnages`.
   */
  retireeLe?: number
}

export interface Brouillon {
  id?: number
  etape: number
  donnees: Partial<Personnage> & { fiche?: FicheCreation }
  updatedAt: number
}

export type BaseApp = Dexie & {
  personnages: EntityTable<Personnage, 'id'>
  brouillons: EntityTable<Brouillon, 'id'>
  exports: EntityTable<ExportEnregistre, 'id'>
}

/** Schéma v1 — conservé pour l'historique Dexie et les tests de migration. */
export const STORES_V1 = {
  personnages: '++id, nomPerso, faction, race, classe, niveau, updatedAt',
  brouillons: '++id, updatedAt',
} as const

/** Schéma v2 — additif : mêmes tables + `exports` + index `trancheAge`. */
export const STORES_V2 = {
  personnages: '++id, nomPerso, faction, race, classe, niveau, updatedAt, trancheAge',
  brouillons: '++id, updatedAt',
  exports: '++id, date',
} as const

export function creerBase(nom = 'TerraMortisDB'): BaseApp {
  const base = new Dexie(nom) as BaseApp
  base.version(1).stores(STORES_V1)
  base
    .version(2)
    .stores(STORES_V2)
    .upgrade((tx) =>
      // D7 : export JSON prouvé écrit AVANT toute mutation ; la montée v2
      // n'altère aucun enregistrement (les nouveaux champs sont optionnels).
      migrationD7(tx, async () => {}),
    )
  return base
}

export const db: BaseApp = creerBase()

export function nouvellePersonnageVierge(): Omit<Personnage, 'id'> {
  const now = Date.now()
  return {
    nomPerso: '',
    faction: '',
    race: '',
    classe: '',
    caracs: { puissance: 0, resistance: 0, esprit: 0 },
    dons: [],
    competences: [],
    capacites: [],
    langues: [],
    niveau: 1,
    ressources: {},
    createdAt: now,
    updatedAt: now,
  }
}
