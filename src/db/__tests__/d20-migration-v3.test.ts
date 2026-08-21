/**
 * D20 ⑥⑥ — la montée de version Dexie de ce lot, sous harnais D7.
 *
 * Trois exigences, et rien d'autre inventé autour :
 *   - la montée est ADDITIVE : aucun index retiré (le diff du schéma est au
 *     rapport — il est vide, et c'est le point) ;
 *   - l'export automatique est DÉCLENCHÉ à la montée, et prouvé écrit ;
 *   - le test tourne sur un magasin RÉELLEMENT REMPLI de plusieurs fiches,
 *     jamais sur un magasin vide : un export vide ne prouve rien.
 *
 * ⛔ La montée n'écrit RIEN sur les fiches existantes. On ne fabrique pas
 * l'historique qu'elles n'ont pas : c'est son absence qui dira au joueur que
 * sa fiche vient d'une version précédente.
 */
import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import {
  STORES_V1,
  STORES_V2,
  STORES_V3,
  creerBase,
  nouvellePersonnageVierge,
  type BaseApp,
  type Personnage,
} from '../index'

/** Les index d'un schéma, table par table — la forme comparable d'un `.stores()`. */
function indexParTable(stores: Record<string, string>): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(stores).map(([table, decl]) => [
      table,
      decl.split(',').map((champ) => champ.trim()),
    ]),
  )
}

/** Plusieurs fiches d'avant, écrites dans un magasin en version 2. */
async function magasinRempli(nom: string): Promise<string[]> {
  const ancienne = new Dexie(nom)
  ancienne.version(1).stores(STORES_V1)
  ancienne.version(2).stores(STORES_V2)
  await ancienne.open()
  const noms = ['Bob', 'Alice', 'Carl', 'Dora']
  await ancienne.table<Personnage>('personnages').bulkAdd(
    noms.map((nomPerso, index) => ({
      ...nouvellePersonnageVierge(),
      nomPerso,
      niveau: index + 1,
      // D20 : ces fiches n'ont pas d'historique — ce sont des fiches d'avant.
      creation: { classe: 'druide', capNiveaux: {} },
    })),
  )
  ancienne.close()
  return noms
}

const bases: BaseApp[] = []

afterEach(async () => {
  for (const base of bases.splice(0)) {
    base.close()
    await base.delete()
  }
})

describe('D20 ⑥ — montée de version Dexie, additive et sous harnais D7', () => {
  it('aucun index retiré : le schéma v3 contient tout le schéma v2', () => {
    const v2 = indexParTable(STORES_V2)
    const v3 = indexParTable(STORES_V3)
    for (const [table, champs] of Object.entries(v2)) {
      expect(v3[table], `table disparue en v3 : ${table}`).toBeDefined()
      for (const champ of champs) {
        expect(v3[table], `index retiré en v3 : ${table}.${champ}`).toContain(champ)
      }
    }
  })

  it('l’export automatique part à la montée, sur un magasin RÉELLEMENT rempli', async () => {
    const nom = 'TerraMigrationD20'
    const noms = await magasinRempli(nom)

    const base = creerBase(nom)
    bases.push(base)
    await base.open()
    expect(base.verno).toBe(3)

    // L'export automatique de la montée : écrit, et complet.
    const exports = await base.exports.toArray()
    expect(exports.length, 'aucun export écrit à la montée').toBeGreaterThan(0)
    const dernier = exports[exports.length - 1]
    const contenu = JSON.parse(dernier.contenu) as { personnages: Personnage[] }
    expect(contenu.personnages.map((p) => p.nomPerso).sort()).toEqual([...noms].sort())

    // ⛔ Et les fiches elles-mêmes n'ont pas bougé d'un champ.
    const apres = await base.personnages.toArray()
    expect(apres.map((p) => p.nomPerso).sort()).toEqual([...noms].sort())
    for (const fiche of apres) {
      expect(fiche.creation?.historique, 'la montée ne fabrique aucun historique').toBeUndefined()
    }
  })

  it('jumelle : le magasin rempli garde ses fiches lisibles après la montée', async () => {
    const nom = 'TerraMigrationD20bis'
    const noms = await magasinRempli(nom)
    const base = creerBase(nom)
    bases.push(base)
    await base.open()
    for (const [index, nomPerso] of noms.entries()) {
      const fiche = await base.personnages.where('nomPerso').equals(nomPerso).first()
      expect(fiche, `fiche perdue : ${nomPerso}`).toBeTruthy()
      expect(fiche!.niveau).toBe(index + 1)
    }
  })
})
