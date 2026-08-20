/**
 * D16 — les capacités d'une classe se choisissent LIBREMENT dans tout son
 * arbre. La voie n'est pas un enclos : ce n'est pas un choix de création,
 * c'est une étiquette portée par chaque capacité.
 *
 * La règle, arbitrée par l'organisateur : à chaque niveau, le personnage
 * choisit 1 capacité de sa classe — n'importe laquelle des trois voies — de
 * niveau ≤ l'échelon d'acquisition, et jamais deux fois la même.
 *
 * D5 : aucun nom de classe, de voie ni de capacité n'est écrit ici. Les
 * bornes de niveau viennent de la table d'évolution, l'arbre vient de
 * `branches_de_classes` — tout est lu de rules.json.
 */
import { branchesDe } from './branches'
import type { Capacite } from './load'

/** Une capacité de l'arbre, avec l'étiquette de la voie qui la porte. */
export interface CapaciteDeVoie extends Capacite {
  voieId: string
  voieNom: string
}

/** Un choix déjà posé : son id (anti-doublon) et son niveau (critère trié). */
export interface ChoixCapacite {
  id: string
  niveau: number
}

/**
 * Tout l'arbre d'une classe, les trois voies confondues, chaque capacité
 * gardant l'étiquette de sa voie. Tableau vide si la classe est inconnue.
 */
export function capacitesDeClasse(classeId: string | undefined): CapaciteDeVoie[] {
  if (!classeId) return []
  return branchesDe(classeId).flatMap((voie) =>
    [...voie.capacites]
      .sort((a, b) => a.niveau - b.niveau)
      .map((capacite) => ({ ...capacite, voieId: voie.id, voieNom: voie.nom })),
  )
}

/** Une capacité de l'arbre d'une classe, retrouvée par son id. */
export function capaciteDeClasseParId(
  classeId: string | undefined,
  id: string,
): CapaciteDeVoie | undefined {
  return capacitesDeClasse(classeId).find((capacite) => capacite.id === id)
}

/**
 * Le bassin d'un choix : TOUTES les capacités de la classe (les 3 voies) de
 * niveau ≤ le plafond du choix, moins celles qui sont déjà prises — ailleurs
 * dans les niveaux comme en achat d'héritage. L'ordre reste celui de l'arbre
 * (voie par voie, échelon croissant) : l'écran regroupe par voie.
 */
export function capacitesDisponibles(
  classeId: string | undefined,
  niveauMaxDuChoix: number,
  dejaPrises: Iterable<string> = [],
): CapaciteDeVoie[] {
  const prises = new Set(dejaPrises)
  return capacitesDeClasse(classeId).filter(
    (capacite) => capacite.niveau <= niveauMaxDuChoix && !prises.has(capacite.id),
  )
}

/**
 * Le critère de D16 sur une création au niveau N : autant de choix que de
 * niveaux, jamais deux fois la même capacité, et — les choix TRIÉS par niveau
 * croissant — le i-ème choix est de niveau ≤ i.
 *
 * Ce critère trié dit exactement la même chose qu'« un emplacement par
 * niveau, l'emplacement k n'accepte que du niveau ≤ k » : l'un se vérifie sur
 * un ensemble de choix, l'autre se rend à l'écran.
 */
export function choixValides(niveauPerso: number, choix: readonly ChoixCapacite[]): boolean {
  return problemesChoix(niveauPerso, choix).length === 0
}

/** Le même critère, mais qui NOMME ce qui cloche (bandeaux du wizard). */
export function problemesChoix(
  niveauPerso: number,
  choix: readonly ChoixCapacite[],
): string[] {
  const problemes: string[] = []
  if (choix.length !== niveauPerso) {
    problemes.push(`capacités : ${choix.length}/${niveauPerso} choisies`)
  }
  const vus = new Set<string>()
  for (const { id } of choix) {
    if (vus.has(id)) problemes.push(`capacité choisie deux fois : ${id}`)
    vus.add(id)
  }
  const tries = [...choix].sort((a, b) => a.niveau - b.niveau)
  tries.forEach((choisi, index) => {
    if (choisi.niveau > index + 1) {
      problemes.push(
        `capacité de niveau ${choisi.niveau} au rang ${index + 1} : elle dépasse son échelon`,
      )
    }
  })
  return problemes
}
