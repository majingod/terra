/**
 * D19 ③ — la DATATION des dons : à quel niveau du personnage chaque don a
 * été gagné.
 *
 * La règle de table (arbitrage Fred t009) :
 *
 * > Un don gagné par Esprit 3 porte le niveau du personnage au moment où
 * > Esprit a atteint 3 ; point acheté → toujours niveau 1 ; point d'échelon →
 * > le niveau de cet échelon.
 *
 * ⛔ Rien n'est STOCKÉ. Comme le niveau (D20), la date d'un don est un fait
 * qui se DÉRIVE de ce que la fiche porte déjà — l'historique daté, l'agrégat
 * des dons, les achats d'héritage, les emplacements troqués. Aucun champ
 * n'entre dans `FicheCreation`, aucune forme d'export ne bouge (D7).
 *
 * ⚠️ Une fiche d'AVANT D20 n'a pas d'historique : rien n'y est datable, et ce
 * module le DIT (`niveau: undefined`) plutôt que d'inventer un niveau.
 *
 * ⚠️ Ce que l'agrégat ne dit pas. `fiche.dons` est un compte par id — il ne
 * range PAS ses prises par échelon (seul `donNiveaux`, le troc D18, porte un
 * échelon). L'attribution est donc une CONVENTION, déterministe et
 * documentée : les instances de l'agrégat, prises dans l'ordre où la fiche
 * les porte (création d'abord, puis chaque montée), s'apparient aux droits de
 * don triés par date — échelons de la table, achats (datés du niveau 1) puis
 * palier d'Esprit. Cet ordre est chronologique des deux côtés, ce qui rend
 * l'appariement juste dans tous les parcours que l'app peut produire. Sa
 * seule limite connue : un don CUMULABLE repris plus tard garde la place de
 * sa première prise dans l'agrégat, et ses instances portent alors la même
 * date.
 */
import { compteAchats } from '../rules/heritage'
import { getRules } from '../rules/load'
import { niveauMin, niveauxPossibles, tableEvolution } from '../rules/niveau'
import { valeurCarac } from '../rules/stats'
import { droitDons } from '../rules/talents'
import { historiqueDe, niveauCourant } from './historique'
import { consommationDonsDeLaFiche } from './validation'
import type { FicheCreation } from './types'

/** D'où vient le droit de don qu'une instance consomme. */
export type SourceDeDon = 'echelon' | 'troc' | 'achat' | 'palier' | 'indatable'

/** Une prise de don, datée du niveau où le personnage l'a gagnée. */
export interface DonDate {
  /** L'id du don (une prise ×2 rend deux instances). */
  id: string
  /**
   * Le niveau du personnage au moment du gain — ABSENT quand la fiche n'est
   * pas datable (fiche d'avant D20, sans historique) ou qu'aucun droit connu
   * ne répond de cette prise.
   */
  niveau?: number
  source: SourceDeDon
}

// ---------------------------------------------------------------------------
// Le palier d'Esprit — lu de la table cumulative, jamais écrit ici
// ---------------------------------------------------------------------------

/** La table cumulative d'Esprit, échelon par échelon, valeur croissante. */
function paliersEsprit(): Array<{ valeur: number; dons: number }> {
  return Object.entries(getRules().caracteristiques.table_cumulative.esprit)
    .map(([valeur, palier]) => ({ valeur: Number(valeur), dons: palier.dons }))
    .sort((a, b) => a.valeur - b.valeur)
}

/**
 * La valeur d'Esprit à partir de laquelle la table cumulative ouvre un don
 * — le « 3 » de la règle, lu du corpus et jamais recopié. `undefined` si le
 * corpus n'ouvre aucun don par l'Esprit.
 */
export function seuilPalierEsprit(): number | undefined {
  return paliersEsprit().find((palier) => palier.dons > 0)?.valeur
}

/** Les dons que la table cumulative donne pour cette valeur d'Esprit. */
export function donsDuPalierEsprit(esprit: number): number {
  const palier = paliersEsprit().filter((p) => p.valeur === esprit)[0]
  return palier?.dons ?? 0
}

/**
 * Une fiche est DATABLE quand elle porte l'historique daté de D20. C'est le
 * même critère que `estAncienneFiche` — l'absence d'historique — pris ici sur
 * le champ lui-même : une fiche du flux ≤11 n'en a pas non plus, et elle n'a
 * pas de don à dater.
 */
export function ficheDatable(fiche: FicheCreation | undefined): boolean {
  return Array.isArray(fiche?.historique)
}

/**
 * Le niveau du personnage quand son Esprit a ATTEINT le seuil du palier —
 * `undefined` quand il ne l'a jamais atteint, ou quand la fiche n'est pas
 * datable.
 *
 * On ne reconstruit pas l'Esprit vers l'avant (les points achetés à
 * l'héritage se fondent dans `extras` sans dire sur quelle caractéristique
 * ils sont tombés) : on part de l'Esprit FINAL, qui est un fait, et on retire
 * les points d'Esprit que les échelons POSTÉRIEURS à L ont donnés
 * (`EntreeNiveau.caracs`). Tout le reste — répartition de création et achats,
 * qui n'existent qu'à la création (D20) — date du niveau 1.
 */
export function niveauPalierEsprit3(fiche: FicheCreation | undefined): number | undefined {
  if (!fiche || !ficheDatable(fiche)) return undefined
  const seuil = seuilPalierEsprit()
  if (seuil === undefined) return undefined
  const finale = valeurCarac(fiche, 'e')
  if (finale < seuil) return undefined
  const entrees = historiqueDe(fiche)
  const courant = niveauCourant(fiche)
  for (const niveau of niveauxPossibles().filter((n) => n <= courant)) {
    const apres = entrees
      .filter((entree) => entree.niveau > niveau)
      .reduce((somme, entree) => somme + (entree.caracs?.e ?? 0), 0)
    if (finale - apres >= seuil) return niveau
  }
  return undefined
}

/**
 * Le don du palier d'Esprit que la fiche n'a PAS encore consommé (0 ou le
 * nombre que la table ouvre). C'est le trou que D19 ③ vient boucher : le
 * point d'un échelon peut pousser l'Esprit au palier sans qu'aucun
 * emplacement ne s'ouvre pour le don gagné.
 */
export function palierNonConsomme(fiche: FicheCreation | undefined): number {
  if (!fiche) return 0
  const ouverts = donsDuPalierEsprit(valeurCarac(fiche, 'e'))
  if (ouverts === 0) return 0
  const droit = droitDons(valeurCarac(fiche, 'e'), fiche.achats, niveauCourant(fiche))
  const manquant = droit - consommationDonsDeLaFiche(fiche)
  return Math.min(ouverts, Math.max(0, manquant))
}

// ---------------------------------------------------------------------------
// Les droits de don, triés par date
// ---------------------------------------------------------------------------

interface DroitDeDon {
  niveau?: number
  source: SourceDeDon
}

/**
 * Les droits de don que la fiche a ouverts, dans l'ORDRE DES DATES : les
 * échelons de la table (moins ceux troqués contre une capacité — D18 : ce
 * droit-là est parti dans la capacité), les achats d'héritage (niveau 1, D20 :
 * ils n'existent qu'à la création) et le palier d'Esprit.
 *
 * Le tri est STABLE : à date égale, l'échelon passe avant l'achat, qui passe
 * avant le palier. À la création, les trois portent de toute façon le
 * niveau 1 — l'ordre n'y change rien.
 */
function droitsDeDon(fiche: FicheCreation): DroitDeDon[] {
  const courant = niveauCourant(fiche)
  const droits: DroitDeDon[] = []
  for (const ligne of tableEvolution()) {
    if (ligne.niv > courant || ligne.dons <= 0) continue
    // D18 : l'échelon dont le don est devenu une capacité n'ouvre plus rien.
    if (fiche.capDons?.[String(ligne.niv)]) continue
    for (let i = 0; i < ligne.dons; i++) droits.push({ niveau: ligne.niv, source: 'echelon' })
  }
  for (let i = 0; i < compteAchats(fiche.achats, 'don'); i++) {
    droits.push({ niveau: niveauMin(), source: 'achat' })
  }
  for (let i = 0; i < donsDuPalierEsprit(valeurCarac(fiche, 'e')); i++) {
    droits.push({ niveau: niveauPalierEsprit3(fiche), source: 'palier' })
  }
  return droits
    .map((droit, rang) => ({ droit, rang }))
    .sort((a, b) => (a.droit.niveau ?? 0) - (b.droit.niveau ?? 0) || a.rang - b.rang)
    .map(({ droit }) => droit)
}

/**
 * Le RANG du droit de palier parmi les droits triés par date — la place que
 * son don doit occuper dans l'agrégat pour que l'appariement tombe juste.
 *
 * C'est l'invariant que les deux écrivains tiennent : `fiche.dons` range ses
 * prises dans l'ordre des DROITS qu'elles consomment. La montée l'obtient en
 * inscrivant le don du palier avant celui de l'échelon ; la réclamation hors
 * montée, elle, doit insérer le sien au bon rang (le droit est ancien, le
 * geste est récent).
 */
export function rangDuDroitDePalier(fiche: FicheCreation): number {
  const droits = droitsDeDon(fiche)
  const rang = droits.findIndex((droit) => droit.source === 'palier')
  return rang < 0 ? droits.length : rang
}

/**
 * L'agrégat des dons avec une prise de plus, posée au rang demandé. Un don
 * DÉJÀ pris (cumulable repris) garde la place de sa première prise : l'agrégat
 * compte par id, il ne sait pas séparer deux prises du même don.
 */
export function agregatAvecPrise(
  dons: Readonly<Record<string, number>>,
  id: string,
  rang: number,
): Record<string, number> {
  if ((dons[id] ?? 0) > 0) return { ...dons, [id]: dons[id] + 1 }
  const suite: Record<string, number> = {}
  let vues = 0
  let posee = false
  for (const [cle, n] of Object.entries(dons)) {
    if (!posee && vues >= rang) {
      suite[id] = 1
      posee = true
    }
    suite[cle] = n
    vues += n
  }
  if (!posee) suite[id] = 1
  return suite
}

/** Les instances de l'agrégat `fiche.dons`, dans l'ordre où la fiche les porte. */
function instancesDeLAgregat(fiche: FicheCreation): string[] {
  const instances: string[] = []
  for (const [id, n] of Object.entries(fiche.dons ?? {})) {
    for (let i = 0; i < n; i++) instances.push(id)
  }
  return instances
}

// ---------------------------------------------------------------------------
// La dérivation
// ---------------------------------------------------------------------------

/**
 * Les dons de la fiche, chacun daté du niveau où il a été gagné.
 *
 * L'ordre du résultat : d'abord les instances de l'agrégat (dans l'ordre où
 * la fiche les porte), puis les dons rangés dans un emplacement de CAPACITÉ
 * (troc D18), par échelon croissant — ceux-là se datent trivialement.
 *
 * ⚠️ Fiche d'avant D20 : toutes les instances rendent `niveau: undefined` et
 * la source `indatable`. Jamais un plantage, jamais un niveau inventé.
 */
export function datesDesDons(fiche: FicheCreation | undefined): DonDate[] {
  if (!fiche) return []
  const agregat = instancesDeLAgregat(fiche)
  const troc = Object.entries(fiche.donNiveaux ?? {})
    .map(([cle, id]) => ({ echelon: Number(cle), id }))
    .sort((a, b) => a.echelon - b.echelon)

  if (!ficheDatable(fiche)) {
    return [...agregat, ...troc.map((t) => t.id)].map((id) => ({ id, source: 'indatable' as const }))
  }

  const droits = droitsDeDon(fiche)
  const datees: DonDate[] = agregat.map((id, rang) => {
    const droit = droits[rang]
    // Plus de prises que de droits (fiche en surplus, régime « le joueur
    // retire ») : on ne fabrique pas de date pour l'instance en trop.
    if (!droit) return { id, source: 'indatable' }
    return { id, niveau: droit.niveau, source: droit.source }
  })
  return [
    ...datees,
    ...troc.map(({ echelon, id }) => ({ id, niveau: echelon, source: 'troc' as const })),
  ]
}

/**
 * Les niveaux d'acquisition d'un don donné, dans l'ordre, sans répétition —
 * ce que le badge « niv N » de l'écran Fiche affiche.
 */
export function niveauxDuDon(fiche: FicheCreation | undefined, id: string): number[] {
  const niveaux = datesDesDons(fiche)
    .filter((instance) => instance.id === id && instance.niveau !== undefined)
    .map((instance) => instance.niveau as number)
  return [...new Set(niveaux)].sort((a, b) => a - b)
}

/**
 * Le badge d'un don sur l'écran Fiche : « niv 4 », ou « niv 1 · 3 » quand un
 * cumulable a été repris. `undefined` quand rien n'est datable — la fiche
 * n'affiche alors AUCUN badge, plutôt qu'un badge qui mentirait.
 */
export function libelleNiveauDuDon(
  fiche: FicheCreation | undefined,
  id: string,
): string | undefined {
  const niveaux = niveauxDuDon(fiche, id)
  if (niveaux.length === 0) return undefined
  return `niv ${niveaux.join(' · ')}`
}
