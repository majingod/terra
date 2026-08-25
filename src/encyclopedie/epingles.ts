/**
 * Les épinglés de l'encyclopédie — ☆ posées sur une section, une capacité ou
 * un objet, retrouvées la veille d'un GN.
 *
 * ⛔ PAS Dexie : ce ne sont pas des données de fiche, aucune migration de
 * schéma n'est due pour ça. Un `localStorage` suffit, et un navigateur qui le
 * refuse (mode privé strict) doit dégrader, pas planter.
 *
 * Les identifiants sont ceux du modèle (`don:courage`, `capacite:druide.
 * chaman.1`…) : dérivés des ids et des titres du corpus, donc stables d'un
 * lot à l'autre.
 */
export const CLE_EPINGLES = 'tm.encyclopedie.epingles'

/** Lit les épinglés dans leur ORDRE d'épinglage. Jamais d'exception. */
export function lireEpingles(): string[] {
  try {
    const brut = localStorage.getItem(CLE_EPINGLES)
    if (!brut) return []
    const lu: unknown = JSON.parse(brut)
    if (!Array.isArray(lu)) return []
    return lu.filter((x): x is string => typeof x === 'string')
  } catch {
    return []
  }
}

/** Écrit les épinglés. Un stockage refusé n'empêche pas l'écran de vivre. */
export function ecrireEpingles(ids: readonly string[]): void {
  try {
    localStorage.setItem(CLE_EPINGLES, JSON.stringify(ids))
  } catch {
    /* stockage refusé : l'épinglage vit alors le temps de la session */
  }
}

/** Bascule une ☆ : ajoutée EN FIN de liste, l'ordre d'épinglage est gardé. */
export function basculer(ids: readonly string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
}

export const CLE_TAILLE = 'tm.encyclopedie.taille'

/** Les trois crans de taille de texte de la maquette v3.1. */
export const CRANS_DE_TAILLE = ['15px', '16.5px', '18.5px'] as const

/** Cran par défaut : celui du milieu, la taille de la maquette. */
export const CRAN_PAR_DEFAUT = 1

export function lireCran(): number {
  try {
    const brut = localStorage.getItem(CLE_TAILLE)
    if (brut === null) return CRAN_PAR_DEFAUT
    const lu = Number(brut)
    return Number.isInteger(lu) && lu >= 0 && lu < CRANS_DE_TAILLE.length ? lu : CRAN_PAR_DEFAUT
  } catch {
    return CRAN_PAR_DEFAUT
  }
}

export function ecrireCran(cran: number): void {
  try {
    localStorage.setItem(CLE_TAILLE, String(cran))
  } catch {
    /* stockage refusé : la taille vit le temps de la session */
  }
}
