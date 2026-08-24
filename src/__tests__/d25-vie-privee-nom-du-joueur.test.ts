/**
 * D25 · G1 — vie privée : aucun vrai nom n'entre dans le dépôt.
 *
 * Le dépôt est PUBLIC, et `nomDuJoueur` est le seul champ de l'app qui porte un
 * vrai nom — celui d'un enfant, la plupart du temps. Cette gate est NEUVE :
 * avant ce lot, rien n'empêchait une fixture ou un test d'y écrire un prénom, et
 * un prénom d'enfant poussé sur une branche publique ne se rattrape pas par un
 * `git revert` — il reste dans l'historique, dans les forks, dans les caches.
 *
 * Elle tient en deux moitiés :
 *   ① le BALAYAGE : dans tout `src/` — code, tests, fixtures — toute valeur
 *      littérale affectée à `nomDuJoueur` est l'une des valeurs manifestement
 *      fictives de `NOMS_JOUEUR_FICTIFS` ; et `exemples.ts` ne remplit jamais le
 *      champ, pour que les 8 aperçus gardent la case vide ;
 *   ② la JUMELLE : la constante partagée existe, un test l'utilise réellement,
 *      et le détecteur du balayage MORD — on le lui prouve sur un témoin
 *      fabriqué à l'exécution, jamais écrit dans ce fichier.
 *
 * ⛔ Aucun vrai nom ici non plus : le nom du champ et les valeurs témoins sont
 * assemblés morceau par morceau, pour que le fichier lui-même reste propre au
 * balayage qu'il porte.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { normaliserNomDuJoueur } from '../wizard/nomDuJoueur'
import { NOMS_JOUEUR_FICTIFS, NOM_JOUEUR_FICTIF } from './aide-noms-joueur'

const RACINE_SRC = join(dirname(fileURLToPath(import.meta.url)), '..')
const EXEMPLES = join(RACINE_SRC, 'pages', 'impression', 'exemples.ts')
const AIDE = join(RACINE_SRC, '__tests__', 'aide-noms-joueur.ts')

/** Le nom du champ, jamais collé à un littéral dans ce fichier. */
const CHAMP = 'nomDuJoueur'

/**
 * Les valeurs qu'une affectation littérale a le droit de porter : les noms
 * fictifs partagés, et la chaîne vide — qui ne nomme personne, et qu'un test a
 * besoin d'écrire pour prouver qu'elle ne laisse rien en magasin.
 */
const VALEURS_AUTORISEES: ReadonlySet<string> = new Set<string>([...NOMS_JOUEUR_FICTIFS, ''])

/**
 * Une affectation d'un littéral au champ, sous toutes ses formes :
 *   champ: 'x'   champ = 'x'   champ={'x'}   champ="x"   champ?: 'x'
 * Le corps du littéral est capturé tel quel — un gabarit interpolé
 * (`${…}`) n'est donc PAS dans la liste autorisée, et sera signalé.
 */
function affectationsLitterales(source: string): string[] {
  const motif = new RegExp(`${CHAMP}\\s*\\??\\s*[:=]\\s*\\{?\\s*(['"\`])((?:[^'"\`\\\\]|\\\\.)*)\\1`, 'g')
  return [...source.matchAll(motif)].map((m) => m[2])
}

/**
 * La source débarrassée de ses COMMENTAIRES — jamais de ses chaînes.
 *
 * La doctrine d'un module a le droit de NOMMER le champ pour dire qu'elle n'y
 * touche pas ; c'est le code qui ne doit pas le remplir. Le scanner suit donc
 * l'état du texte (chaîne simple, double, gabarit, commentaire de ligne, de
 * bloc) au lieu de découper à l'aveugle.
 */
function sansCommentaires(source: string): string {
  let sortie = ''
  let etat: 'code' | 'ligne' | 'bloc' | "'" | '"' | '`' = 'code'
  for (let i = 0; i < source.length; i += 1) {
    const c = source[i]
    const suivant = source[i + 1]
    if (etat === 'code') {
      if (c === '/' && suivant === '/') { etat = 'ligne'; i += 1; continue }
      if (c === '/' && suivant === '*') { etat = 'bloc'; i += 1; continue }
      if (c === "'" || c === '"' || c === '`') etat = c
      sortie += c
      continue
    }
    if (etat === 'ligne') {
      if (c === '\n') { etat = 'code'; sortie += c }
      continue
    }
    if (etat === 'bloc') {
      if (c === '*' && suivant === '/') { etat = 'code'; i += 1 }
      continue
    }
    // dans une chaîne : on la garde entière, échappements compris
    sortie += c
    if (c === '\\') { sortie += suivant ?? ''; i += 1; continue }
    if (c === etat) etat = 'code'
  }
  return sortie
}

/** Tous les fichiers de `src/`, sans exception : le code, les tests, les fixtures. */
function fichiersDe(dossier: string): string[] {
  const resultats: string[] = []
  for (const nom of readdirSync(dossier)) {
    const chemin = join(dossier, nom)
    if (statSync(chemin).isDirectory()) {
      resultats.push(...fichiersDe(chemin))
    } else {
      resultats.push(chemin)
    }
  }
  return resultats
}

describe('D25 · G1 ① — le balayage de src/', () => {
  it('aucune valeur littérale hors des noms fictifs partagés', () => {
    const coupables: string[] = []
    for (const chemin of fichiersDe(RACINE_SRC)) {
      for (const valeur of affectationsLitterales(readFileSync(chemin, 'utf8'))) {
        if (!VALEURS_AUTORISEES.has(valeur)) {
          coupables.push(`${relative(RACINE_SRC, chemin)} → « ${valeur} »`)
        }
      }
    }
    expect(
      coupables,
      'Le dépôt est PUBLIC. Un nom de joueur écrit en dur dans src/ y reste pour ' +
        'toujours — passe par NOMS_JOUEUR_FICTIFS (src/__tests__/aide-noms-joueur.ts).',
    ).toEqual([])
  })

  it('les fiches d’exemple de la feuille ne remplissent JAMAIS le champ', () => {
    // Les 8 aperçus imprimés gardent la case « Nom du joueur » vide, à remplir
    // au crayon : ce sont des images publiques du dépôt. Le CODE ne nomme donc
    // pas le champ — la doctrine du module, elle, a le droit d'en parler.
    expect(
      sansCommentaires(readFileSync(EXEMPLES, 'utf8')).includes(CHAMP),
      'exemples.ts ne doit pas remplir le nom du joueur : les aperçus publics gardent la case vide.',
    ).toBe(false)
  })
})

describe('D25 · G1 ② — la jumelle', () => {
  it('la constante partagée existe, et elle est manifestement fictive', () => {
    expect(NOMS_JOUEUR_FICTIFS.length).toBeGreaterThan(0)
    for (const nom of NOMS_JOUEUR_FICTIFS) {
      expect(nom, `« ${nom} » doit se lire comme une étiquette, pas comme un prénom`).toMatch(
        /Exemple/,
      )
    }
  })

  it('au moins un test l’utilise réellement', () => {
    // ⛔ Ce fichier-ci ne se compte pas : sinon la jumelle se contenterait de
    // l'import qu'elle a elle-même écrit, et la constante pourrait exister sans
    // qu'aucune gate du champ ne s'en serve.
    const suites = fichiersDe(RACINE_SRC)
      .filter((chemin) => /\.test\.tsx?$/.test(chemin))
      .filter((chemin) => chemin !== fileURLToPath(import.meta.url))
    const usagers = suites.filter((chemin) => {
      const source = readFileSync(chemin, 'utf8')
      return source.includes('aide-noms-joueur') && /NOMS?_JOUEUR_FICTIFS?|NOM_JOUEUR_FICTIF/.test(source)
    })
    expect(usagers.length, 'la constante existe mais aucune suite ne s’en sert').toBeGreaterThan(0)
  })

  it('la constante est une VALEUR utilisable — elle traverse la normalisation intacte', () => {
    expect(normaliserNomDuJoueur(NOM_JOUEUR_FICTIF)).toBe(NOM_JOUEUR_FICTIF)
  })

  it('le détecteur MORD : un littéral non autorisé est vu, un autorisé passe', () => {
    // Les témoins sont assemblés ICI, à l'exécution : le fichier ne contient
    // jamais le champ collé à un littéral, et reste donc propre à son propre
    // balayage.
    const temoinInterdit = `${CHAMP}: '${['NOM', 'TEMOIN', 'NON', 'AUTORISE'].join('-')}'`
    const temoinPermis = `${CHAMP}: '${NOM_JOUEUR_FICTIF}'`

    expect(affectationsLitterales(temoinInterdit)).toEqual(['NOM-TEMOIN-NON-AUTORISE'])
    expect(affectationsLitterales(temoinPermis)).toEqual([NOM_JOUEUR_FICTIF])
    expect(VALEURS_AUTORISEES.has('NOM-TEMOIN-NON-AUTORISE')).toBe(false)
    expect(VALEURS_AUTORISEES.has(NOM_JOUEUR_FICTIF)).toBe(true)

    // …et les autres formes d'affectation ne lui échappent pas.
    for (const forme of [`${CHAMP} = "x"`, `${CHAMP}={'x'}`, `${CHAMP}="x"`, `${CHAMP}?: 'x'`]) {
      expect(affectationsLitterales(forme), `forme non détectée : ${forme}`).toEqual(['x'])
    }
  })

  it('l’aide de test est bien une aide, pas une suite qui ne tourne jamais', () => {
    // `vitest.config` ne collecte que `*.test.ts(x)` : le fichier d'aide ne doit
    // pas se déguiser en suite, sinon ses valeurs vivraient hors de tout contrôle.
    expect(AIDE.endsWith('.test.ts')).toBe(false)
    expect(readFileSync(AIDE, 'utf8')).toContain('NOMS_JOUEUR_FICTIFS')
  })
})
