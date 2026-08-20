/**
 * ⭐ Le garde-fou du lot, prouvé par le contraire : retirer une fiche ne
 * l'efface pas. La fiche vit sur l'appareil du joueur, hors réseau, sans
 * sauvegarde serveur — ce lot doit être incapable d'en perdre une.
 *
 * Ces assertions rougissent si quelqu'un remplace un jour le marquage par un
 * `db.personnages.delete()`.
 */
// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { db, nouvellePersonnageVierge, type Personnage } from '../index'
import { remettreFiche, retirerFiche, separerFiches } from '../retrait'

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

afterEach(async () => {
  await db.personnages.clear()
})

function fiche(nom: string, updatedAt: number): Omit<Personnage, 'id'> {
  return { ...nouvellePersonnageVierge(), nomPerso: nom, niveau: 4, updatedAt }
}

/** `add` rend `number | undefined` (l'id est optionnel sur Personnage). */
async function ajoute(f: Omit<Personnage, 'id'>): Promise<number> {
  return (await db.personnages.add(f)) as number
}

describe('retrait d’une fiche — rien n’est effacé', () => {
  it('⭐ une fiche retirée est TOUJOURS dans db.personnages, seulement marquée', async () => {
    const id = await ajoute(fiche('Kaelen', 1000))

    await retirerFiche(id, 777)

    expect(await db.personnages.count()).toBe(1)
    const relue = await db.personnages.get(id)
    expect(relue, 'la fiche retirée a disparu de la base — un delete a remplacé le marquage').toBeTruthy()
    expect(relue?.nomPerso).toBe('Kaelen')
    expect(relue?.niveau).toBe(4)
    expect(relue?.retireeLe).toBe(777)
  })

  it('le retrait ne touche pas updatedAt : une fiche remise ne remonte pas en tête', async () => {
    const id = await ajoute(fiche('Kaelen', 1000))

    await retirerFiche(id, 999999)
    expect((await db.personnages.get(id))?.updatedAt).toBe(1000)

    await remettreFiche(id)
    expect((await db.personnages.get(id))?.updatedAt).toBe(1000)
  })

  it('remettre efface la marque, et rend la fiche identique à l’originale', async () => {
    const id = await ajoute(fiche('Kaelen', 1000))
    const avant = await db.personnages.get(id)

    await retirerFiche(id, 777)
    await remettreFiche(id)

    const apres = await db.personnages.get(id)
    expect(apres?.retireeLe).toBeUndefined()
    expect(Object.prototype.hasOwnProperty.call(apres, 'retireeLe')).toBe(false)
    expect(apres).toEqual(avant)
  })

  it('separerFiches préserve l’ordre d’entrée dans les deux sous-listes', () => {
    const liste = [
      { ...fiche('Recente', 3000), id: 1 },
      { ...fiche('Intermediaire', 2000), id: 2, retireeLe: 50 },
      { ...fiche('Ancienne', 1000), id: 3 },
    ] as Personnage[]

    const { actives, retirees } = separerFiches(liste)

    expect(actives.map((p) => p.nomPerso)).toEqual(['Recente', 'Ancienne'])
    expect(retirees.map((p) => p.nomPerso)).toEqual(['Intermediaire'])
  })

  it('⭐ aucun db.personnages.delete() dans src/ — pas dans le code, pas « au cas où »', () => {
    const suspects: string[] = []

    const parcours = (repertoire: string) => {
      for (const entree of readdirSync(repertoire)) {
        const chemin = join(repertoire, entree)
        if (statSync(chemin).isDirectory()) {
          parcours(chemin)
          continue
        }
        if (!/\.tsx?$/.test(entree)) continue
        if (chemin === fileURLToPath(import.meta.url)) continue
        // Les commentaires ne sont pas du code : ce module en cite un pour
        // dire qu'il n'en écrit pas.
        const source = readFileSync(chemin, 'utf8')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/.*$/gm, '')
        if (/personnages\s*\.\s*(delete|bulkDelete)\s*\(/.test(source)) suspects.push(chemin)
      }
    }
    parcours(SRC)

    expect(
      suspects,
      `effacement définitif trouvé dans : ${suspects.join(', ')} — ce lot retire, il n'efface pas`,
    ).toEqual([])
  })
})
