/**
 * Talents : droits de dons et de compétences.
 *
 * D5 : les droits viennent de la table d'évolution (niveau 1), de la table
 * cumulative des caractéristiques (A4) et des achats d'héritage — tous lus
 * de rules.json. Aucun « 3 par défaut » (bug Manus #3).
 */
import { getRules, type Artisanat, type CompetenceSimple, type Don } from './load'
import { artisanatsDisponibles, type TrancheAge } from './age'
import { compteAchats } from './heritage'
import { competencesCumulees, donsCumules } from './niveau'

function palierEsprit(esprit: number) {
  return getRules().caracteristiques.table_cumulative.esprit[String(esprit)]
}

/** Dons du fichier. */
export function listeDons(): Don[] {
  return getRules().dons.liste
}

/**
 * Droit de dons = dons CUMULÉS jusqu'au niveau du personnage (table
 * d'évolution) + dons de la table cumulative d'Esprit + achats « +1 Don ».
 * Sans niveau donné, c'est le niveau minimum de la table (D12 : défaut 1).
 */
export function droitDons(
  esprit: number,
  achats?: Readonly<Record<string, number>>,
  niveau?: number,
): number {
  const palier = palierEsprit(esprit)
  return donsCumules(niveau) + (palier ? palier.dons : 0) + compteAchats(achats, 'don')
}

/**
 * Dons consommés : un cumulable pris ×n consomme n droits ; un don non
 * cumulable ne peut être pris qu'une fois.
 */
export function consommationDons(dons: Readonly<Record<string, number>>): number {
  return Object.values(dons).reduce((somme, n) => somme + n, 0)
}

/** Refus sur la sélection de dons (vide = valide, hors compte de droits). */
export function refusDons(dons: Readonly<Record<string, number>>): string[] {
  const refus: string[] = []
  const catalogue = listeDons()
  for (const [id, n] of Object.entries(dons)) {
    const don = catalogue.find((d) => d.id === id)
    if (!don) {
      refus.push(`don inconnu : ${id}`)
    } else if (n > 1 && !don.cumulable) {
      refus.push(`« ${don.nom} » n'est pas cumulable`)
    } else if (n < 1) {
      refus.push(`compte invalide : ${id}`)
    }
  }
  return refus
}

/**
 * Droit de compétences = compétences CUMULÉES jusqu'au niveau du personnage
 * + achats « +1 Compétence ». Quelles lignes portent une compétence, c'est la
 * table qui le dit, pas ce module.
 */
export function droitCompetences(
  achats?: Readonly<Record<string, number>>,
  niveau?: number,
): number {
  return competencesCumulees(niveau) + compteAchats(achats, 'competence')
}

export function listeCompetencesSimples(): CompetenceSimple[] {
  return getRules().competences.simples
}

/** Maximum d'artisanats par personnage, lu du fichier. */
export function maxArtisanats(): number {
  return getRules().competences.artisanats.max_par_personnage
}

/** Artisanats accessibles selon la tranche d'âge (gate D10, via age.ts). */
export function artisanatsPour(tranche: TrancheAge): Artisanat[] {
  return artisanatsDisponibles(tranche)
}

/** Nombre d'artisanats dans une sélection de compétences. */
export function artisanatsChoisis(comps: readonly string[]): string[] {
  const ids = new Set(getRules().competences.artisanats.liste.map((a) => a.id))
  return comps.filter((id) => ids.has(id))
}

/**
 * Refus sur la sélection de compétences : id inconnu, doublon, plus d'un
 * artisanat (max lu du fichier), artisanat hors tranche autorisée.
 */
export function refusCompetences(
  comps: readonly string[],
  tranche?: TrancheAge,
): string[] {
  const refus: string[] = []
  const simples = new Set(listeCompetencesSimples().map((c) => c.id))
  const artisanats = new Set(getRules().competences.artisanats.liste.map((a) => a.id))
  const vus = new Set<string>()
  for (const id of comps) {
    if (vus.has(id)) refus.push(`doublon : ${id}`)
    vus.add(id)
    if (!simples.has(id) && !artisanats.has(id)) refus.push(`compétence inconnue : ${id}`)
  }
  const choisis = artisanatsChoisis(comps)
  if (choisis.length > maxArtisanats()) {
    refus.push(`plus de ${maxArtisanats()} artisanat`)
  }
  if (tranche && choisis.length > 0) {
    const autorises = new Set(artisanatsPour(tranche).map((a) => a.id))
    for (const id of choisis) {
      if (!autorises.has(id)) refus.push(`artisanat non disponible pour cette tranche : ${id}`)
    }
  }
  return refus
}
