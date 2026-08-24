/**
 * Le vrai nom du joueur (D25) — la seule donnée nominative que l'app stocke.
 *
 * Une famille imprime trois feuilles de personnage : sans ce champ, impossible
 * de savoir laquelle est à qui sans l'écrire au crayon. Le joueur peut donc le
 * saisir, et il vit alors sur l'appareil, sur la feuille imprimée et dans
 * l'export JSON — **jamais en ligne, jamais dans le dépôt**.
 *
 * Il est TOUJOURS optionnel : jamais exigé, jamais pré-rempli. D'où la règle de
 * normalisation qui vit ici et nulle part ailleurs — une saisie vide (ou faite
 * de blancs) ne laisse pas `''` en magasin, elle laisse la clé ABSENTE. Sans
 * ça, un aller-retour saisie → effacement laisserait derrière lui une chaîne
 * vide, c'est-à-dire un champ « rempli de rien » impossible à distinguer d'un
 * champ jamais rempli.
 */

/** La saisie, débarrassée de ses blancs — ou `undefined` s'il n'en reste rien. */
export function normaliserNomDuJoueur(saisie: string | undefined | null): string | undefined {
  const propre = (saisie ?? '').trim()
  return propre === '' ? undefined : propre
}

/**
 * Le champ tel qu'il entre dans un enregistrement : la clé portant la valeur
 * trimée, ou RIEN du tout.
 *
 * ⚠️ On ne peut pas écrire `{ nomDuJoueur: undefined }` et croire la clé
 * absente : le clone structuré d'IndexedDB garde les propriétés propres dont la
 * valeur est `undefined`. Seul le spread conditionnel garantit l'absence.
 */
export function champNomDuJoueur(saisie: string | undefined | null): { nomDuJoueur?: string } {
  const nom = normaliserNomDuJoueur(saisie)
  return nom === undefined ? {} : { nomDuJoueur: nom }
}

/**
 * La fiche du wizard SANS le nom du joueur.
 *
 * ⚠️ ÉCART RAPPORTÉ (voir la PR). Le champ vit sur les deux types — sur
 * `FicheCreation`, parce que c'est par le wizard qu'il se saisit et par le
 * brouillon qu'il survit à un rechargement en pleine création ; et sur
 * `Personnage`, parce que c'est là qu'il vit sur l'enregistrement. Mais la
 * fiche du wizard se recopie ENTIÈRE sous `creation` à l'enregistrement : sans
 * ce retrait, le nom serait stocké DEUX fois, et les deux copies divergeraient
 * aussitôt —
 *   · celle de `creation` garderait la saisie NON trimée ;
 *   · surtout, effacer son nom depuis la fiche ne retirerait que celle du
 *     haut : la seconde survivrait en base et repartirait dans l'export JSON.
 * Un joueur qui efface son nom doit voir son nom effacé. Sur l'enregistrement,
 * le nom n'a donc qu'un seul domicile : `Personnage.nomDuJoueur`.
 */
export function sansNomDuJoueur<T extends { nomDuJoueur?: string }>(fiche: T): T {
  if (fiche.nomDuJoueur === undefined) return fiche
  const { nomDuJoueur: _retire, ...reste } = fiche
  return reste as T
}
