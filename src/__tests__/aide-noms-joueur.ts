/**
 * Les SEULS noms de joueur qu'un test a le droit d'écrire (D25).
 *
 * ⛔ Le dépôt est PUBLIC, et `nomDuJoueur` est le seul champ de l'app qui porte
 * un vrai nom — celui d'un enfant, la plupart du temps. Aucun vrai nom n'entre
 * donc dans `src/` : ni fixture, ni test, ni exemple. Toute valeur littérale
 * donnée à `nomDuJoueur` quelque part dans `src/` vient d'ici, et la gate G1
 * (`d25-vie-privee-nom-du-joueur.test.ts`) balaye l'arbre pour le prouver.
 *
 * Ces valeurs sont manifestement fictives : elles se lisent comme des
 * étiquettes, pas comme des prénoms. C'est voulu — un prénom plausible
 * d'enfant, même inventé, ressemblerait trop à celui de quelqu'un.
 *
 * Ce fichier n'est pas une suite de tests (`*.test.ts` seulement, cf.
 * vitest.config) : c'est l'aide que les suites importent.
 */
export const NOMS_JOUEUR_FICTIFS = [
  'Joueur Exemple',
  'Parent Exemple',
  'Joueuse Exemple',
] as const

export type NomJoueurFictif = (typeof NOMS_JOUEUR_FICTIFS)[number]

/** Le nom d'exemple par défaut d'un test qui n'en demande pas un en particulier. */
export const NOM_JOUEUR_FICTIF: NomJoueurFictif = NOMS_JOUEUR_FICTIFS[0]

/** Le second, pour les tests qui doivent distinguer deux fiches. */
export const AUTRE_NOM_JOUEUR_FICTIF: NomJoueurFictif = NOMS_JOUEUR_FICTIFS[1]
