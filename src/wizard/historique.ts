/**
 * D20 — l'historique daté d'un personnage, et le niveau qui s'en dérive.
 *
 * Un personnage doit avoir ÉTÉ niveau 1 avant d'être niveau 2 : la création se
 * fait au niveau 1, puis il monte, un échelon à la fois. Chaque échelon
 * traversé laisse ICI une entrée datée. Le niveau cesse alors d'être un champ
 * saisi — c'est un fait qui se calcule : montées + 1.
 *
 * Pourquoi la date et les points de caractéristique : une règle du Tome en
 * dépend (le don d'Esprit 3 porte le niveau du personnage au moment où Esprit
 * a atteint 3, D19 lot 3). Sans l'historique, ce niveau était introuvable.
 *
 * ⛔ Une seule source. `FicheCreation.niveau` devient un champ d'époque : le
 * code ne l'écrit plus JAMAIS, et ne le lit que sur une fiche d'AVANT D20 —
 * une fiche sans historique, gelée en lecture seule, dont le niveau ne peut
 * plus bouger. Une fiche vivante et une fiche gelée ne peuvent donc pas
 * diverger : l'une n'a pas de champ saisi, l'autre n'a plus de vie.
 *
 * ⚠️ ≤11 : le flux enfant ne passe pas par ici. Chez les enfants chaque
 * échelon donne exactement une capacité — leur historique se DÉDUIT du niveau
 * seul, et ils continuent de le déclarer (`enfant.niveau`).
 */
import { niveauMin, normaliserNiveau } from '../rules/niveau'
import type { CleCarac, EntreeNiveau, FicheCreation } from './types'

/** Les entrées de l'historique, ou une liste vide s'il n'y en a pas. */
export function historiqueDe(fiche: FicheCreation | undefined): EntreeNiveau[] {
  const entrees = fiche?.historique
  return Array.isArray(entrees) ? entrees : []
}

/**
 * Vrai quand la fiche vient d'une version d'AVANT D20 : elle ne porte pas
 * d'historique. C'est LE critère — jamais une liste de versions, jamais une
 * comparaison de numéros. Une fiche enfant n'en est pas une : son flux n'a
 * jamais eu d'historique à porter (⚠️ ≤11 : rien ne change).
 */
export function estAncienneFiche(fiche: FicheCreation | undefined): boolean {
  if (fiche?.enfant) return false
  return !Array.isArray(fiche?.historique)
}

/**
 * Le niveau dérivé de l'historique — montées + 1. `undefined` quand il n'y a
 * pas d'historique : il n'y a alors rien à dériver, et rien à inventer.
 */
export function niveauDerive(fiche: FicheCreation | undefined): number | undefined {
  const entrees = historiqueDe(fiche)
  if (entrees.length === 0) return undefined
  return niveauMin() + (entrees.length - 1)
}

/**
 * LE niveau d'une fiche, pour tout le code qui a besoin d'en connaître un.
 *
 * L'historique fait foi dès qu'il existe — c'est la seule source d'une fiche
 * vivante, et le champ saisi ne peut rien y contredire. Sans historique, la
 * fiche est soit en cours de création (elle n'a rien traversé : niveau
 * minimum, on crée au niveau 1), soit gelée en lecture seule (d'avant D20) —
 * et là son `niveau` archivé, que plus rien ne fait bouger, est la seule
 * vérité qui reste. Les deux cas ne peuvent pas diverger : l'un n'a pas de
 * champ saisi, l'autre n'a plus de vie.
 */
export function niveauCourant(fiche: FicheCreation | undefined): number {
  return niveauDerive(fiche) ?? normaliserNiveau(fiche?.niveau)
}

/**
 * Le niveau d'une fiche GELÉE (sans historique, d'avant D20) : sa seule
 * vérité est le niveau archivé sur l'enregistrement, que plus rien ne fait
 * bouger. `normaliserNiveau` le ramène dans les bornes de la table.
 */
export function niveauArchive(niveau: number | undefined): number {
  return normaliserNiveau(niveau)
}

/** L'entrée de l'échelon demandé — c'est elle qui porte sa date et ses points. */
export function entreeDuNiveau(
  fiche: FicheCreation | undefined,
  niveau: number,
): EntreeNiveau | undefined {
  return historiqueDe(fiche).find((entree) => entree.niveau === niveau)
}

/** Les points de caractéristique posés à cet échelon, par clé de carac. */
export function caracsDuNiveau(
  fiche: FicheCreation | undefined,
  niveau: number,
): Partial<Record<CleCarac, number>> {
  return entreeDuNiveau(fiche, niveau)?.caracs ?? {}
}

/**
 * L'entrée de CRÉATION : le personnage naît au niveau 1, à cet instant. La
 * table ne donne aucun point de caractéristique au premier échelon — l'entrée
 * n'en porte donc aucun, et rien n'est fabriqué pour remplir la case.
 */
export function entreeDeCreation(maintenant: number): EntreeNiveau {
  return { niveau: niveauMin(), le: maintenant }
}

/**
 * L'historique après une montée : l'entrée de l'échelon atteint s'ajoute au
 * bout, avec sa date et les points de caractéristique que CET échelon a
 * donnés (et sur quelle caractéristique le joueur les a posés).
 *
 * Une montée n'écrase jamais une entrée existante : elle en ajoute une.
 */
export function avecMontee(
  fiche: FicheCreation | undefined,
  niveauAtteint: number,
  maintenant: number,
  caracs?: Partial<Record<CleCarac, number>>,
): EntreeNiveau[] {
  const entree: EntreeNiveau = { niveau: niveauAtteint, le: maintenant }
  if (caracs && Object.keys(caracs).length > 0) entree.caracs = caracs
  return [...historiqueDe(fiche), entree]
}
