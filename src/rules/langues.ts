/**
 * Langues (Tome p.7).
 *
 * Les langues acquises viennent de la race (races.liste[].langues_depart) ;
 * le Druidique est acquis d'office par le druide.
 *
 * D19 ④ (arbitrage Q6, Fred, t016, 2026-08-26) — verbatim de
 * langues.liste[].restriction pour la Langue des morts : « Uniquement
 * accessible aux sorciers et chevaliers de la mort, mais ne commence pas
 * avec. » Elle n'est donc offerte qu'à ces deux classes — à la création OU
 * en gagnant une langue supplémentaire par un Esprit élevé — jamais aux
 * autres, et jamais d'office. Les deux règles vivent dans
 * langues.liste[].restriction de rules.json — pas recopiées ici.
 */
import { getRules, type Langue } from './load'

/** Id de la langue réservée aux druides — voir langues.liste[].restriction. */
const LANGUE_DRUIDES = 'druidique'
/** Id de la classe qui la possède dès le début. */
const CLASSE_DRUIDE = 'druide'
/** Id de la langue réservée aux deux classes de nécromancie — même champ restriction. */
const LANGUE_DES_MORTS = 'des_morts'
/** Ids des deux seules classes qui peuvent la prendre (Q6, t016). */
const CLASSES_LANGUE_DES_MORTS = ['sorcier', 'chevalier_de_la_mort']

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
 * + bonus Érudit : 1 langue si illettré, sinon 2 — chiffres du verbatim
 *   d'Érudit (competences.simples[id=erudit].base), l'illettrisme étant lu
 *   de la table cumulative.
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
 * Langues proposables au choix : toutes sauf celles déjà acquises et la
 * langue des druides (réservée, jamais au choix). La Langue des morts n'y
 * entre QUE pour les deux classes de Q6 — sorcier et chevalier de la mort ;
 * pour les six autres, elle n'est jamais proposable.
 */
export function languesProposables(raceId?: string, classeId?: string): Langue[] {
  const acquises = new Set(languesAcquises(raceId, classeId))
  const desMortsOuverte = classeId !== undefined && CLASSES_LANGUE_DES_MORTS.includes(classeId)
  return listeLangues().filter((l) => {
    if (acquises.has(l.id)) return false
    if (l.id === LANGUE_DRUIDES) return false
    if (l.id === LANGUE_DES_MORTS) return desMortsOuverte
    return true
  })
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
