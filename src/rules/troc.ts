/**
 * D18 — le troc : un emplacement change de CONTENU, jamais de structure.
 *
 * Deux règles du Tome, écrites dans les capacités de base des classes,
 * vivaient jusqu'ici en texte seul (`echange`) : le guerrier peut prendre un
 * don à la place d'une capacité, le mage une capacité à la place d'un don. Ce
 * module ne les recopie pas — il lit le champ STRUCTURÉ `troc` que
 * rules.json 1.2.0 porte sur la classe.
 *
 * D5 : aucun id de classe n'est écrit ici. Le critère est le champ, pas la
 * liste : une classe qui porte `troc` obtient le troc, quelle qu'elle soit.
 *
 * Le troc ne déplace aucun plafond : l'emplacement de capacité du niveau k
 * reste l'emplacement du niveau k, l'échelon qui donne un don reste cet
 * échelon-là. Seul ce qu'on y range change de nature.
 */
import { getRules } from './load'
import { normaliserNiveau, tableEvolution } from './niveau'

/** Les deux sens de troc, tels que les données les nomment. */
export const TROC_CAPACITE_VERS_DON = 'capacite_vers_don'
export const TROC_DON_VERS_CAPACITE = 'don_vers_capacite'

/** Le sens du troc d'une classe — `undefined` quand elle n'en a pas. */
export function trocDeClasse(classeId?: string): string | undefined {
  if (!classeId) return undefined
  return getRules().classes_squelette.liste.find((c) => c.id === classeId)?.troc
}

/**
 * Cette classe peut-elle mettre un don dans un emplacement de CAPACITÉ ?
 * (Le troc du guerrier — un choix de création, la capacité d'une montée, un
 * achat XP de capacité : partout où l'emplacement existe.)
 */
export function prendUnDonAuLieuDUneCapacite(classeId?: string): boolean {
  return trocDeClasse(classeId) === TROC_CAPACITE_VERS_DON
}

/**
 * Cette classe peut-elle mettre une capacité dans un emplacement de DON ?
 * (Le troc du mage — les dons de la table d'évolution, création comme
 * montée.)
 */
export function prendUneCapaciteAuLieuDUnDon(classeId?: string): boolean {
  return trocDeClasse(classeId) === TROC_DON_VERS_CAPACITE
}

/**
 * Les échelons de la table d'évolution qui DONNENT un don, jusqu'au niveau du
 * personnage. Ce sont les seuls emplacements que le mage peut troquer : le
 * don d'Esprit et le « +1 Don » d'héritage ne viennent pas de la table (et le
 * second porte d'ailleurs sa propre restriction dans les données).
 *
 * D5 : ni « 1, 3, 5 » ni le rythme des dons ne sont écrits ici — ils se
 * lisent de la table.
 */
export function echelonsDeDon(niveau?: number): number[] {
  const plafond = normaliserNiveau(niveau)
  return tableEvolution()
    .filter((ligne) => ligne.niv <= plafond && ligne.dons > 0)
    .map((ligne) => ligne.niv)
}

/**
 * Le plafond de niveau d'une capacité prise à la place du don de l'échelon N :
 * « de niveau équivalent ou inférieur au don obtenu » — donc N lui-même.
 * La fonction existe pour que ce plafond ait UN seul nom dans l'app.
 */
export function plafondDuTrocDeDon(echelon: number): number {
  return echelon
}
