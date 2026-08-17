/**
 * Gate d'âge (D10).
 *
 * La seule donnée d'âge qui existe dans l'app est une TRANCHE ('≤11' | '12+').
 * Aucune date de naissance, aucun âge exact. Aucun paramètre ni marqueur
 * « mineur » : la tranche interdite est lue dans rules.json
 * (competences.artisanats.interdit_tranche), pas recopiée ici.
 */
import { getRules, type Artisanat } from './load'

export type TrancheAge = '≤11' | '12+'

export const TRANCHES_AGE: readonly TrancheAge[] = ['≤11', '12+']

/**
 * Artisanats accessibles pour une tranche d'âge, sur les MÊMES données de
 * base : la tranche interdite en rend 0, l'autre les rend tous.
 */
export function artisanatsDisponibles(tranche: TrancheAge): Artisanat[] {
  const artisanats = getRules().competences.artisanats
  if (tranche === artisanats.interdit_tranche) {
    return []
  }
  return artisanats.liste
}
