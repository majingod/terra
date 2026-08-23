/**
 * ⭐ Le garde-fou du lot, retourné : depuis D23 l'effacement EXISTE, et c'est
 * précisément pour ça qu'il doit être tenu court.
 *
 * L'ancienne gate (`retrait.test.ts`) interdisait tout `db.personnages.delete()`
 * dans `src/`. D23 lève cette interdiction en connaissance de cause — une
 * corbeille qui n'efface rien a fait croire à l'organisateur qu'il avait
 * supprimé des fiches encore présentes. La garde n'est donc pas retirée, elle
 * est DÉPLACÉE : l'effacement vit dans UN seul module, et un `delete()` qui
 * apparaîtrait ailleurs — « au cas où », au démarrage, au chargement d'une
 * liste — rougit toujours.
 *
 * L'autre moitié du contrat est ici aussi : le balayage D26 remet en liste et
 * n'efface RIEN. Une fiche vit sur l'appareil du joueur, hors réseau, sans
 * sauvegarde serveur.
 */
// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { db, nouvellePersonnageVierge, type Personnage } from '../index'
import { balayerFichesRetirees, supprimerFicheDefinitivement } from '../suppression'

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

afterEach(async () => {
  await db.personnages.clear()
})

function fiche(nom: string, updatedAt: number, retireeLe?: number): Omit<Personnage, 'id'> {
  const base = { ...nouvellePersonnageVierge(), nomPerso: nom, niveau: 4, updatedAt }
  return retireeLe === undefined ? base : { ...base, retireeLe }
}

async function ajoute(f: Omit<Personnage, 'id'>): Promise<number> {
  return (await db.personnages.add(f)) as number
}

describe('D23 — l’effacement est réel, et tenu à un seul endroit', () => {
  it('⭐ supprimerFicheDefinitivement retire VRAIMENT la fiche du magasin', async () => {
    const id = await ajoute(fiche('Kaelen', 1000))
    const autre = await ajoute(fiche('Sarielle', 2000))

    await supprimerFicheDefinitivement(id)

    expect(
      await db.personnages.get(id),
      'la fiche est encore là — l’app ferait à nouveau croire à une suppression',
    ).toBeUndefined()
    expect(await db.personnages.count()).toBe(1)
    // ⛔ Une suppression n'emporte jamais la fiche d'à côté.
    expect((await db.personnages.get(autre))?.nomPerso).toBe('Sarielle')
  })

  /**
   * Les deux seuls chemins d'effacement de l'app, tous deux à deux gestes :
   * l'accueil (D23) et la fiche d'ancienne version (D20 ③). Tous deux passent
   * par `db/suppression`.
   */
  const EFFACEMENT_AUTORISE = ['src/db/suppression.ts']

  it('⭐ un seul db.personnages.delete() dans src/ — celui que D23 nomme', () => {
    const suspects: string[] = []
    const autorises: string[] = []

    const parcours = (repertoire: string) => {
      for (const entree of readdirSync(repertoire)) {
        const chemin = join(repertoire, entree)
        if (statSync(chemin).isDirectory()) {
          parcours(chemin)
          continue
        }
        if (!/\.tsx?$/.test(entree)) continue
        if (chemin === fileURLToPath(import.meta.url)) continue
        // Les commentaires ne sont pas du code : plusieurs modules citent
        // l'effacement pour dire où il vit.
        const source = readFileSync(chemin, 'utf8')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/.*$/gm, '')
        if (!/personnages\s*\.\s*(delete|bulkDelete)\s*\(/.test(source)) continue
        const relatif = relative(join(SRC, '..'), chemin)
        if (EFFACEMENT_AUTORISE.includes(relatif)) autorises.push(relatif)
        else suspects.push(relatif)
      }
    }
    parcours(SRC)

    expect(
      suspects,
      `effacement définitif hors du seul module autorisé : ${suspects.join(', ')} — D23 le tient à un seul endroit`,
    ).toEqual([])
    // Jumelle : l'endroit autorisé existe bien — la gate garderait le vide
    // sinon, et ne dirait plus rien le jour où il disparaîtrait.
    expect(autorises, 'le module d’effacement de D23 a disparu').toEqual(EFFACEMENT_AUTORISE)
  })

  it('⛔ aucun module ne ré-écrit `retireeLe` : la corbeille ne peut pas repousser', () => {
    const coupables: string[] = []

    const parcours = (repertoire: string) => {
      for (const entree of readdirSync(repertoire)) {
        const chemin = join(repertoire, entree)
        if (statSync(chemin).isDirectory()) {
          if (entree !== '__tests__') parcours(chemin)
          continue
        }
        if (!/\.tsx?$/.test(entree)) continue
        const source = readFileSync(chemin, 'utf8')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/.*$/gm, '')
        // Une écriture, c'est `retireeLe:` suivi d'autre chose que `undefined`
        // (le balayage, lui, RETIRE la clé en passant `undefined`).
        if (/retireeLe\s*:\s*(?!undefined)\S/.test(source)) coupables.push(relative(SRC, chemin))
      }
    }
    parcours(SRC)

    expect(coupables, `ces modules écrivent encore retireeLe : ${coupables.join(', ')}`).toEqual([])
  })
})

describe('D26 — le balayage remet en liste, il n’efface rien', () => {
  it('⭐ chaque fiche marquée revient, et la clé `retireeLe` est RETIRÉE', async () => {
    const id = await ajoute(fiche('Vharos', 1000, 900_000))

    const remontees = await balayerFichesRetirees()

    expect(remontees).toBe(1)
    const relue = await db.personnages.get(id)
    expect(relue?.retireeLe).toBeUndefined()
    expect(Object.prototype.hasOwnProperty.call(relue, 'retireeLe')).toBe(false)
  })

  it('⭐ ⛔ aucune purge : le compte d’enregistrements est le MÊME avant et après', async () => {
    await db.personnages.bulkAdd([
      fiche('Kaelen', 3000),
      fiche('Vharos', 2000, 900_000),
      fiche('Ombrelin', 1000, 900_001),
    ])

    await balayerFichesRetirees()

    expect(await db.personnages.count()).toBe(3)
    expect((await db.personnages.toArray()).map((p) => p.nomPerso).sort()).toEqual([
      'Kaelen',
      'Ombrelin',
      'Vharos',
    ])
  })

  it('⭐ `updatedAt` n’est jamais touché : la fiche revenue reprend sa place exacte', async () => {
    const id = await ajoute(fiche('Vharos', 1000, 999_999))
    const avant = await db.personnages.get(id)

    await balayerFichesRetirees()

    const apres = await db.personnages.get(id)
    expect(apres?.updatedAt).toBe(1000)
    // La fiche est redevenue exactement ce qu'elle était avant son retrait.
    expect(apres).toEqual({ ...avant, retireeLe: undefined })
    expect(apres?.createdAt).toBe(avant?.createdAt)
  })

  it('idempotent : le second passage ne remonte plus rien, et ne touche à rien', async () => {
    await db.personnages.bulkAdd([fiche('Kaelen', 2000), fiche('Vharos', 1000, 900_000)])

    expect(await balayerFichesRetirees()).toBe(1)
    const apresUn = await db.personnages.toArray()

    expect(await balayerFichesRetirees()).toBe(0)
    expect(await db.personnages.toArray()).toEqual(apresUn)
  })

  it('magasin sans aucune fiche marquée : rien à faire, rien de changé', async () => {
    await db.personnages.bulkAdd([fiche('Kaelen', 2000), fiche('Sarielle', 1000)])
    const avant = await db.personnages.toArray()

    expect(await balayerFichesRetirees()).toBe(0)
    expect(await db.personnages.toArray()).toEqual(avant)
  })
})
