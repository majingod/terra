/**
 * Bassin des achats « +1 Capacité de niveau N » — comportement de la
 * maquette A v3 validée : capacités de niveau N de TA classe, toutes voies
 * confondues, SAUF celles que ta voie te donne DÉJÀ D'OFFICE. Chaque entrée
 * porte le nom de sa voie pour l'affichage « voie · capacité ».
 *
 * D12 : « déjà d'office » se lit au niveau du personnage — au niveau N, ta
 * voie te donne ses échelons ≤ N. Au niveau 1 (défaut), c'est exactement la
 * règle d'avant : seul l'échelon 1 de ta propre voie sort du bassin.
 */
import { branchesDe } from '../rules/branches'
import { capacitesAcquises } from '../rules/niveau'
import type { Capacite } from '../rules/load'

export interface CapaciteDeBassin extends Capacite {
  voieId: string
  voieNom: string
}

function toutesDeLaClasse(classeId: string): CapaciteDeBassin[] {
  return branchesDe(classeId).flatMap((branche) =>
    branche.capacites.map((capacite) => ({
      ...capacite,
      voieId: branche.id,
      voieNom: branche.nom,
    })),
  )
}

export function bassinCapacites(
  classeId: string | undefined,
  voieId: string | undefined,
  niveauAchat: number,
  niveauPersonnage?: number,
): CapaciteDeBassin[] {
  if (!classeId) return []
  const dOffice = new Set(capacitesAcquises(classeId, voieId, niveauPersonnage).map((c) => c.id))
  return toutesDeLaClasse(classeId).filter(
    (capacite) => capacite.niveau === niveauAchat && !dOffice.has(capacite.id),
  )
}

export function capaciteParId(
  classeId: string | undefined,
  id: string,
): CapaciteDeBassin | undefined {
  if (!classeId) return undefined
  return toutesDeLaClasse(classeId).find((capacite) => capacite.id === id)
}
