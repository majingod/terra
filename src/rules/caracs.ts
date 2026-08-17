/**
 * Répartition des caractéristiques à la création.
 *
 * Les valeurs à placer viennent de rules.json
 * (caracteristiques.creation.repartition) : rien n'est recopié ici.
 */
import { getRules } from './load'

/** Les valeurs exactes à répartir, lues depuis rules.json. */
export function repartitionAttendue(): number[] {
  return [...getRules().caracteristiques.creation.repartition]
}

/**
 * Vrai si et seulement si `valeurs` est exactement le même multi-ensemble que
 * la répartition attendue : mêmes valeurs, mêmes multiplicités, l'ordre étant
 * libre. Un total de points identique ne suffit pas.
 */
export function validerRepartition(valeurs: readonly number[]): boolean {
  const attendu = repartitionAttendue().sort(croissant)
  const donne = [...valeurs].sort(croissant)
  if (attendu.length !== donne.length) {
    return false
  }
  return attendu.every((valeur, index) => valeur === donne[index])
}

function croissant(a: number, b: number): number {
  return a - b
}
