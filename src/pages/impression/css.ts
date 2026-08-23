/**
 * La boîte de la PAGE — la seule règle de la feuille qui ne peut pas vivre
 * dans `feuille.css` : `@page` s'applique au document entier, jamais à un
 * sous-arbre. Le composant l'injecte donc lui-même, et elle ne vaut que là où
 * il est monté ; les autres écrans de l'app gardent l'impression qu'ils
 * avaient. `scripts/generer-apercus-feuilles.mjs` l'inline de la même source.
 */
export const CSS_PAGE = '@page{size:A4 portrait;margin:6mm}'
