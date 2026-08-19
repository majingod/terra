/**
 * Niveau de départ du personnage (D12 / brief t006).
 *
 * D5 : aucun chiffre de niveau n'est écrit ici. Les bornes (1 et 5), le
 * nombre de dons par échelon et le nombre de compétences viennent tous de
 * `evolution.table` de rules.json ; les capacités acquises viennent du champ
 * `niveau` porté par chaque capacité de branche.
 *
 * Lecture de la table (mesurée v1.0.2) : chaque ligne donne ce que l'échelon
 * AJOUTE. Le niveau N cumule donc les lignes 1..N — d'où `donsCumules`.
 */
import { branchesDe } from './branches'
import { getRules, type Capacite, type LigneEvolution } from './load'

/** La table d'évolution, triée par échelon croissant. */
export function tableEvolution(): LigneEvolution[] {
  return [...getRules().evolution.table].sort((a, b) => a.niv - b.niv)
}

/** Échelons proposés par le wizard, lus de la table (jamais 1..5 en dur). */
export function niveauxPossibles(): number[] {
  return tableEvolution().map((ligne) => ligne.niv)
}

export function niveauMin(): number {
  const niveaux = niveauxPossibles()
  if (niveaux.length === 0) {
    throw new Error("rules.json : table d'évolution vide.")
  }
  return niveaux[0]
}

/** Plafond du wizard : le dernier échelon de la table (arbitrage t005). */
export function niveauMax(): number {
  const niveaux = niveauxPossibles()
  return niveaux[niveaux.length - 1]
}

/** Ce que le Tome dit du delà du plafond — lu du fichier, jamais recopié. */
export function regleAuDelaDuPlafond(): string {
  return getRules().evolution.regles.au_dela_niv5
}

/** Ramène un niveau saisi dans les bornes de la table ; défaut = niveau min. */
export function normaliserNiveau(niveau?: number): number {
  if (niveau === undefined || !Number.isFinite(niveau)) return niveauMin()
  return Math.min(niveauMax(), Math.max(niveauMin(), Math.trunc(niveau)))
}

function cumul(niveau: number, champ: (ligne: LigneEvolution) => number): number {
  return tableEvolution()
    .filter((ligne) => ligne.niv <= niveau)
    .reduce((somme, ligne) => somme + champ(ligne), 0)
}

/** Dons cumulés du niveau 1 au niveau demandé (niveau N ⇒ N dons en v1.0.2). */
export function donsCumules(niveau?: number): number {
  return cumul(normaliserNiveau(niveau), (ligne) => ligne.dons)
}

/** Compétences cumulées du niveau 1 au niveau demandé. */
export function competencesCumulees(niveau?: number): number {
  return cumul(normaliserNiveau(niveau), (ligne) => ligne.competence ?? 0)
}

/**
 * Capacités que la voie donne d'office à ce niveau : tous les échelons ≤ N.
 * Vide sans classe ou sans voie choisie.
 */
export function capacitesAcquises(
  classeId: string | undefined,
  voieId: string | undefined,
  niveau?: number,
): Capacite[] {
  if (!classeId || !voieId) return []
  const plafond = normaliserNiveau(niveau)
  const voie = branchesDe(classeId).find((branche) => branche.id === voieId)
  if (!voie) return []
  return voie.capacites
    .filter((capacite) => capacite.niveau <= plafond)
    .sort((a, b) => a.niveau - b.niveau)
}
