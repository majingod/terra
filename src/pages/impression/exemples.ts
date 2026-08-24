/**
 * Les fiches d'EXEMPLE de la feuille imprimée — celles des 8 aperçus et des
 * gates du lot.
 *
 * ⛔ Aucun vrai nom : le dépôt est public. Le nom du personnage est
 * manifestement fictif et se DÉDUIT du nom de la classe ; le nom du joueur,
 * lui, reste VIDE — D25 lui a donné un champ (`nomDuJoueur`), et ce module ne
 * le remplit jamais : les aperçus gardent la case vide, à remplir au crayon.
 * Une gate du lot le vérifie.
 *
 * D5 : rien n'est recopié du Tome. Les capacités, les achats, la race et le
 * niveau se déduisent du corpus par les fonctions du métier — la fabrique
 * de fiche complète du dépôt (`aide-fiche-complete`) fait déjà ce travail,
 * on ne l'écrit pas une deuxième fois.
 *
 * Ce module n'est importé ni par l'app ni par une route : seuls les tests et
 * `scripts/generer-apercus-feuilles.mjs` s'en servent.
 */
import { branchesDe } from '../../rules/branches'
import { listeAchats } from '../../rules/heritage'
import { classeSquelette } from '../../rules/stats'
import { ficheComplete, historiqueJusquA } from '../../wizard/__tests__/aide-fiche-complete'
import type { FicheCreation } from '../../wizard/types'

/** Le niveau des fiches d'exemple : assez haut pour montrer des acquis. */
export const NIVEAU_EXEMPLE = 3

/**
 * Un choix de capacité par échelon, pioché dans une voie DIFFÉRENTE à chaque
 * fois : la feuille montre alors que le personnage pige dans plusieurs voies
 * (D16), et le Surligné se lit sur les trois colonnes.
 */
function capacitesParNiveau(classeId: string, niveau: number): Record<string, string> {
  const voies = branchesDe(classeId)
  const choix: Record<string, string> = {}
  for (let n = 1; n <= niveau; n += 1) {
    const voie = voies[(n - 1) % voies.length]
    const capacite = voie?.capacites.find((c) => c.niveau === n)
    if (capacite) choix[String(n)] = capacite.id
  }
  return choix
}

/** Les achats d'héritage les moins chers, dans la limite du budget donné. */
function achatsDansLeBudget(budget: number): Record<string, number> {
  const achats: Record<string, number> = {}
  let reste = budget
  for (const avantage of [...listeAchats()].sort((a, b) => a.cout_xp - b.cout_xp)) {
    if (avantage.cout_xp > reste) break
    achats[avantage.achat] = 1
    reste -= avantage.cout_xp
  }
  return achats
}

/** XP permanent du joueur d'exemple — de quoi montrer deux achats cochés. */
const XP_PERMANENT_EXEMPLE = 2

/**
 * La fiche d'exemple d'une classe : niveau 3, une capacité par échelon prise
 * dans trois voies, les dons / compétences / langues de ses droits, et deux
 * achats d'héritage payés par son XP permanent.
 */
export function ficheExemple(classeId: string): FicheCreation {
  const classe = classeSquelette(classeId)
  if (!classe) throw new Error(`classe inconnue : ${classeId}`)
  const fiche = ficheComplete(
    classeId,
    NIVEAU_EXEMPLE,
    capacitesParNiveau(classeId, NIVEAU_EXEMPLE),
    `Exemple ${classe.nom}`,
  )
  return {
    ...fiche,
    xpPerm: XP_PERMANENT_EXEMPLE,
    achats: achatsDansLeBudget(XP_PERMANENT_EXEMPLE),
  }
}

/**
 * La jumelle : une fiche qui SORT de la création, sans rien de choisi. Seuls
 * ses acquis de création s'y surlignent — sa race, ses capacités de base et
 * les langues que la race (et la classe) lui donnent d'office.
 */
export function ficheDeCreation(classeId: string): FicheCreation {
  const { faction, race, trancheAge } = ficheComplete(classeId, 1, {})
  return {
    trancheAge,
    faction,
    race,
    classe: classeId,
    historique: historiqueJusquA(1),
    nom: 'Exemple',
  }
}
