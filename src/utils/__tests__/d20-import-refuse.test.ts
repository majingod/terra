/**
 * D20 ⑥⑤ — un JSON d'ancienne version est refusé, LISIBLEMENT.
 *
 * Le message est écrit pour un joueur de 12 ans : ⛔ jamais une erreur
 * technique, jamais un nom de champ, jamais un état interne.
 *
 * ⚠️ ÉCART RAPPORTÉ, ET NON CORRIGÉ TOUT SEUL. Le brief demande deux choses
 * qui se contredisent :
 *   - ③ arbitre le libellé mot pour mot : « Ce personnage vient d'une version
 *     précédente du jeu : il faut le refaire » ;
 *   - ⑤ demande de balayer le message contre « schema », « version »,
 *     « undefined », « error ».
 * Le libellé arbitré CONTIENT « version ». Corriger le libellé, c'est toucher
 * à un libellé arbitré ; retirer le mot du balayage, c'est toucher à une spec
 * de test. Les deux sont interdits. J'ai gardé le LIBELLÉ (cité deux fois par
 * Fred, et il est du français ordinaire dans cette phrase), et je balaye les
 * trois termes qui sont, eux, franchement techniques. L'écart est au rapport :
 * c'est à Fred de trancher, pas à moi.
 */
// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { db, nouvellePersonnageVierge, type Personnage } from '../../db'
import { branchesDe, classesAvecBranches } from '../../rules/branches'
import { getVersion } from '../../rules/load'
import { niveauMin } from '../../rules/niveau'
import { historiqueJusquA } from '../../wizard/__tests__/aide-fiche-complete'
import { exporterPersonnageJSON, importerPersonnageJSON } from '../exportImport'

/**
 * Les termes techniques que le message ne doit pas porter. « version » n'y est
 * pas — voir l'écart rapporté en tête de fichier.
 */
const TERMES_TECHNIQUES = [/schema/i, /undefined/i, /error/i, /null/i, /JSON/, /\bcreation\b/]

const CLASSE = classesAvecBranches()[0].classe_id
const VOIE = branchesDe(CLASSE)[0]
const BAS = niveauMin()

function personnage(historique: boolean): Omit<Personnage, 'id'> {
  return {
    ...nouvellePersonnageVierge(),
    nomPerso: 'Bob',
    classe: CLASSE,
    niveau: BAS,
    creation: {
      classe: CLASSE,
      capNiveaux: { [String(BAS)]: VOIE.capacites.find((c) => c.niveau === BAS)!.id },
      ...(historique ? { historique: historiqueJusquA(BAS) } : {}),
    },
  }
}

function fichier(contenu: unknown): File {
  return new File([JSON.stringify(contenu)], 'fiche.json', { type: 'application/json' })
}

beforeEach(async () => {
  await db.personnages.clear()
})

afterEach(async () => {
  await db.personnages.clear()
})

describe('D20 ⑤ — le refus d’un fichier d’ancienne version', () => {
  it('un JSON sans historique est refusé, et rien n’entre dans le magasin', async () => {
    await expect(importerPersonnageJSON(fichier(personnage(false)))).rejects.toThrow()
    expect(await db.personnages.count()).toBe(0)
  })

  it('le message se lit — aucun terme technique', async () => {
    const erreur = await importerPersonnageJSON(fichier(personnage(false))).catch((e) => e)
    const message = erreur instanceof Error ? erreur.message : String(erreur)
    for (const terme of TERMES_TECHNIQUES) {
      expect(terme.test(message), `terme technique dans le message : ${terme} — « ${message} »`).toBe(
        false,
      )
    }
    // Et il DIT quoi faire : le joueur n'est pas laissé devant un mur.
    expect(message).toMatch(/refaire/i)
  })

  it('jumelle : un JSON courant s’importe', async () => {
    await importerPersonnageJSON(fichier(personnage(true)))
    const importe = await db.personnages.toArray()
    expect(importe).toHaveLength(1)
    expect(importe[0].nomPerso).toBe('Bob')
    expect(importe[0].creation?.historique).toHaveLength(1)
  })
})

describe('D20 ③ — le JSON exporté porte la marque de sa version', () => {
  it('la marque est celle des données, jamais un numéro écrit dans le code', () => {
    let ecrit = ''
    const vraiBlob = globalThis.Blob
    class BlobEspion extends vraiBlob {
      constructor(parties: BlobPart[], options?: BlobPropertyBag) {
        ecrit = String(parties[0])
        super(parties, options)
      }
    }
    globalThis.Blob = BlobEspion as unknown as typeof Blob
    globalThis.URL.createObjectURL = () => 'blob:temoin'
    globalThis.URL.revokeObjectURL = () => {}
    try {
      exporterPersonnageJSON({ ...personnage(true), id: 1 })
    } finally {
      globalThis.Blob = vraiBlob
    }
    expect(JSON.parse(ecrit).versionJeu).toBe(getVersion())
  })
})
