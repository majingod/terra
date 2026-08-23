/**
 * D23 — la suppression d'une fiche devient DÉFINITIVE. D26 — les fiches
 * retirées d'avant reviennent dans la liste.
 *
 * ⭐ Doctrine de l'effacement (D23, arbitrage Fred) : `db.personnages.delete()`
 * vit dans CE module, et nulle part ailleurs dans l'app. La garde d'avant
 * (« aucun effacement, jamais » — l'ancien `src/db/retrait.ts`) est levée en
 * connaissance de cause : une fiche vit sur l'appareil du joueur, hors réseau,
 * sans sauvegarde serveur, et une corbeille qui n'efface rien a fait croire à
 * l'organisateur qu'il avait supprimé des fiches qui étaient toutes encore là.
 * La garde n'est donc pas supprimée, elle est DÉPLACÉE : l'effacement est
 * nommé, tenu à un seul endroit, et n'est atteignable que par le parcours à
 * deux gestes de l'écran d'accueil (panneau nommé + maintien de 1 500 ms) ou
 * par celui de la fiche d'ancienne version (D20 ③). Une gate exécutable le
 * prouve — voir `src/db/__tests__/d23-suppression.test.ts`.
 *
 * ⛔ Rien ici ne s'exécute tout seul sur un geste implicite : `balayerFichesRetirees`
 * n'efface AUCUN enregistrement — c'est une remise en liste, pas une purge.
 */
import { db } from './index'

/**
 * Efface une fiche de l'appareil. Il n'y a pas de retour en arrière : l'appelant
 * doit avoir obtenu les deux gestes du joueur, et lui avoir offert l'export.
 */
export async function supprimerFicheDefinitivement(id: number): Promise<void> {
  await db.personnages.delete(id)
}

/**
 * D26 — balayage des fiches héritées de la corbeille.
 *
 * Après ce lot, plus rien n'écrit `retireeLe` : toute fiche qui le porte vient
 * d'une version d'avant D23. Elle revient donc dans la liste principale, sans
 * flag, sans migration Dexie (le champ n'est pas indexé — D7 n'est pas rouvert)
 * et sans qu'un seul enregistrement soit effacé.
 *
 * ⛔ `updatedAt` n'est jamais touché : c'est la clé de tri de l'accueil, et une
 * fiche revenue doit reprendre sa place exacte, pas remonter en tête.
 *
 * Idempotent : au second passage il n'y a plus rien à remonter, et il rend 0.
 *
 * @returns le nombre de fiches remontées dans la liste par CE passage.
 */
export async function balayerFichesRetirees(): Promise<number> {
  // Lecture en mémoire : `retireeLe` n'est pas indexé, et il y a 30 à 50 fiches.
  const aRemonter = (await db.personnages.toArray()).filter((p) => p.retireeLe !== undefined)

  for (const fiche of aRemonter) {
    // Passer `undefined` à Dexie retire la clé de l'enregistrement : la fiche
    // redevient exactement ce qu'elle était avant son retrait.
    await db.personnages.update(fiche.id as number, { retireeLe: undefined })
  }

  return aRemonter.length
}
