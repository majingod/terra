/**
 * Bassin des achats « +1 Capacité de niveau N » — comportement de la
 * maquette A v3 validée : capacités de niveau N de TA classe, toutes voies
 * confondues, SAUF la capacité de niveau 1 de ta propre voie (tu l'as déjà
 * d'office). Chaque entrée porte le nom de sa voie pour l'affichage
 * « voie · capacité ».
 */
import { branchesDe } from '../rules/branches'
import type { Capacite } from '../rules/load'

export interface CapaciteDeBassin extends Capacite {
  voieId: string
  voieNom: string
}

export function bassinCapacites(
  classeId: string | undefined,
  voieId: string | undefined,
  niveau: number,
): CapaciteDeBassin[] {
  if (!classeId) return []
  return branchesDe(classeId)
    .flatMap((branche) =>
      branche.capacites.map((capacite) => ({
        ...capacite,
        voieId: branche.id,
        voieNom: branche.nom,
      })),
    )
    .filter(
      (capacite) =>
        capacite.niveau === niveau &&
        !(niveau === 1 && voieId !== undefined && capacite.voieId === voieId),
    )
}

export function capaciteParId(
  classeId: string | undefined,
  id: string,
): CapaciteDeBassin | undefined {
  if (!classeId) return undefined
  return branchesDe(classeId)
    .flatMap((branche) =>
      branche.capacites.map((capacite) => ({
        ...capacite,
        voieId: branche.id,
        voieNom: branche.nom,
      })),
    )
    .find((capacite) => capacite.id === id)
}
