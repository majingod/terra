/**
 * Fabrique de fiche COMPLÈTE et valide, pour les gates qui ont besoin d'un
 * personnage entier (D16 : « une fiche qui pige dans deux voies valide »).
 *
 * D5 : rien n'est recopié du Tome ici. La faction, la race, la répartition
 * des caractéristiques, les dons, les compétences et les langues sont tous
 * DÉDUITS de rules.json et des droits que les modules de règles calculent.
 * Si le fichier bouge, cette fabrique suit — elle ne mentira pas.
 */
import { getRules } from '../../rules/load'
import { droitLangues, languesProposables } from '../../rules/langues'
import { normaliserNiveau, pointsCaracCumules } from '../../rules/niveau'
import { classeSquelette, racesPourFaction, valeurCarac } from '../../rules/stats'
import { droitCompetences, droitDons, listeCompetencesSimples, listeDons } from '../../rules/talents'
import { trancheQuiContinue } from '../validation'
import type { FicheCreation } from '../types'

/** Répartit N points sur p/r/e sans dépasser le plafond de création. */
function repartirExtras(base: { p: number; r: number; e: number }, points: number) {
  const max = getRules().caracteristiques.creation.max
  const extras = { p: 0, r: 0, e: 0 }
  for (let reste = points; reste > 0; reste--) {
    const cible = (['p', 'r', 'e'] as const)
      .filter((c) => base[c] + extras[c] < max)
      .sort((a, b) => base[a] + extras[a] - (base[b] + extras[b]))[0]
    if (!cible) throw new Error('plafond de caractéristique atteint : fiche impossible')
    extras[cible] += 1
  }
  return extras
}

/**
 * Une fiche entière et valide pour la classe et les capacités données.
 * `capNiveaux` est passé tel quel : c'est LUI que la gate met à l'épreuve.
 */
export function ficheComplete(
  classeId: string,
  niveau: number,
  capNiveaux: Record<string, string>,
  nom = 'Bob',
): FicheCreation {
  const classe = classeSquelette(classeId)
  if (!classe) throw new Error(`classe inconnue : ${classeId}`)
  const faction =
    classe.faction === 'toute' ? getRules().factions.liste[0].id : classe.faction
  // Une race SANS bonus au choix : l'étape Camp n'exige alors aucun sous-choix.
  const race = racesPourFaction(faction).find(
    (r) => !r.bonus.some((b) => typeof b === 'object' && 'choix' in b),
  )
  if (!race) throw new Error(`aucune race sans bonus au choix pour ${faction}`)

  const [p, r, e] = getRules().caracteristiques.creation.repartition
  const base = { p, r, e }
  const extras = repartirExtras(base, pointsCaracCumules(niveau))
  const socle: FicheCreation = {
    trancheAge: trancheQuiContinue(),
    faction,
    race: race.id,
    classe: classeId,
    niveau: normaliserNiveau(niveau),
    capNiveaux,
    caracs: base,
    extras,
    nom,
  }

  const esprit = valeurCarac(socle, 'e')
  const dons: Record<string, number> = {}
  for (const don of listeDons().slice(0, droitDons(esprit, undefined, niveau))) dons[don.id] = 1
  const comps = listeCompetencesSimples()
    .filter((c) => c.id !== 'erudit') // l'Érudit change le droit de langues
    .slice(0, droitCompetences(undefined, niveau))
    .map((c) => c.id)
  const langChoix = languesProposables(race.id, classeId)
    .slice(0, droitLangues(esprit, comps))
    .map((l) => l.id)

  return { ...socle, dons, comps, langChoix }
}
