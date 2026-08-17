/**
 * Accès aux branches de classes et à leurs capacités (lot 2 de rules.json).
 * Aucun nom de classe ni de branche n'est écrit ici : tout vient du fichier.
 */
import {
  getRules,
  type Branche,
  type Capacite,
  type CapaciteDeBase,
  type ClasseBranches,
} from './load'

export function classesAvecBranches(): ClasseBranches[] {
  return getRules().branches_de_classes.classes
}

export function idsDeClasses(): string[] {
  return classesAvecBranches().map((classe) => classe.classe_id)
}

/** Les branches (voies) d'une classe. Tableau vide si la classe est inconnue. */
export function branchesDe(classeId: string): Branche[] {
  const classe = classesAvecBranches().find((c) => c.classe_id === classeId)
  return classe ? classe.branches : []
}

/** Les capacités de base d'une classe (hors branches). */
export function capacitesDeBase(classeId: string): CapaciteDeBase[] {
  const classe = classesAvecBranches().find((c) => c.classe_id === classeId)
  return classe ? classe.capacites_de_base : []
}

/** Les capacités d'une branche donnée. */
export function capacitesDe(classeId: string, brancheId: string): Capacite[] {
  const branche = branchesDe(classeId).find((b) => b.id === brancheId)
  return branche ? branche.capacites : []
}

/** Toutes les capacités de branche, toutes classes confondues. */
export function toutesLesCapacites(): Capacite[] {
  return classesAvecBranches().flatMap((classe) =>
    classe.branches.flatMap((branche) => branche.capacites),
  )
}

/** Toutes les capacités de base, toutes classes confondues. */
export function toutesLesCapacitesDeBase(): CapaciteDeBase[] {
  return classesAvecBranches().flatMap((classe) => classe.capacites_de_base)
}
