/**
 * Aides d'affichage de la fiche (étape 9 et page /fiche/:id).
 *
 * D8-bis : la version des règles affichée est TOUJOURS meta.version lue du
 * fichier via getVersion() — jamais une constante recopiée (T6).
 */
import { getVersion } from '../rules/load'

/** Texte affiché sur la fiche, ex. « Règles v1.0.2 » — version lue du fichier. */
export function texteVersionRegles(): string {
  return `Règles v${getVersion()}`
}

/**
 * A1 (seule exception d'affichage arbitrée) : le Tome écrit « tavernier »
 * dans un verbatim du Marchand — l'app AFFICHE « marchand », le verbatim
 * stocké restant intact pour la gate de fidélité.
 */
export function afficherVerbatim(verbatim: string): string {
  return verbatim.replace(/tavernier/g, 'marchand').replace(/Tavernier/g, 'Marchand')
}
