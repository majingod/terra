/**
 * Magasin local (D7) — Dexie / IndexedDB.
 *
 * La fiche vit sur l'appareil du joueur, sans sauvegarde serveur : perdre le
 * magasin local = perdre le personnage. D'où le harnais de migration en bas de
 * ce fichier, obligatoire à CHAQUE montée de version.
 *
 * Données volontairement absentes du modèle : aucune date de naissance, aucun
 * âge exact, aucun vrai nom. La seule donnée d'âge est une tranche
 * ('≤11' | '12+'), le minimum qui fait fonctionner la gate D10.
 */
import Dexie, { type EntityTable, type Transaction } from 'dexie'
import type { TrancheAge } from '../rules/age'

/**
 * Contenu complet de la fiche. Sa forme exacte est fixée au brief #02-b ;
 * ici elle n'est pas contrainte, pour ne rien inventer d'avance.
 */
export type DonneesFiche = Record<string, unknown>

export interface PersonnageEnregistre {
  id?: number
  /** Horodatage de création (ms epoch). */
  cree_le: number
  /** Horodatage de dernière modification (ms epoch). */
  modifie_le: number
  /** Version du schéma de `donnees` ayant produit cet enregistrement. */
  schema_version: number
  /** Tranche d'âge — jamais un âge, jamais une date de naissance. */
  tranche_age: TrancheAge
  /** Fiche complète. */
  donnees: DonneesFiche
}

export interface ExportEnregistre {
  id?: number
  /** Horodatage de l'export (ms epoch). */
  date: number
  /** Copie JSON complète, sérialisée. */
  contenu: string
}

export type BaseTerra = Dexie & {
  personnages: EntityTable<PersonnageEnregistre, 'id'>
  exports: EntityTable<ExportEnregistre, 'id'>
}

/** Schéma de la version 1. Les champs non listés sont stockés sans index. */
export const SCHEMA_V1 = {
  personnages: '++id, cree_le, modifie_le, schema_version, tranche_age',
  exports: '++id, date',
} as const

export function ouvrirBase(nom = 'terra'): BaseTerra {
  const base = new Dexie(nom) as BaseTerra
  base.version(1).stores(SCHEMA_V1)
  return base
}

export const db: BaseTerra = ouvrirBase()

// ---------------------------------------------------------------------------
// Harnais de migration D7
// ---------------------------------------------------------------------------

/**
 * Écrit un export JSON complet dans `exports`, PUIS le relit pour prouver
 * qu'il est bien écrit. Lève si la preuve échoue — la migration ne doit alors
 * pas continuer.
 */
export async function ecrireExportPreuve(tx: Transaction): Promise<ExportEnregistre> {
  const personnages = await tx.table<PersonnageEnregistre, number>('personnages').toArray()
  const contenu = JSON.stringify({ date: Date.now(), personnages })
  const table = tx.table<ExportEnregistre, number>('exports')
  const id = await table.add({ date: Date.now(), contenu })

  // Preuve par relecture : l'enregistrement existe, il est intègre, et il
  // contient bien tous les personnages présents avant la migration.
  const relu = await table.get(id)
  if (!relu) {
    throw new Error(`Migration D7 refusée : export ${id} introuvable après écriture.`)
  }
  if (relu.contenu !== contenu) {
    throw new Error(`Migration D7 refusée : export ${id} relu différent de l'écrit.`)
  }
  const decode = JSON.parse(relu.contenu) as { personnages: PersonnageEnregistre[] }
  if (!Array.isArray(decode.personnages) || decode.personnages.length !== personnages.length) {
    throw new Error(
      `Migration D7 refusée : export ${id} incomplet (${decode.personnages?.length} / ${personnages.length} personnages).`,
    )
  }
  return relu
}

/**
 * Applique une migration sous harnais D7 :
 *   (a) un export JSON complet est écrit et PROUVÉ écrit AVANT toute mutation ;
 *   (b) la mutation est additive seulement — elle peut ajouter des champs,
 *       jamais en renommer ni en supprimer ; sinon elle est rejetée et la
 *       transaction de migration échoue.
 *
 * Usage attendu à la prochaine montée de version :
 *   base.version(2).stores({...}).upgrade((tx) => migrationD7(tx, async (t) => { ... }))
 */
export async function migrationD7(
  tx: Transaction,
  mutation: (tx: Transaction) => Promise<void>,
): Promise<ExportEnregistre> {
  const preuve = await ecrireExportPreuve(tx)

  const table = tx.table<PersonnageEnregistre, number>('personnages')
  const avant = new Map<number, Set<string>>()
  for (const personnage of await table.toArray()) {
    avant.set(personnage.id as number, cheminsDeChamps(personnage))
  }

  await mutation(tx)

  for (const personnage of await table.toArray()) {
    const cheminsAvant = avant.get(personnage.id as number)
    if (!cheminsAvant) {
      continue // enregistrement ajouté par la migration : rien à comparer
    }
    const cheminsApres = cheminsDeChamps(personnage)
    const perdus = [...cheminsAvant].filter((chemin) => !cheminsApres.has(chemin))
    if (perdus.length > 0) {
      throw new Error(
        `Migration D7 refusée : migration non additive, champs perdus sur le personnage ${personnage.id} : ${perdus.join(', ')}.`,
      )
    }
  }

  return preuve
}

/** Ensemble des chemins de champs d'un enregistrement (objets imbriqués inclus). */
function cheminsDeChamps(valeur: unknown, prefixe = ''): Set<string> {
  const chemins = new Set<string>()
  if (valeur === null || typeof valeur !== 'object' || Array.isArray(valeur)) {
    return chemins
  }
  for (const [cle, sousValeur] of Object.entries(valeur as Record<string, unknown>)) {
    const chemin = prefixe ? `${prefixe}.${cle}` : cle
    chemins.add(chemin)
    for (const sousChemin of cheminsDeChamps(sousValeur, chemin)) {
      chemins.add(sousChemin)
    }
  }
  return chemins
}
