/**
 * D16 — le parcours du wizard, chemins de RETOUR compris.
 *
 * L'étape de choix de voie est retirée ; « Tes capacités » la remplace, après
 * que la classe ET le niveau sont connus. Reculer, changer de classe ou
 * baisser son niveau doit se comporter comme la fenêtre de répercussions le
 * dit — rien ne s'applique en silence, chaque retrait est nommé.
 */
import { describe, expect, it } from 'vitest'
import { branchesDe, classesAvecBranches } from '../../rules/branches'
import { niveauMax, niveauMin } from '../../rules/niveau'
import { classesPourFaction } from '../../rules/stats'
import {
  ETAPES,
  changerClasse,
  changerNiveau,
  etapeValide,
  problemesCapacites,
  problemesClasse,
} from '../validation'
import type { FicheCreation } from '../types'

const CLASSE = classesAvecBranches()[0].classe_id
const VOIES = branchesDe(CLASSE)
const FACTION = classesPourFaction('sanctum').some((c) => c.id === CLASSE) ? 'sanctum' : 'legion'
const HAUT = niveauMax()
const BAS = niveauMin()

/** Une capacité par échelon 1..niveau, prise dans une voie tournante. */
function capNiveaux(niveau: number): Record<string, string> {
  const choix: Record<string, string> = {}
  for (let n = 1; n <= niveau; n++) {
    choix[String(n)] = VOIES[(n - 1) % VOIES.length].capacites.find((c) => c.niveau === n)!.id
  }
  return choix
}

function fiche(niveau: number): FicheCreation {
  return { faction: FACTION, classe: CLASSE, niveau, capNiveaux: capNiveaux(niveau) }
}

describe('D16 — l’étape « Tes capacités » dans le parcours', () => {
  it('elle existe, s’appelle « Tes capacités » et suit la classe', () => {
    const ids = ETAPES.map((e) => e.id)
    expect(ids).toContain('capacites')
    expect(ETAPES.find((e) => e.id === 'capacites')!.nom).toBe('Tes capacités')
    expect(ids.indexOf('capacites')).toBeGreaterThan(ids.indexOf('classe'))
    expect(ids.indexOf('capacites')).toBeGreaterThan(ids.indexOf('niveau'))
  })

  it('elle est AVANT le destin : les achats XP se comptent sur ce qui est déjà pris', () => {
    const ids = ETAPES.map((e) => e.id)
    expect(ids.indexOf('capacites')).toBeLessThan(ids.indexOf('destin'))
  })

  it('l’étape « Classe » n’exige plus de voie', () => {
    expect(problemesClasse({ faction: FACTION, classe: CLASSE })).toEqual([])
  })

  it('« Tes capacités » n’est valide que remplie', () => {
    expect(etapeValide({ faction: FACTION, classe: CLASSE, niveau: HAUT }, 'capacites')).toBe(false)
    expect(etapeValide(fiche(HAUT), 'capacites')).toBe(true)
  })

  it('un emplacement qui porte trop haut est refusé et nommé', () => {
    const trop = VOIES[0].capacites.find((c) => c.niveau === 2)!
    const problemes = problemesCapacites({
      faction: FACTION,
      classe: CLASSE,
      niveau: 1,
      capNiveaux: { '1': trop.id },
    })
    expect(problemes.some((p) => p.includes(trop.nom))).toBe(true)
  })
})

describe('D16 — les chemins de retour', () => {
  it('changer de classe vide les capacités, et le dit AVANT de le faire', () => {
    const autre = classesAvecBranches().find((c) => c.classe_id !== CLASSE)!.classe_id
    const { fiche: suite, retraits } = changerClasse(fiche(HAUT), autre)
    expect(retraits.length).toBeGreaterThan(0)
    expect(retraits.some((r) => r.includes('capacités'))).toBe(true)
    expect(suite.capNiveaux).toEqual({})
  })

  it('jumelle : sans aucune capacité choisie, changer de classe ne nomme rien', () => {
    const autre = classesAvecBranches().find((c) => c.classe_id !== CLASSE)!.classe_id
    const { retraits } = changerClasse({ faction: FACTION, classe: CLASSE }, autre)
    expect(retraits.filter((r) => r.includes('capacité'))).toEqual([])
  })

  it('baisser le niveau vide les emplacements en trop, chacun nommé', () => {
    const { fiche: suite, retraits } = changerNiveau(fiche(HAUT), BAS)
    expect(Object.keys(suite.capNiveaux ?? {})).toEqual([String(BAS)])
    const perdues = HAUT - BAS
    expect(retraits.filter((r) => r.includes('emplacement'))).toHaveLength(perdues)
  })

  it('jumelle : monter de niveau ne retire AUCUNE capacité — il en ouvre', () => {
    const { fiche: suite, retraits } = changerNiveau(fiche(BAS), HAUT)
    expect(Object.keys(suite.capNiveaux ?? {})).toEqual([String(BAS)])
    expect(retraits.filter((r) => r.includes('capacité'))).toEqual([])
    // Les emplacements ouverts restent à remplir : l'étape n'est pas valide.
    expect(etapeValide(suite, 'capacites')).toBe(false)
  })

  it('la validation d’ensemble refuse une fiche dont un emplacement manque', () => {
    const trouee = { ...fiche(HAUT), capNiveaux: capNiveaux(HAUT - 1) }
    expect(etapeValide(trouee, 'capacites')).toBe(false)
  })
})
