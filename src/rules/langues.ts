/**
 * Langues (Tome p.7).
 *
 * Les langues acquises viennent de la race (langues_depart) ; le Druidique
 * est acquis d'office par le druide (restriction de la langue dans
 * rules.json : « seuls les druides y ont accès et le possèdent dès le
 * début »). La Langue des morts n'est jamais proposée à la création
 * (restriction : « ne commence pas avec »).
 */
import { getRules, type Langue } from './load'

/** Id de la langue réservée aux druides (restriction lue dans rules.json). */
const LANGUE_DRUIDES = 'druidique'
/** Id de la classe qui la possède dès le début. */
const CLASSE_DRUIDE = 'druide'
/** Id de la langue qu'on « ne commence pas avec » (restriction rules.json). */
const LANGUE_JAMAIS_A_LA_CREATION = 'des_morts'

export function listeLangues(): Langue[] {
  return getRules().langues.liste
}

/** Langues acquises d'office : celles de la race + Druidique si druide. */
export function languesAcquises(raceId?: string, classeId?: string): string[] {
  const race = getRules().races.liste.find((r) => r.id === raceId)
  const acquises = race ? [...race.langues_depart] : []
  if (classeId === CLASSE_DRUIDE && !acquises.includes(LANGUE_DRUIDES)) {
    acquises.push(LANGUE_DRUIDES)
  }
  return acquises
}

function palierEsprit(esprit: number) {
  return getRules().caracteristiques.table_cumulative.esprit[String(esprit)]
}

/**
 * T8 : droit de langues au choix =
 *   langues de la table cumulative d'Esprit (A4)
 * + bonus Érudit : 1 langue si illettré (Esprit 1), sinon 2 — chiffres du
 *   verbatim d'Érudit (« choisit 1 langue supplémentaire… il obtient 2
 *   langues supplémentaires »), l'illettrisme étant lu de la table.
 */
export function droitLangues(esprit: number, comps: readonly string[] = []): number {
  const palier = palierEsprit(esprit)
  const deTable = palier ? palier.langues : 0
  let bonusErudit = 0
  if (comps.includes('erudit')) {
    bonusErudit = palier?.illettre ? 1 : 2
  }
  return deTable + bonusErudit
}

/**
 * Langues proposables au choix : toutes sauf celles déjà acquises, la langue
 * des druides (réservée, jamais au choix) et la Langue des morts (jamais à
 * la création).
 */
export function languesProposables(raceId?: string, classeId?: string): Langue[] {
  const acquises = new Set(languesAcquises(raceId, classeId))
  return listeLangues().filter(
    (l) =>
      !acquises.has(l.id) &&
      l.id !== LANGUE_JAMAIS_A_LA_CREATION &&
      l.id !== LANGUE_DRUIDES,
  )
}

/** Refus sur un choix de langues (hors compte de droits). */
export function refusLangues(
  langChoix: readonly string[],
  raceId?: string,
  classeId?: string,
): string[] {
  const refus: string[] = []
  const proposables = new Set(languesProposables(raceId, classeId).map((l) => l.id))
  const vus = new Set<string>()
  for (const id of langChoix) {
    if (vus.has(id)) refus.push(`doublon : ${id}`)
    vus.add(id)
    if (!proposables.has(id)) refus.push(`langue non proposable : ${id}`)
  }
  return refus
}
