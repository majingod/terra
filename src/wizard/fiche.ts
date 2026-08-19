/**
 * Aides d'affichage de la fiche (étape 9 et page /fiche/:id).
 *
 * D8-bis : la version des règles affichée est TOUJOURS meta.version lue du
 * fichier via getVersion() — jamais une constante recopiée (T6).
 */
import { getVersion } from '../rules/load'

/** Texte affiché sur la fiche, ex. « Règles v1.1.0 » — version lue du fichier. */
export function texteVersionRegles(): string {
  return `Règles v${getVersion()}`
}
