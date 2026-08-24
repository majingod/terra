/**
 * D25 · G2 — le nom du joueur survit à l'aller-retour export → import.
 *
 * ⚠️ C'est LA gate du piège du lot, et celle que G6 demande de voir rougir sur
 * la version d'avant. L'export sérialise l'enregistrement entier : il n'a rien à
 * faire, et il marchait déjà. L'IMPORT, lui, RECONSTRUIT la fiche champ par
 * champ — un champ qu'il ne nomme pas explicitement est silencieusement perdu.
 * Le joueur ne voit rien : son fichier contient bien son nom, l'import ne se
 * plaint pas, et la fiche réapparaît anonyme. C'est exactement ce que fait
 * `origin/main`, et c'est ce que ce test attrape.
 *
 * L'autre moitié compte autant : une fiche SANS nom doit revenir sans la CLÉ —
 * pas avec une chaîne vide. Un `''` en magasin serait un champ « rempli de
 * rien », impossible à distinguer d'un champ jamais rempli, et il ferait
 * s'afficher « joué par  » sur la fiche.
 *
 * ⛔ Aucun vrai nom : les valeurs viennent de `NOMS_JOUEUR_FICTIFS` (G1).
 */
// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db, nouvellePersonnageVierge, type Personnage } from '../../db'
import { branchesDe, classesAvecBranches } from '../../rules/branches'
import { niveauMin } from '../../rules/niveau'
import { historiqueJusquA } from '../../wizard/__tests__/aide-fiche-complete'
import {
  AUTRE_NOM_JOUEUR_FICTIF,
  NOM_JOUEUR_FICTIF,
} from '../../__tests__/aide-noms-joueur'
import { exporterPersonnageJSON, importerPersonnageJSON } from '../exportImport'

const CLASSE = classesAvecBranches()[0].classe_id
const VOIE = branchesDe(CLASSE)[0]
const BAS = niveauMin()

/** Une fiche courante (avec historique : elle passe la garde D20 de l'import). */
function personnage(nomDuJoueur?: string): Omit<Personnage, 'id'> {
  const base: Omit<Personnage, 'id'> = {
    ...nouvellePersonnageVierge(),
    nomPerso: 'Kaelen Sombrelame',
    classe: CLASSE,
    niveau: BAS,
    creation: {
      classe: CLASSE,
      capNiveaux: { [String(BAS)]: VOIE.capacites.find((c) => c.niveau === BAS)!.id },
      historique: historiqueJusquA(BAS),
    },
  }
  // Le spread conditionnel, pas `nomDuJoueur: undefined` : la fiche « sans »
  // doit vraiment n'avoir aucune clé, sinon le test se mentirait à lui-même.
  return nomDuJoueur === undefined ? base : { ...base, nomDuJoueur }
}

/**
 * L'aller-retour RÉEL : ce que `exporterPersonnageJSON` écrit dans le Blob part
 * tel quel dans le fichier que `importerPersonnageJSON` relit. Aucun raccourci —
 * si on fabriquait le JSON à la main, on testerait notre idée de l'export, pas
 * l'export.
 */
async function allerRetour(fiche: Omit<Personnage, 'id'>): Promise<Personnage> {
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
    exporterPersonnageJSON({ ...fiche, id: 1 })
  } finally {
    globalThis.Blob = vraiBlob
  }

  await db.personnages.clear()
  await importerPersonnageJSON(new File([ecrit], 'fiche.json', { type: 'application/json' }))
  const importees = await db.personnages.toArray()
  expect(importees).toHaveLength(1)
  return importees[0]
}

beforeEach(async () => {
  await db.personnages.clear()
})

afterEach(async () => {
  await db.personnages.clear()
})

describe('D25 · G2 — l’aller-retour JSON', () => {
  it('une fiche AVEC nom de joueur le retrouve à l’identique', async () => {
    const importee = await allerRetour(personnage(NOM_JOUEUR_FICTIF))
    expect(
      importee.nomDuJoueur,
      'le nom du joueur a été perdu à l’import : l’import RECONSTRUIT la fiche champ par champ.',
    ).toBe(NOM_JOUEUR_FICTIF)
  })

  it('le nom exporté est bien celui de la fiche, pas un autre', async () => {
    const importee = await allerRetour(personnage(AUTRE_NOM_JOUEUR_FICTIF))
    expect(importee.nomDuJoueur).toBe(AUTRE_NOM_JOUEUR_FICTIF)
  })

  it('une fiche SANS nom de joueur revient sans la CLÉ — jamais avec `\'\'`', async () => {
    const importee = await allerRetour(personnage())
    expect(importee.nomDuJoueur).toBeUndefined()
    expect(
      Object.prototype.hasOwnProperty.call(importee, 'nomDuJoueur'),
      'la clé doit être ABSENTE, pas présente et vide : un champ « rempli de rien » ne se distingue plus d’un champ jamais rempli.',
    ).toBe(false)
  })

  it('un nom fait de blancs ne laisse rien derrière lui', async () => {
    const importee = await allerRetour(personnage('   '))
    expect(Object.prototype.hasOwnProperty.call(importee, 'nomDuJoueur')).toBe(false)
  })

  it('le reste de la fiche traverse l’aller-retour intact', async () => {
    // Jumelle : si l'import cassait tout, les deux tests ci-dessus rougiraient
    // pour la mauvaise raison.
    const importee = await allerRetour(personnage(NOM_JOUEUR_FICTIF))
    expect(importee.nomPerso).toBe('Kaelen Sombrelame')
    expect(importee.classe).toBe(CLASSE)
    expect(importee.creation?.historique).toHaveLength(1)
  })
})

/**
 * ⚠️ ÉCART RAPPORTÉ — le nom n'a qu'UN domicile sur l'enregistrement.
 *
 * Le brief pose le champ sur les deux types (`Personnage` et `FicheCreation`).
 * Or l'enregistrement recopie la fiche du wizard ENTIÈRE sous `creation` : pris
 * au pied de la lettre, le nom s'y retrouve deux fois, et la seconde copie est
 * celle qui n'est pas trimée — et qui SURVIT à l'effacement, jusque dans
 * l'export JSON. Un joueur qui efface son nom doit voir son nom effacé : ces
 * gates tiennent le domicile unique.
 */
describe('D25 — un seul domicile pour le nom, sur l’enregistrement', () => {
  it('un aller-retour ne réinstalle pas une copie sous `creation`', async () => {
    const avecCopie: Omit<Personnage, 'id'> = {
      ...personnage(NOM_JOUEUR_FICTIF),
      creation: { ...personnage(NOM_JOUEUR_FICTIF).creation, nomDuJoueur: NOM_JOUEUR_FICTIF },
    }
    const importee = await allerRetour(avecCopie)

    expect(importee.nomDuJoueur).toBe(NOM_JOUEUR_FICTIF)
    expect(
      Object.prototype.hasOwnProperty.call(importee.creation as object, 'nomDuJoueur'),
      'le nom ne doit vivre qu’en haut de l’enregistrement — une seconde copie survivrait à son effacement.',
    ).toBe(false)
  })

  it('effacer le nom ne laisse RIEN derrière, nulle part', async () => {
    const id = await db.personnages.add(personnage(NOM_JOUEUR_FICTIF))
    await db.personnages.update(id, { nomDuJoueur: undefined })

    const relue = await db.personnages.get(id)
    expect(JSON.stringify(relue)).not.toContain(NOM_JOUEUR_FICTIF)
  })
})
