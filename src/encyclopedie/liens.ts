/**
 * Liens croisés — toucher un mot du Tome qui NOMME une autre section y mène.
 *
 * ⛔ Zéro mot en dur : la table des cibles est DÉRIVÉE du modèle au
 * chargement (titres des sections de règles, noms des dons). Si le corpus
 * gagne une section demain, elle devient une cible sans qu'on touche au code.
 *
 * Règles (D9-ter) : correspondance MOT ENTIER, insensible à la casse,
 * longueur ≥ 5 caractères, au plus UN lien par corps d'accordéon, jamais dans
 * un titre, jamais vers sa propre section.
 */
import type { Entree, Onglet, OngletId } from './modele'

/** Longueur minimale d'un titre pour devenir une cible : sous ça, trop de bruit. */
export const LONGUEUR_MINIMALE = 5

export interface Cible {
  /** Le titre qui fait le lien, tel que le corpus l'écrit. */
  titre: string
  /** L'entrée visée. */
  id: string
  onglet: OngletId
}

/** Les onglets dont les entrées sont des cibles de lien. */
const ONGLETS_CIBLES: OngletId[] = ['regles', 'dons']

/**
 * La table des cibles, tirée du modèle. Triée du titre le plus long au plus
 * court : « Armes de corps à corps » l'emporte sur « Armes ».
 */
export function ciblesDe(onglets: readonly Onglet[]): Cible[] {
  const cibles: Cible[] = []
  for (const onglet of onglets) {
    if (!ONGLETS_CIBLES.includes(onglet.id)) continue
    for (const groupe of onglet.groupes) {
      for (const entree of groupe.entrees) {
        if (entree.titre.length < LONGUEUR_MINIMALE) continue
        cibles.push({ titre: entree.titre, id: entree.id, onglet: onglet.id })
      }
    }
  }
  return cibles.sort((a, b) => b.titre.length - a.titre.length)
}

/** Les caractères qui font un mot, accents compris. */
const HORS_MOT = '[^\\wÀ-ÿ]'

function echapper(motif: string): string {
  return motif.replace(/[.*+?^$()|[\]{}\\]/g, '\\$&')
}

export interface Coupure {
  avant: string
  lien: string
  cible: Cible
  apres: string
}

/**
 * Cherche dans un texte la PREMIÈRE cible utilisable (hors `exclue`), et rend
 * la coupure à faire. `null` quand rien ne correspond.
 */
export function premierLien(
  texte: string,
  cibles: readonly Cible[],
  exclue: string | undefined,
): Coupure | null {
  let meilleure: Coupure | null = null
  let meilleurIndex = Number.POSITIVE_INFINITY
  for (const cible of cibles) {
    if (cible.id === exclue) continue
    const motif = new RegExp(`(^|${HORS_MOT})(${echapper(cible.titre)})(?=$|${HORS_MOT})`, 'i')
    const trouve = texte.match(motif)
    if (!trouve || trouve.index === undefined) continue
    const debut = trouve.index + trouve[1].length
    if (debut < meilleurIndex) {
      meilleurIndex = debut
      meilleure = {
        avant: texte.slice(0, debut),
        lien: texte.slice(debut, debut + trouve[2].length),
        cible,
        apres: texte.slice(debut + trouve[2].length),
      }
    }
  }
  return meilleure
}

/** Un compteur de liens : au plus UN par corps d'accordéon. */
export interface BudgetDeLiens {
  restant: number
  exclue?: string
}

export function budgetDeCorps(exclue?: string): BudgetDeLiens {
  return { restant: 1, exclue }
}

/** Les entrées de tous les onglets, à plat — pour retrouver une cible. */
export function indexDesEntrees(onglets: readonly Onglet[]): Map<string, Entree> {
  const index = new Map<string, Entree>()
  for (const onglet of onglets) {
    for (const groupe of onglet.groupes) {
      for (const entree of groupe.entrees) index.set(entree.id, entree)
    }
  }
  return index
}
