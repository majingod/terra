/**
 * La boîte de la PAGE — la seule règle de la feuille qui ne peut pas vivre
 * dans `feuille.css` : `@page` s'applique au document entier, jamais à un
 * sous-arbre. Le composant l'injecte donc lui-même, et elle ne vaut que là où
 * il est monté ; les autres écrans de l'app gardent l'impression qu'ils
 * avaient. `scripts/generer-apercus-feuilles.mjs` l'inline de la même source.
 *
 * ⛔ LETTRE (D27-ter, t014) : le GN est au Québec, le papier fait 8½ × 11 po.
 * `size:A4` imposait « ISO A4 » au dialogue d'impression de l'organisateur et
 * la feuille, réglée pour 297 mm de haut, débordait sur le vrai papier.
 */
export const CSS_PAGE = '@page{size:letter portrait;margin:6mm}'
