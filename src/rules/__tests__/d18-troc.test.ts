/**
 * D18 ③ — le troc se lit dans les DONNÉES, jamais dans une liste de classes.
 *
 * Gate ③ du brief (jumelles négatives, versant règles) : le critère est le
 * champ `troc` de `classes_squelette`. Une classe qui le porte obtient le
 * troc, une classe qui ne le porte pas ne l'obtient pas — et une classe
 * FICTIVE qui le porte l'obtient elle aussi. C'est ce dernier point qui prouve
 * qu'on a livré le critère et pas la liste.
 *
 * D5 : aucun id de classe n'est écrit ici. Les classes témoins sont
 * retrouvées par leur champ.
 */
import { describe, expect, it } from 'vitest'
import { getRules } from '../load'
import { niveauMax, tableEvolution } from '../niveau'
import { coutDunDonTroque, effetAchat, listeAchats } from '../heritage'
import {
  TROC_CAPACITE_VERS_DON,
  TROC_DON_VERS_CAPACITE,
  echelonsDeDon,
  plafondDuTrocDeDon,
  prendUnDonAuLieuDUneCapacite,
  prendUneCapaciteAuLieuDUnDon,
  trocDeClasse,
} from '../troc'

const CLASSES = getRules().classes_squelette.liste
const AVEC_TROC = CLASSES.filter((c) => c.troc !== undefined)
const SANS_TROC = CLASSES.filter((c) => c.troc === undefined)
const VERS_DON = CLASSES.find((c) => c.troc === TROC_CAPACITE_VERS_DON)
const VERS_CAPACITE = CLASSES.find((c) => c.troc === TROC_DON_VERS_CAPACITE)

describe('D18 ③ — le champ `troc` porte la règle', () => {
  it('exactement deux classes portent un troc, une dans chaque sens', () => {
    expect(AVEC_TROC).toHaveLength(2)
    expect(VERS_DON, 'aucune classe ne troque une capacité contre un don').toBeTruthy()
    expect(VERS_CAPACITE, 'aucune classe ne troque un don contre une capacité').toBeTruthy()
  })

  it('la classe qui troque porte AUSSI le texte du Tome — les deux disent la même chose', () => {
    // Le champ structuré ne remplace pas le verbatim : il le rend jouable.
    for (const classe of AVEC_TROC) {
      expect(classe.echange, `${classe.id} porte un troc sans texte`).toBeTruthy()
    }
  })

  it('le sens du troc se lit par le champ, dans les deux sens', () => {
    expect(prendUnDonAuLieuDUneCapacite(VERS_DON!.id)).toBe(true)
    expect(prendUneCapaciteAuLieuDUnDon(VERS_DON!.id)).toBe(false)
    expect(prendUneCapaciteAuLieuDUnDon(VERS_CAPACITE!.id)).toBe(true)
    expect(prendUnDonAuLieuDUneCapacite(VERS_CAPACITE!.id)).toBe(false)
  })

  it('jumelle négative : aucune autre classe n’a de troc, dans aucun sens', () => {
    expect(SANS_TROC.length).toBeGreaterThan(0)
    for (const classe of SANS_TROC) {
      expect(trocDeClasse(classe.id), classe.id).toBeUndefined()
      expect(prendUnDonAuLieuDUneCapacite(classe.id), classe.id).toBe(false)
      expect(prendUneCapaciteAuLieuDUnDon(classe.id), classe.id).toBe(false)
    }
  })

  it('sans classe (fiche d’avant le wizard), aucun troc — et rien ne casse', () => {
    expect(trocDeClasse(undefined)).toBeUndefined()
    expect(prendUnDonAuLieuDUneCapacite(undefined)).toBe(false)
    expect(prendUneCapaciteAuLieuDUnDon(undefined)).toBe(false)
  })

  it('le critère, pas la liste : une classe FICTIVE qui porte le champ l’obtient', () => {
    // On ajoute une classe inventée aux données chargées, le temps du test :
    // si la logique tenait une liste d'ids, elle ne la verrait pas.
    const liste = getRules().classes_squelette.liste
    const fictive = { ...liste[0], id: 'classe-fictive-d18', troc: TROC_CAPACITE_VERS_DON }
    liste.push(fictive)
    try {
      expect(prendUnDonAuLieuDUneCapacite('classe-fictive-d18')).toBe(true)
      expect(prendUneCapaciteAuLieuDUnDon('classe-fictive-d18')).toBe(false)
      liste[liste.length - 1] = { ...fictive, troc: TROC_DON_VERS_CAPACITE }
      expect(prendUneCapaciteAuLieuDUnDon('classe-fictive-d18')).toBe(true)
      expect(prendUnDonAuLieuDUneCapacite('classe-fictive-d18')).toBe(false)
    } finally {
      liste.pop()
    }
  })
})

describe('D18 — les échelons troquables viennent de la table, pas d’un rythme écrit', () => {
  it('ce sont exactement les échelons de la table qui donnent un don', () => {
    const attendus = tableEvolution()
      .filter((ligne) => ligne.dons > 0)
      .map((ligne) => ligne.niv)
    expect(echelonsDeDon(niveauMax())).toEqual(attendus)
  })

  it('un niveau plus bas ne montre que ses propres échelons', () => {
    for (const niveau of tableEvolution().map((l) => l.niv)) {
      expect(echelonsDeDon(niveau).every((e) => e <= niveau)).toBe(true)
    }
  })

  it('le plafond du troc est l’échelon lui-même (« niveau ≤ celui du don obtenu »)', () => {
    for (const echelon of echelonsDeDon(niveauMax())) {
      expect(plafondDuTrocDeDon(echelon)).toBe(echelon)
    }
  })
})

describe('D18 — le prix d’un achat XP troqué en don', () => {
  it('c’est le coût du moins cher des achats de capacité du catalogue', () => {
    const couts = listeAchats()
      .filter((a) => effetAchat(a.achat).type === 'capacite')
      .map((a) => a.cout_xp)
    expect(couts.length).toBeGreaterThan(0)
    expect(coutDunDonTroque()).toBe(Math.min(...couts))
  })
})
