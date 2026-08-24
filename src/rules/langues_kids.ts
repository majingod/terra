/**
 * Langues du flux ≤11 (D24) — miroir de rules/langues.ts, lu SEULEMENT de
 * rules_kids.json. Les deux corpus ne se mélangent jamais : ce module
 * n'importe rien de rules.json ni de ./load, et rules/langues.ts n'importe
 * rien d'ici (Lot C).
 */
import { getRulesKids, type LangueEnfant } from './kids'

/**
 * Mêmes noms que rules/langues.ts (LANGUE_DRUIDES, CLASSE_DRUIDE) : la
 * duplication est volontaire. Les deux modules lisent des corpus distincts,
 * sans import croisé — recopier la constante coûte moins que la partager au
 * prix d'un import entre les deux mondes.
 */
const LANGUE_DRUIDES = 'druidique'
const CLASSE_DRUIDE = 'druide'
const COMPETENCE_ERUDIT = 'erudit'

/** Langues acquises d'office : le Commun, plus Druidique si druide. */
export function languesAcquisesEnfant(classeId?: string): string[] {
  const acquises = [...getRulesKids().langues.depart]
  if (classeId === CLASSE_DRUIDE && !acquises.includes(LANGUE_DRUIDES)) {
    acquises.push(LANGUE_DRUIDES)
  }
  return acquises
}

/** Les langues pigeables au choix, dans l'ordre du corpus (rules_kids.langues.pigeables). */
export function languesPigeablesEnfant(): LangueEnfant[] {
  const liste = getRulesKids().langues.liste
  return getRulesKids()
    .langues.pigeables.map((id) => liste.find((langue) => langue.id === id))
    .filter((langue): langue is LangueEnfant => langue !== undefined)
}

/** Droit de langues au choix : 2 avec Érudit (rules_kids.langues.erudit.supplementaires), sinon 0. */
export function droitLanguesEnfant(competenceId?: string): number {
  return competenceId === COMPETENCE_ERUDIT ? getRulesKids().langues.erudit.supplementaires : 0
}
