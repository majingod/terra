/**
 * Le mode d'affichage — sombre (défaut) ou soleil (t017, Q20 A).
 *
 * Retour terrain du 22 août : au GN, en plein soleil, l'écran sombre était
 * illisible. Le joueur bascule ; l'appareil s'en souvient.
 *
 * ⛔ PAS Dexie, exactement comme les épinglés de l'encyclopédie : ce n'est pas
 * une donnée de fiche, aucune migration de schéma n'est due pour ça. Un
 * `localStorage` suffit, et un navigateur qui le refuse (mode privé strict)
 * doit dégrader, pas planter — d'où le try/catch partout.
 *
 * ⛔ Aucune lecture de `prefers-color-scheme` : le sombre EST l'identité
 * visuelle de Terra Mortis (D11). Le clair est un geste du joueur, jamais un
 * réglage d'appareil deviné à sa place.
 *
 * ⚠️ Le mode est POSÉ AVANT le premier rendu par le script inline
 * d'`index.html` — sinon l'app s'allumerait en sombre puis clignerait vers le
 * clair. Ce module et ce script lisent la même clé ; si l'une change, l'autre
 * change avec elle.
 */
export type Mode = 'sombre' | 'soleil'

export const CLE_MODE = 'tm:mode'

/** La classe posée sur `<html>` — le second bloc de jetons s'y accroche. */
export const CLASSE_SOLEIL = 'soleil'

/** Le mode par défaut : l'identité visuelle du jeu (D11). */
export const MODE_PAR_DEFAUT: Mode = 'sombre'

/** Lit le mode mémorisé. Absent, illisible ou invalide → sombre. Jamais d'exception. */
export function lireMode(): Mode {
  try {
    return localStorage.getItem(CLE_MODE) === 'soleil' ? 'soleil' : MODE_PAR_DEFAUT
  } catch {
    return MODE_PAR_DEFAUT
  }
}

/**
 * Pose le mode : la classe sur `<html>` (c'est elle qui change les jetons) ET
 * la mémoire de l'appareil. Un stockage refusé ne retient pas le choix — mais
 * l'écran, lui, bascule quand même le temps de la session.
 */
export function poserMode(mode: Mode): void {
  document.documentElement.classList.toggle(CLASSE_SOLEIL, mode === 'soleil')
  try {
    localStorage.setItem(CLE_MODE, mode)
  } catch {
    /* stockage refusé : le mode vit alors le temps de la session */
  }
}

/**
 * Bascule d'un mode à l'autre et rend celui qui vient d'être posé.
 *
 * Le mode courant se lit de la CLASSE, pas de la mémoire : c'est elle qui dit
 * ce que le joueur a sous les yeux. Les deux disent la même chose au premier
 * rendu (le script inline d'`index.html` pose l'une depuis l'autre) — mais un
 * appareil qui refuse le stockage garde ainsi une bascule qui bascule
 * vraiment, au lieu de retomber sur « soleil » à chaque touche.
 */
export function basculerMode(): Mode {
  const soleil = document.documentElement.classList.contains(CLASSE_SOLEIL)
  const suivant: Mode = soleil ? 'sombre' : 'soleil'
  poserMode(suivant)
  return suivant
}
