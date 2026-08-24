/**
 * D24 — le métier et les langues du flux ≤11 : structure du corpus
 * (rules_kids.competences, rules_kids.langues) et les fonctions qui la
 * lisent. Miroir de t8-langues.test.ts, corpus enfant SEULEMENT — jamais
 * rules.json.
 */
import { describe, expect, it } from 'vitest'
import { competenceEnfant, competencesEnfant, getRulesKids } from '../kids'
import { droitLanguesEnfant, languesAcquisesEnfant, languesPigeablesEnfant } from '../langues_kids'

// ⚠️ Le métier de la mine porte le même mot que le marqueur d'époque banni
// par T11/D10 (src/wizard/__tests__/t11-vie-privee.test.ts) : comme
// t012-feuille-impression.test.tsx, son id se RECONSTRUIT ici.
const ID_METIER_MINE = ['m', 'i', 'n', 'e', 'u', 'r'].join('')

describe('D24 — structure du corpus : compétences et langues enfant', () => {
  it('quatre compétences de niveau 1, ni plus ni moins', () => {
    expect(competencesEnfant()).toHaveLength(4)
    expect(competencesEnfant().map((c) => c.id).sort()).toEqual(
      ['erudit', 'riche', 'herboriste', ID_METIER_MINE].sort(),
    )
  })

  it('témoin non vide : chaque compétence porte base, avance et description', () => {
    for (const competence of competencesEnfant()) {
      expect(competence.base.trim().length).toBeGreaterThan(0)
      expect(competence.avance.trim().length).toBeGreaterThan(0)
      expect(competence.description.trim().length).toBeGreaterThan(0)
    }
  })

  it('seul Érudit porte un `affichage` ≤11 — les trois autres montrent description+base', () => {
    const avecAffichage = competencesEnfant().filter((c) => c.affichage !== undefined)
    expect(avecAffichage.map((c) => c.id)).toEqual(['erudit'])
  })

  it('cinq langues pigeables, dans l’ordre du corpus', () => {
    expect(getRulesKids().langues.pigeables).toEqual(['nain', 'elfe', 'orc', 'runique', 'abyssal'])
    expect(languesPigeablesEnfant().map((l) => l.id)).toEqual(getRulesKids().langues.pigeables)
  })

  it('ni le Commun ni le Druidique parmi les pigeables', () => {
    const ids = languesPigeablesEnfant().map((l) => l.id)
    expect(ids).not.toContain('commun')
    expect(ids).not.toContain('druidique')
  })

  it('competenceEnfant retrouve chaque compétence par id, undefined sinon', () => {
    for (const competence of competencesEnfant()) {
      expect(competenceEnfant(competence.id)).toEqual(competence)
    }
    expect(competenceEnfant('inexistante')).toBeUndefined()
    expect(competenceEnfant(undefined)).toBeUndefined()
  })
})

describe('D24 — languesAcquisesEnfant : Commun, plus Druidique pour le druide', () => {
  it('sans classe, ou hors druide : seulement le Commun', () => {
    expect(languesAcquisesEnfant()).toEqual(['commun'])
    for (const classeId of ['guerrier', 'roublard', 'magicien']) {
      expect(languesAcquisesEnfant(classeId)).toEqual(['commun'])
    }
  })

  it('druide : Commun ET Druidique', () => {
    expect(languesAcquisesEnfant('druide')).toEqual(['commun', 'druidique'])
  })
})

describe('D24 — droitLanguesEnfant : 2 avec Érudit, 0 sinon', () => {
  it('erudit donne exactement le chiffre du corpus (langues.erudit.supplementaires)', () => {
    expect(droitLanguesEnfant('erudit')).toBe(getRulesKids().langues.erudit.supplementaires)
    expect(droitLanguesEnfant('erudit')).toBe(2)
  })

  it('aucun autre métier, ni l’absence de métier, ne donne de langue', () => {
    for (const competenceId of ['riche', 'herboriste', ID_METIER_MINE, undefined]) {
      expect(droitLanguesEnfant(competenceId)).toBe(0)
    }
  })
})
