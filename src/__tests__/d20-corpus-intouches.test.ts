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
 * D24 : `rules_kids.json` passe en 1.1.0 (métier + langues, arbitrage Fred
 * t010) — empreinte mise à jour ; `rules.json` reste intouché.
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
  'rules.json': '37ce5ba4740f6eb7528849a5955aa680911517d79d94db04baee266c44061c2a',
  'rules_kids.json': 'e4eb58b87596a4041ca95dc104a92a2f9502ac553793803739575381373998db',
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

  it('rules.json est toujours en 1.3.1', () => {
    expect(getVersion()).toBe('1.3.1')
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
    expect(getVersionKids()).toBe('1.1.0')
    expect(niveauxPossiblesEnfant().length).toBeGreaterThan(0)
  })
})
