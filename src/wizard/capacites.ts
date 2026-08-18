/**
 * Bassin des achats « +1 Capacité de niveau N » (arbitrage maquette t004) :
 * capacités de niveau N de TA classe, dans les voies AUTRES que la tienne.
 */
import { branchesDe } from '../rules/branches'
import type { Capacite } from '../rules/load'

export function bassinCapacites(
  classeId: string | undefined,
  voieId: string | undefined,
  niveau: number,
): Capacite[] {
  if (!classeId) return []
  return branchesDe(classeId)
    .filter((branche) => branche.id !== voieId)
    .flatMap((branche) => branche.capacites)
    .filter((capacite) => capacite.niveau === niveau)
}

export function capaciteParId(classeId: string | undefined, id: string): Capacite | undefined {
  if (!classeId) return undefined
  return branchesDe(classeId)
    .flatMap((branche) => branche.capacites)
    .find((capacite) => capacite.id === id)
}
