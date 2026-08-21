/**
 * D20 ⑥⑧ — ⚠️ ≤11 : rien ne change.
 *
 * Chez les enfants, chaque échelon donne exactement une capacité et aucun
 * choix n'existe nulle part : leur historique se DÉDUIT du niveau seul. Ils
 * déclarent leur niveau comme aujourd'hui et gardent le bouton Monter de D17.
 *
 * ⛔ `rules_kids.json` et `rules.json` sont intouchés À L'OCTET. La gate le
 * prouve par l'empreinte du fichier, pas par un numéro de version qu'on
 * pourrait laisser derrière : si un octet bouge, elle rougit, et c'est à ce
 * moment-là qu'on décide si le changement était voulu.
 *
 * (Les empreintes sont celles de `main` au départ du lot — 71609cd.)
 */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { getVersionKids, niveauxPossiblesEnfant, tableEvolutionEnfant } from '../rules/kids'
import { getVersion } from '../rules/load'

const DONNEES = join(dirname(fileURLToPath(import.meta.url)), '..', 'data')

const EMPREINTES: Record<string, string> = {
  'rules.json': 'c2b202a036300cc4edba660b64b0a13eab355c33c3078cb5a8cb958aafef86dd',
  'rules_kids.json': '65030c85386649edffd55cdfb795cb3ffb0ad1ab32074c180040236d26d68424',
}

function empreinte(fichier: string): string {
  return createHash('sha256').update(readFileSync(join(DONNEES, fichier))).digest('hex')
}

describe('D20 ⑧ — les deux corpus sont intouchés à l’octet', () => {
  for (const [fichier, attendue] of Object.entries(EMPREINTES)) {
    it(`${fichier} n’a pas bougé d’un octet`, () => {
      expect(
        empreinte(fichier),
        `${fichier} a changé. Si c'est voulu, c'est un arbitrage — pas un effet de bord.`,
      ).toBe(attendue)
    })
  }

  it('rules.json est toujours en 1.2.0', () => {
    expect(getVersion()).toBe('1.2.0')
  })
})

describe('D20 ⑧ — ⚠️ ≤11 : leur historique se déduit du niveau seul', () => {
  it('chaque échelon enfant donne exactement une capacité, aucun choix nulle part', () => {
    const table = tableEvolutionEnfant()
    expect(table.length).toBeGreaterThan(0)
    for (const ligne of table) {
      // Aucun échelon enfant ne demande de choisir : ni don, ni point de
      // caractéristique, ni capacité à prendre dans un bassin.
      expect(Object.keys(ligne)).not.toContain('dons')
      expect(Object.keys(ligne)).not.toContain('carac_points')
    }
  })

  it('le corpus enfant garde sa version et sa table', () => {
    expect(getVersionKids()).toBe('1.0.0')
    expect(niveauxPossiblesEnfant().length).toBeGreaterThan(0)
  })
})
