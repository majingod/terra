/**
 * Stats calculées (PV, Mana, Lutte) pour le bandeau vivant et la fiche.
 *
 * Sources, toutes lues de rules.json :
 * - bases de classe (classes_squelette.pv_base / mana_base) ;
 * - table cumulative des caractéristiques (A4 : lecture cumulative p.5) ;
 * - bonus plats de race (« +N PV », « +N Mana », « +N en Lutte ») parsés
 *   par grammaire — aucun bonus recopié ;
 * - choix de l'Humain (bonus au choix, libellés du fichier) ;
 * - achats d'héritage (+1 PV / +1 PM / +1 de Lutte) ;
 * - plafond de PV (plafonds.pv_max.valeur).
 * La ressource spéciale d'une classe (ex. Énergie du sorcier) est rendue
 * telle que décrite par le fichier (nom, somme PV+Mana, max).
 */
import { getRules, type ClasseSquelette, type Race } from './load'
import { totalAchats } from './heritage'

export interface StatsCalculees {
  pv: number
  mana: number
  lutte: number
  degats: number
  sauvegardes: number
  illettre: boolean
  /** Ressource fusionnée si la classe en déclare une (ex. Énergie). */
  ressourceSpeciale?: { nom: string; valeur: number; max?: number }
}

export function classesSquelette(): ClasseSquelette[] {
  return getRules().classes_squelette.liste
}

export function classeSquelette(classeId?: string): ClasseSquelette | undefined {
  return classesSquelette().find((c) => c.id === classeId)
}

export function raceDe(raceId?: string): Race | undefined {
  return getRules().races.liste.find((r) => r.id === raceId)
}

/** Classes offertes à une faction : faction ∈ (X, 'toute') — critère A3. */
export function classesPourFaction(factionId: string): ClasseSquelette[] {
  return classesSquelette().filter((c) => c.faction === factionId || c.faction === 'toute')
}

/** Races offertes à une faction : même critère A3. */
export function racesPourFaction(factionId: string): Race[] {
  return getRules().races.liste.filter(
    (r) => r.faction === factionId || r.faction === 'toute',
  )
}

interface BonusPlat {
  pv: number
  mana: number
  lutte: number
}

/** Parse un libellé de bonus plat (« +2 PV », « +1 en Lutte », « +1 Mana »). */
export function parseBonusPlat(libelle: string): Partial<BonusPlat> {
  const m = libelle.match(/^\+(\d+)\s+(?:en\s+)?(PV|Mana|Lutte)$/i)
  if (!m) return {}
  const n = Number(m[1])
  const cible = m[2].toLowerCase()
  if (cible === 'pv') return { pv: n }
  if (cible === 'mana') return { mana: n }
  return { lutte: n }
}

function bonusDeRace(race: Race | undefined, humainChoix?: string): BonusPlat {
  const total: BonusPlat = { pv: 0, mana: 0, lutte: 0 }
  if (!race) return total
  const libelles: string[] = []
  for (const bonus of race.bonus) {
    if (typeof bonus === 'string') libelles.push(bonus)
    else if ('choix' in bonus && humainChoix && bonus.choix.includes(humainChoix)) {
      libelles.push(humainChoix)
    }
  }
  for (const libelle of libelles) {
    const plat = parseBonusPlat(libelle)
    total.pv += plat.pv ?? 0
    total.mana += plat.mana ?? 0
    total.lutte += plat.lutte ?? 0
  }
  return total
}

export interface ContexteStats {
  classe?: string
  race?: string
  humainChoix?: string
  caracs?: { p?: number; r?: number; e?: number }
  extras?: { p: number; r: number; e: number }
  achats?: Record<string, number>
}

/** Valeur finale d'une caractéristique (jeton posé + points en plus). */
export function valeurCarac(fiche: ContexteStats, carac: 'p' | 'r' | 'e'): number {
  return (fiche.caracs?.[carac] ?? 0) + (fiche.extras?.[carac] ?? 0)
}

export function statsDe(fiche: ContexteStats): StatsCalculees | undefined {
  const classe = classeSquelette(fiche.classe)
  if (!classe) return undefined
  const tables = getRules().caracteristiques.table_cumulative
  const p = tables.puissance[String(valeurCarac(fiche, 'p'))]
  const r = tables.resistance[String(valeurCarac(fiche, 'r'))]
  const e = tables.esprit[String(valeurCarac(fiche, 'e'))]
  const race = raceDe(fiche.race)
  const bonusRace = bonusDeRace(race, fiche.humainChoix)

  const pvMax = getRules().plafonds.pv_max.valeur
  const pv = Math.min(
    classe.pv_base + (r?.pv ?? 0) + bonusRace.pv + totalAchats(fiche.achats, 'pv'),
    pvMax,
  )
  const mana = classe.mana_base + (e?.mana ?? 0) + bonusRace.mana + totalAchats(fiche.achats, 'mana')
  const lutte = (p?.lutte ?? 0) + bonusRace.lutte + totalAchats(fiche.achats, 'lutte')

  const stats: StatsCalculees = {
    pv,
    mana,
    lutte,
    degats: p?.degats ?? 0,
    sauvegardes: r?.sauvegardes ?? 0,
    illettre: e?.illettre ?? false,
  }
  if (classe.ressource_speciale) {
    const somme = pv + mana
    const max = classe.ressource_speciale.max
    stats.ressourceSpeciale = {
      nom: classe.ressource_speciale.nom,
      valeur: max !== undefined ? Math.min(somme, max) : somme,
      max,
    }
  }
  return stats
}
