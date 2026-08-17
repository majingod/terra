/**
 * GATE_FIDELITE_SPEC_v2 §Tests (h) — harnais de migration D7.
 *
 * Sur un magasin CONTENANT un personnage, on prouve que l'export JSON complet
 * est écrit — et relu — AVANT que la migration ne touche quoi que ce soit.
 */
import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import {
  SCHEMA_V1,
  migrationD7,
  type ExportEnregistre,
  type PersonnageEnregistre,
} from '../db'

const basesOuvertes: Dexie[] = []

afterEach(async () => {
  const bases = basesOuvertes.splice(0)
  for (const base of bases) {
    base.close()
  }
  for (const nom of new Set(bases.map((base) => base.name))) {
    await Dexie.delete(nom)
  }
})

function nouvelleBaseV1(nom: string): Dexie {
  const base = new Dexie(nom)
  base.version(1).stores(SCHEMA_V1)
  basesOuvertes.push(base)
  return base
}

const PERSONNAGE: Omit<PersonnageEnregistre, 'id'> = {
  cree_le: 1_700_000_000_000,
  modifie_le: 1_700_000_000_000,
  schema_version: 1,
  tranche_age: '12+',
  donnees: { fiche: 'contenu du brief #02-b', marqueur: 'avant-migration' },
}

describe('Harnais de migration D7', () => {
  it("écrit et prouve l'export AVANT la migration, sur un magasin contenant un personnage", async () => {
    const nom = 'terra-test-migration-additive'
    await Dexie.delete(nom)

    // Magasin v1 contenant un personnage.
    const v1 = nouvelleBaseV1(nom)
    await v1.open()
    await v1.table<PersonnageEnregistre, number>('personnages').add({ ...PERSONNAGE })
    expect(await v1.table('personnages').count()).toBe(1)
    v1.close()

    // Ce que la mutation observe au moment où elle démarre.
    let exportsVusParLaMutation: ExportEnregistre[] = []
    let personnagesVusParLaMutation: PersonnageEnregistre[] = []

    const v2 = new Dexie(nom)
    basesOuvertes.push(v2)
    v2.version(1).stores(SCHEMA_V1)
    v2
      .version(2)
      .stores(SCHEMA_V1)
      .upgrade((tx) =>
        migrationD7(tx, async (transaction) => {
          exportsVusParLaMutation = await transaction
            .table<ExportEnregistre, number>('exports')
            .toArray()
          personnagesVusParLaMutation = await transaction
            .table<PersonnageEnregistre, number>('personnages')
            .toArray()
          // Migration additive : on AJOUTE un champ, on ne renomme rien.
          await transaction
            .table<PersonnageEnregistre, number>('personnages')
            .toCollection()
            .modify((personnage) => {
              personnage.schema_version = 2
              personnage.donnees = { ...personnage.donnees, champ_ajoute_v2: true }
            })
        }),
      )
    await v2.open()

    // (1) L'export existait DÉJÀ quand la mutation a commencé.
    expect(exportsVusParLaMutation).toHaveLength(1)

    // (2) Son contenu est l'état d'AVANT : le champ ajouté par la migration
    //     n'y figure pas, et le marqueur d'origine y figure.
    const contenu = JSON.parse(exportsVusParLaMutation[0].contenu) as {
      personnages: PersonnageEnregistre[]
    }
    expect(contenu.personnages).toHaveLength(1)
    expect(contenu.personnages[0].schema_version).toBe(1)
    expect(contenu.personnages[0].donnees).toEqual(PERSONNAGE.donnees)
    expect(contenu.personnages[0].donnees).not.toHaveProperty('champ_ajoute_v2')

    // (3) Le personnage n'avait pas encore été touché quand la mutation a lu.
    expect(personnagesVusParLaMutation[0].schema_version).toBe(1)

    // (4) L'export est bien PERSISTÉ après la migration (relecture hors upgrade).
    const exportsApres = await v2.table<ExportEnregistre, number>('exports').toArray()
    expect(exportsApres).toHaveLength(1)
    expect(exportsApres[0].contenu).toBe(exportsVusParLaMutation[0].contenu)

    // (5) Et la migration a bien eu lieu.
    const apres = await v2.table<PersonnageEnregistre, number>('personnages').toArray()
    expect(apres[0].schema_version).toBe(2)
    expect(apres[0].donnees).toHaveProperty('champ_ajoute_v2', true)
    expect(apres[0].donnees).toHaveProperty('marqueur', 'avant-migration')
  })

  it('refuse une migration non additive (champ supprimé)', async () => {
    const nom = 'terra-test-migration-non-additive'
    await Dexie.delete(nom)

    const v1 = nouvelleBaseV1(nom)
    await v1.open()
    await v1.table<PersonnageEnregistre, number>('personnages').add({ ...PERSONNAGE })
    v1.close()

    const v2 = new Dexie(nom)
    basesOuvertes.push(v2)
    v2.version(1).stores(SCHEMA_V1)
    v2
      .version(2)
      .stores(SCHEMA_V1)
      .upgrade((tx) =>
        migrationD7(tx, async (transaction) => {
          await transaction
            .table<PersonnageEnregistre, number>('personnages')
            .toCollection()
            .modify((personnage) => {
              // Renommage/suppression : interdit par (b).
              personnage.donnees = { fiche: personnage.donnees.fiche }
            })
        }),
      )

    await expect(v2.open()).rejects.toThrow(/non additive/)
  })

  it("l'export de preuve contient tous les personnages du magasin", async () => {
    const nom = 'terra-test-migration-export-complet'
    await Dexie.delete(nom)

    const v1 = nouvelleBaseV1(nom)
    await v1.open()
    await v1.table<PersonnageEnregistre, number>('personnages').bulkAdd([
      { ...PERSONNAGE, tranche_age: '≤11' },
      { ...PERSONNAGE, tranche_age: '12+' },
      { ...PERSONNAGE, tranche_age: '12+' },
    ])
    v1.close()

    const v2 = new Dexie(nom)
    basesOuvertes.push(v2)
    v2.version(1).stores(SCHEMA_V1)
    v2
      .version(2)
      .stores(SCHEMA_V1)
      .upgrade((tx) => migrationD7(tx, async () => undefined))
    await v2.open()

    const exports = await v2.table<ExportEnregistre, number>('exports').toArray()
    expect(exports).toHaveLength(1)
    const contenu = JSON.parse(exports[0].contenu) as { personnages: PersonnageEnregistre[] }
    expect(contenu.personnages).toHaveLength(3)
    expect(contenu.personnages.map((p) => p.tranche_age)).toEqual(['≤11', '12+', '12+'])
  })
})
