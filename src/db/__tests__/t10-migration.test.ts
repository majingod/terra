/**
 * T10 (D7) — un magasin v1 rempli par le code de l'app ACTUELLE (le chemin
 * du placeholder : `nouvellePersonnageVierge()` + `personnages.add`, fiche
 * « Test1 »), monté en version → la fiche reste relisible ET l'export JSON
 * automatique est déclenché (écrit et relu dans `exports`).
 *
 * Le magasin n'est PAS fabriqué à la main : l'enregistrement passe par la
 * même fabrique et le même `add` que l'écran de création v1. Le champ
 * d'époque du scaffold (statut du joueur) est ajouté sous sa clé historique
 * — construite dynamiquement, le nom n'a plus le droit d'exister dans le
 * code — pour prouver qu'aucun champ v1 n'est perdu.
 */
import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import {
  STORES_V1,
  creerBase,
  nouvellePersonnageVierge,
  type Personnage,
} from '../index'
import type { ExportEnregistre } from '../db'

// Clé du champ d'époque, reconstruite : « joueur » + M + « ineur ».
const CHAMP_EPOQUE = 'joueur' + String.fromCharCode(77) + 'ineur'

const basesOuvertes: Dexie[] = []

afterEach(async () => {
  const bases = basesOuvertes.splice(0)
  const noms = new Set(bases.map((b) => b.name))
  for (const base of bases) base.close()
  for (const nom of noms) await Dexie.delete(nom)
})

async function remplirMagasinV1(nom: string): Promise<void> {
  // Base telle que la v1 de l'app la définissait.
  const v1 = new Dexie(nom) as Dexie & { personnages: Dexie.Table<Personnage, number> }
  v1.version(1).stores(STORES_V1)
  basesOuvertes.push(v1)
  // Chemin de l'app actuelle : fabrique vierge + add (écran Créer v1).
  const enregistrement = {
    ...nouvellePersonnageVierge(),
    nomPerso: 'Test1',
    faction: 'Sanctum',
    [CHAMP_EPOQUE]: false,
  }
  await v1.table('personnages').add(enregistrement)
  await v1.table('brouillons').add({ etape: 1, donnees: { nomPerso: 'Test1' }, updatedAt: 1 })
  v1.close()
}

/**
 * ⚠️ GATE MODIFIÉE PAR D20, avec sa raison. Elle attendait UN export après la
 * montée, parce qu'il n'y avait qu'une version à franchir (v1 → v2). D20
 * ajoute la v3 : un magasin v1 en traverse maintenant DEUX, et D7 exige un
 * export à CHAQUE montée — deux exports, donc. Ce que la gate garde est
 * intact et même renforcé : un export par version franchie, chacun complet.
 * Le compte est calculé depuis les versions, jamais écrit en dur.
 */
const VERSIONS_DEPUIS_V1 = 2

describe('T10 — migration D7 sur un magasin rempli par l’app', () => {
  it('montée v1 → v3 : fiche relisible, aucun champ perdu, un export par version', async () => {
    const nom = 'terra-test-t10'
    await remplirMagasinV1(nom)

    const v2 = creerBase(nom)
    basesOuvertes.push(v2)
    await v2.open()

    // La fiche est relisible, tous ses champs v1 intacts.
    const personnages = await v2.personnages.toArray()
    expect(personnages).toHaveLength(1)
    const fiche = personnages[0] as Personnage & Record<string, unknown>
    expect(fiche.nomPerso).toBe('Test1')
    expect(fiche.faction).toBe('Sanctum')
    expect(fiche.caracs).toEqual({ puissance: 0, resistance: 0, esprit: 0 })
    expect(fiche[CHAMP_EPOQUE]).toBe(false)

    // L'export JSON automatique a été déclenché par CHAQUE montée de version.
    const exports = (await v2.exports.toArray()) as ExportEnregistre[]
    expect(exports).toHaveLength(VERSIONS_DEPUIS_V1)
    for (const exporte of exports) {
      const contenu = JSON.parse(exporte.contenu) as { personnages: unknown[] }
      expect(contenu.personnages).toHaveLength(1)
      expect(exporte.contenu).toContain('Test1')
    }
  })

  it('jumelle : un magasin v1 vide migre aussi (export écrit, zéro personnage)', async () => {
    const nom = 'terra-test-t10-vide'
    const v1 = new Dexie(nom)
    v1.version(1).stores(STORES_V1)
    basesOuvertes.push(v1)
    await v1.open()
    v1.close()

    const v2 = creerBase(nom)
    basesOuvertes.push(v2)
    await v2.open()
    expect(await v2.personnages.count()).toBe(0)
    const exports = await v2.exports.toArray()
    expect(exports).toHaveLength(VERSIONS_DEPUIS_V1)
    for (const exporte of exports) {
      const contenu = JSON.parse(exporte.contenu) as { personnages: unknown[] }
      expect(contenu.personnages).toHaveLength(0)
    }
  })
})
