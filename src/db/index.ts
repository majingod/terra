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
 *
 * v3 (D20) : l'historique daté entre dans `creation`. Aucun index n'est ajouté
 * ni retiré — le diff du schéma est VIDE, et c'est voulu : l'historique vit
 * sous `creation`, qui n'est pas indexé. La montée de version, elle, n'est pas
 * cosmétique : à partir de cette version, l'ABSENCE de ce champ a un sens
 * neuf — la fiche vient d'une version précédente, et l'app lui propose de la
 * supprimer. D7 exige alors ce qu'il exige à chaque montée, et pour la même
 * raison : un export JSON complet écrit et PROUVÉ écrit AVANT que le nouveau
 * code ne touche à quoi que ce soit. C'est le filet du joueur.
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
   * D25 — le VRAI nom du joueur, la seule donnée nominative de l'app.
   *
   * Toujours optionnel : jamais exigé, jamais pré-rempli. Absent, tout reste
   * comme avant lui — la case « Nom du joueur » de la feuille s'imprime vide,
   * à remplir au crayon. Présent, il vit sur l'appareil, s'affiche sur la
   * fiche, s'imprime dans sa case et part dans l'export JSON. ⛔ Jamais en
   * ligne, jamais dans le dépôt.
   *
   * Une chaîne vide ne se stocke pas : c'est la clé qui est absente
   * (`wizard/nomDuJoueur`). Champ **non indexé** — Dexie ne range dans
   * `.stores()` que les index, pas la forme des enregistrements : son arrivée
   * n'exige aucune montée de version, D7 n'est pas rouvert par ce lot.
   */
  nomDuJoueur?: string
  /**
   * Héritage pré-D23 : l'horodatage (ms) du retrait dans l'ancienne corbeille.
   *
   * D23 a fait disparaître la corbeille, et D26 son contenu : plus rien n'écrit
   * ce champ, et toute fiche qui le porte est balayée au chargement de
   * l'accueil (`db/suppression`), qui retire la clé et remet la fiche dans la
   * liste. Le champ RESTE déclaré — le balayage doit pouvoir le lire, et une
   * fiche jamais rouverte depuis peut encore le porter en base.
   *
   * Champ **non indexé** : Dexie ne stocke dans `.stores()` que les index, pas
   * la forme des enregistrements. Ni son arrivée ni son abandon n'exigent de
   * montée de version — D7 (export obligatoire avant migration) n'est pas
   * rouvert par ce lot.
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

/**
 * Schéma v3 (D20) — ADDITIF au sens strict : aucun index ajouté, aucun index
 * retiré. Le champ neuf (`creation.historique`) n'est pas indexé, donc le
 * schéma ne bouge pas ; ce qui bouge est la LECTURE qu'on fait des données,
 * et c'est ce qui justifie l'export obligatoire de la montée.
 */
export const STORES_V3 = { ...STORES_V2 } as const

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
  base
    .version(3)
    .stores(STORES_V3)
    .upgrade((tx) =>
      // D7 : même harnais, même exigence. La montée v3 n'écrit RIEN sur les
      // fiches existantes — ⛔ on ne fabrique pas l'historique qu'elles n'ont
      // pas : c'est précisément son absence qui dira au joueur que sa fiche
      // vient d'une version précédente. L'export, lui, part avant tout.
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
