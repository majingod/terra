/**
 * Lot C — gate structurel du corpus enfant (rules_kids.json v1.0.0) et
 * lecture de sa table d'évolution.
 *
 * Le corpus enfant a sa propre autorité : la planche de cartes. Ce fichier
 * mesure ce que la planche dit, et que les deux corpus ne se mélangent pas.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  capacitesEnfantAcquises,
  classeEnfant,
  classesEnfant,
  factionsEnfant,
  getRulesKids,
  niveauxPossiblesEnfant,
  statsEnfant,
} from '../kids'
import { texteAffiche } from '../../pages/creation/ui'

const RACINE_SRC = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
/** Lutte de chaque classe, telle qu'écrite sur la planche. */
const LUTTE_ATTENDUE: Record<string, number> = {
  guerrier: 3,
  roublard: 2,
  magicien: 1,
  druide: 1,
}

describe('Lot C — structure de rules_kids.json', () => {
  it('quatre classes, ni plus ni moins', () => {
    expect(classesEnfant()).toHaveLength(4)
    expect(classesEnfant().map((c) => c.id).sort()).toEqual(Object.keys(LUTTE_ATTENDUE).sort())
  })

  it('trois capacités par classe, aux niveaux 1, 3 et 5', () => {
    for (const classe of classesEnfant()) {
      expect(classe.capacites).toHaveLength(3)
      expect(classe.capacites.map((c) => c.niveau).sort((a, b) => a - b)).toEqual([1, 3, 5])
    }
  })

  it('la Lutte de chaque classe est celle de la planche', () => {
    for (const classe of classesEnfant()) {
      expect(classe.lutte).toBe(LUTTE_ATTENDUE[classe.id])
    }
  })

  it('PV 3 et Dégâts 2 communs à toutes les classes', () => {
    const communes = getRulesKids().stats_communes
    expect(communes.pv).toBe(3)
    expect(communes.degats).toBe(2)
    for (const classe of classesEnfant()) {
      const stats = statsEnfant(classe.id, 1)
      expect(stats).toEqual({ pv: 3, degats: 2, lutte: LUTTE_ATTENDUE[classe.id] })
    }
  })

  it('deux factions, chacune avec son texte enfant', () => {
    const factions = factionsEnfant()
    expect(factions).toHaveLength(2)
    for (const faction of factions) {
      expect(faction.nom.length).toBeGreaterThan(0)
      expect(texteAffiche(faction).length).toBeGreaterThan(0)
    }
  })

  it('témoin non vide par classe : chaque capacité rend un texte', () => {
    for (const classe of classesEnfant()) {
      const textes = classe.capacites.map((capacite) => texteAffiche(capacite))
      expect(textes).toHaveLength(3)
      for (const texte of textes) {
        expect(texte.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('la race de la planche est fixe et SANS le bonus du corpus 12+', () => {
    const race = getRulesKids().stats_communes.race
    expect(race.nom).toBe('Humain')
    // Le +1 PV / +1 Mana de l'Humain du Tome ne suit pas : les PV enfant
    // restent ceux de la planche, quelle que soit la classe.
    for (const classe of classesEnfant()) {
      expect(statsEnfant(classe.id, 5)?.pv).toBe(getRulesKids().stats_communes.pv)
    }
  })

  it('les deux corpus ne se mélangent pas : aucun import croisé', () => {
    // Seuls les imports comptent, pas la prose des commentaires.
    const importsDe = (fichier: string): string[] =>
      readFileSync(join(RACINE_SRC, 'rules', fichier), 'utf8').match(/from\s+'[^']+'/g) ?? []

    const chargeurEnfant = importsDe('kids.ts')
    expect(chargeurEnfant).toContain("from '../data/rules_kids.json'")
    expect(chargeurEnfant.some((i) => /rules\.json|\.\/load/.test(i))).toBe(false)

    const chargeurTome = importsDe('load.ts')
    expect(chargeurTome).toContain("from '../data/rules.json'")
    expect(chargeurTome.some((i) => /rules_kids|\.\/kids/.test(i))).toBe(false)
  })
})

describe('Lot C — table d’évolution enfant', () => {
  it('les échelons proposés sont ceux de la table', () => {
    expect(niveauxPossiblesEnfant()).toEqual([1, 2, 3, 4, 5])
  })

  it('enfant_niv4_a_lutte_plus1_et_degats_plus1', () => {
    for (const classe of classesEnfant()) {
      const niv1 = statsEnfant(classe.id, 1)!
      const niv4 = statsEnfant(classe.id, 4)!
      expect(niv4.lutte).toBe(niv1.lutte + 1)
      expect(niv4.degats).toBe(niv1.degats + 1)
      // Les PV ne bougent pas d'un échelon à l'autre.
      expect(niv4.pv).toBe(niv1.pv)
    }
  })

  it('jumelle : le +1 Lutte tombe au niveau 2 et le +1 Dégâts au niveau 4', () => {
    const classe = classesEnfant()[0]
    const par = (niveau: number) => statsEnfant(classe.id, niveau)!
    expect(par(2).lutte).toBe(par(1).lutte + 1)
    expect(par(3).lutte).toBe(par(2).lutte)
    expect(par(2).degats).toBe(par(1).degats)
    expect(par(3).degats).toBe(par(1).degats)
    expect(par(4).degats).toBe(par(3).degats + 1)
    expect(par(5).degats).toBe(par(4).degats)
    expect(par(5).lutte).toBe(par(4).lutte)
  })

  it('enfant_niv3_a_capacites_niv1_et_3', () => {
    for (const classe of classesEnfant()) {
      const acquises = capacitesEnfantAcquises(classe.id, 3)
      expect(acquises.map((c) => c.niveau)).toEqual([1, 3])
      const attendues = classe.capacites
        .filter((c) => c.niveau <= 3)
        .map((c) => c.id)
        .sort()
      expect(acquises.map((c) => c.id).sort()).toEqual(attendues)
    }
  })

  it('jumelle : le niveau 1 n’a qu’une capacité, le niveau 5 les trois', () => {
    const classe = classesEnfant()[0]
    expect(capacitesEnfantAcquises(classe.id, 1).map((c) => c.niveau)).toEqual([1])
    expect(capacitesEnfantAcquises(classe.id, 5).map((c) => c.niveau)).toEqual([1, 3, 5])
  })

  it('sans classe choisie, aucune capacité et aucune stat', () => {
    expect(capacitesEnfantAcquises(undefined, 5)).toEqual([])
    expect(statsEnfant(undefined, 5)).toBeUndefined()
    expect(classeEnfant('inexistante')).toBeUndefined()
  })
})
