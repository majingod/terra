/**
 * Retrait et remise d'une fiche — lot « corbeille des fiches ».
 *
 * ⛔ Rien ici n'efface. Une fiche retirée reste dans `db.personnages` ; seul le
 * champ non indexé `retireeLe` est écrit. Il n'y a volontairement AUCUN
 * `db.personnages.delete()` dans ce module, ni ailleurs dans l'app : la fiche
 * vit sur l'appareil du joueur, hors réseau, sans sauvegarde serveur, et un
 * effacement y serait définitif.
 *
 * `updatedAt` n'est jamais touché : c'est la clé de tri de l'accueil, et une
 * fiche remise doit revenir à sa place exacte, pas remonter en tête.
 */
import { db, type Personnage } from './index'

/** Retire une fiche de la liste principale. N'écrit que `retireeLe`. */
export async function retirerFiche(id: number, maintenant = Date.now()): Promise<void> {
  await db.personnages.update(id, { retireeLe: maintenant })
}

/**
 * Remet une fiche dans la liste principale.
 * Passer `undefined` à Dexie supprime la clé de l'enregistrement : la fiche
 * redevient exactement ce qu'elle était avant le retrait.
 */
export async function remettreFiche(id: number): Promise<void> {
  await db.personnages.update(id, { retireeLe: undefined })
}

/** Une fiche est active tant qu'aucun retrait n'a été horodaté. */
export function estRetiree(p: Personnage): boolean {
  return p.retireeLe !== undefined
}

/**
 * Sépare une liste déjà triée en fiches actives et fiches retirées, en
 * mémoire, **en préservant l'ordre d'entrée** dans les deux sous-listes.
 */
export function separerFiches(personnages: Personnage[]): {
  actives: Personnage[]
  retirees: Personnage[]
} {
  return {
    actives: personnages.filter((p) => !estRetiree(p)),
    retirees: personnages.filter((p) => estRetiree(p)),
  }
}
