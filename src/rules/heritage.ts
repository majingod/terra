/**
 * Héritage (Tome p.20) : désavantages, XP et achats.
 *
 * D5 : aucun nom, chiffre ou texte de règle n'est recopié ici — tout se lit
 * de rules.json. Les seuls littéraux du module sont la grammaire des libellés
 * d'achats (« +N … ») et des motifs de classification, pas des règles.
 */
import { getRules, type AvantageHeritage, type Desavantage } from './load'

export function listeDesavantages(): Desavantage[] {
  return getRules().heritage.desavantages.liste
}

/**
 * Désavantages cochables pour une classe donnée : ceux dont
 * `interdit_classes` ne contient pas la classe. Sans classe choisie, tout
 * est disponible (l'interdit se réapplique au choix de classe).
 */
export function desavantagesDisponibles(classeId?: string): Desavantage[] {
  return listeDesavantages().filter(
    (d) => !classeId || !(d.interdit_classes ?? []).includes(classeId),
  )
}

export function desavantagesInterditsPour(classeId: string): Desavantage[] {
  return listeDesavantages().filter((d) => (d.interdit_classes ?? []).includes(classeId))
}

/**
 * Plafond de désavantages donnant de l'XP, lu du verbatim du Tome
 * (« Seuls N désavantages confèrent de l'XP. ») — jamais une constante.
 */
export function plafondDesavantagesXp(): number {
  const verbatim = getRules().heritage.desavantages.regle_plafond.verbatim
  const nombre = verbatim.match(/\d+/)
  if (!nombre) {
    throw new Error('rules.json : plafond de désavantages introuvable dans le verbatim.')
  }
  return Number(nombre[0])
}

/**
 * Sous-choix du désavantage à variante (Raciste) — maquette A v3 validée :
 * « Race d'une autre faction » (+xp) ou « Race de ta faction »
 * (+variante_xp). Arbitrage t004.
 */
export type VarianteRaciste = 'autre' | 'faction'

/**
 * XP d'un désavantage donné. Le désavantage à variante (Raciste) rend son
 * `variante_xp` quand le sous-choix est « race de ta faction ».
 */
export function xpDesavantage(
  desavantage: Desavantage,
  contexte?: { racisteVar?: VarianteRaciste | string },
): number {
  if (desavantage.variante_xp !== undefined && contexte?.racisteVar === 'faction') {
    return desavantage.variante_xp
  }
  return desavantage.xp
}

/**
 * A6 : les désavantages se cochent librement mais seuls les N premiers
 * cochés (ordre de cochage) confèrent leur XP.
 */
export function xpDesavantages(
  desavOrdre: readonly string[],
  contexte?: { racisteVar?: VarianteRaciste | string },
): number {
  const plafond = plafondDesavantagesXp()
  const liste = listeDesavantages()
  return desavOrdre.slice(0, plafond).reduce((somme, id) => {
    const desavantage = liste.find((d) => d.id === id)
    return desavantage ? somme + xpDesavantage(desavantage, contexte) : somme
  }, 0)
}

/** Ids cochés au-delà du plafond : « RP seulement », zéro XP. */
export function desavantagesRpSeulement(desavOrdre: readonly string[]): string[] {
  return desavOrdre.slice(plafondDesavantagesXp())
}

// ---------------------------------------------------------------------------
// Achats d'héritage
// ---------------------------------------------------------------------------

export function listeAchats(): AvantageHeritage[] {
  return getRules().heritage.avantages.liste
}

export type EffetAchat =
  | { type: 'pv'; n: number }
  | { type: 'mana'; n: number }
  | { type: 'lutte'; n: number }
  | { type: 'argent'; n: number }
  | { type: 'capacite'; niveau: number }
  | { type: 'competence'; n: number }
  | { type: 'don'; n: number }
  | { type: 'carac'; n: number }
  | { type: 'inconnu' }

/**
 * Classe un libellé d'achat du fichier (« +1 PV », « +1 Capacité de
 * niveau 2 »…) par sa grammaire. Aucune liste de libellés n'est recopiée :
 * seuls des motifs génériques.
 */
export function effetAchat(achat: string): EffetAchat {
  const montant = achat.match(/^\+(\d+)/)
  const n = montant ? Number(montant[1]) : 1
  const capacite = achat.match(/Capacité de niveau (\d+)/i)
  if (capacite) return { type: 'capacite', niveau: Number(capacite[1]) }
  if (/Point de Caractéristique/i.test(achat)) return { type: 'carac', n }
  if (/\bDon\b/i.test(achat)) return { type: 'don', n }
  if (/Compétence/i.test(achat)) return { type: 'competence', n }
  if (/\bPV\b/.test(achat)) return { type: 'pv', n }
  if (/\bPM\b/.test(achat)) return { type: 'mana', n }
  if (/Lutte/i.test(achat)) return { type: 'lutte', n }
  if (/argent/i.test(achat)) return { type: 'argent', n }
  return { type: 'inconnu' }
}

/** Somme des achats d'un type donné (pondérée par le montant du libellé). */
export function totalAchats(
  achats: Readonly<Record<string, number>> | undefined,
  type: EffetAchat['type'],
  niveau?: number,
): number {
  if (!achats) return 0
  let total = 0
  for (const [achat, compte] of Object.entries(achats)) {
    const effet = effetAchat(achat)
    if (effet.type !== type) continue
    if (effet.type === 'capacite') {
      if (niveau === undefined || effet.niveau === niveau) total += compte
    } else {
      total += compte * ('n' in effet ? effet.n : 1)
    }
  }
  return total
}

/** Nombre brut d'achats (non pondéré) pour un type — utile pour « ×n ». */
export function compteAchats(
  achats: Readonly<Record<string, number>> | undefined,
  type: EffetAchat['type'],
  niveau?: number,
): number {
  if (!achats) return 0
  let total = 0
  for (const [achat, compte] of Object.entries(achats)) {
    const effet = effetAchat(achat)
    if (effet.type !== type) continue
    if (effet.type === 'capacite' && niveau !== undefined && effet.niveau !== niveau) continue
    total += compte
  }
  return total
}

/**
 * D18 — ce que coûte un emplacement d'achat de capacité qu'on a troqué
 * contre un don (troc du guerrier). Fred a arbitré ce prix ; il ne s'écrit
 * pas ici pour autant : c'est le coût du MOINS CHER des achats de capacité du
 * catalogue — un don troqué ne coûte jamais plus qu'entrer par la porte la
 * plus basse. Si le catalogue bouge, le prix suit.
 */
export function coutDunDonTroque(): number {
  const capacites = listeAchats().filter((a) => effetAchat(a.achat).type === 'capacite')
  if (capacites.length === 0) {
    throw new Error('rules.json : aucun achat de capacité au catalogue.')
  }
  return Math.min(...capacites.map((a) => a.cout_xp))
}

/**
 * XP dépensés par les achats. `donsTroques` (D18) dit, pour chaque niveau
 * d'achat de capacité, les dons pris à la place — chacun de ces emplacements
 * se paie au prix du troc et non au prix de sa ligne de catalogue.
 */
export function depenseXp(
  achats: Readonly<Record<string, number>> | undefined,
  donsTroques?: Readonly<Record<string, string[]>>,
): number {
  if (!achats) return 0
  const catalogue = listeAchats()
  return Object.entries(achats).reduce((somme, [achat, compte]) => {
    const entree = catalogue.find((a) => a.achat === achat)
    if (!entree) return somme
    const effet = effetAchat(achat)
    const troques =
      effet.type === 'capacite'
        ? Math.min(compte, (donsTroques?.[String(effet.niveau)] ?? []).length)
        : 0
    return somme + entree.cout_xp * (compte - troques) + coutDunDonTroque() * troques
  }, 0)
}

export interface ContexteBudget {
  xpPerm?: number
  desavOrdre?: string[]
  racisteVar?: string
  achats?: Record<string, number>
  /** D18 — dons pris à la place d'une capacité achetée : niveau -> ids. */
  donChoix?: Record<string, string[]>
}

/** Budget XP unique : XP permanent du joueur + XP des désavantages (A6). */
export function budgetXp(fiche: ContexteBudget): number {
  return (fiche.xpPerm ?? 0) + xpDesavantages(fiche.desavOrdre ?? [], fiche)
}

export function xpRestant(fiche: ContexteBudget): number {
  return budgetXp(fiche) - depenseXp(fiche.achats, fiche.donChoix)
}

/**
 * T9 : refuse toute dépense au-delà du budget, tout dépassement de
 * `max_achats`, et tout compte négatif. Rend la liste des refus (vide = ok).
 */
export function validerAchats(fiche: ContexteBudget): string[] {
  const refus: string[] = []
  const catalogue = listeAchats()
  for (const [achat, compte] of Object.entries(fiche.achats ?? {})) {
    const entree = catalogue.find((a) => a.achat === achat)
    if (!entree) {
      refus.push(`achat inconnu : ${achat}`)
      continue
    }
    if (compte < 0) refus.push(`compte négatif : ${achat}`)
    if (entree.max_achats !== undefined && compte > entree.max_achats) {
      refus.push(`« ${achat} » dépasse max_achats (${entree.max_achats})`)
    }
  }
  if (depenseXp(fiche.achats, fiche.donChoix) > budgetXp(fiche)) {
    refus.push('dépense au-delà du budget XP')
  }
  return refus
}
