/**
 * D18 — le troc sur une fiche : ce qu'un emplacement peut recevoir d'autre,
 * et ce que la fiche porte une fois le troc posé.
 *
 * Rien n'est réimplémenté ici. Le bassin de capacités reste celui de D16
 * (`capacitesDeClasse` / l'anti-doublon global de `wizard/capacites`), le
 * catalogue de dons reste `listeDons`, la règle « un don ne se prend qu'une
 * fois sauf s'il est cumulable » reste celle de `refusDons`. Ce module ne
 * fait que dire, pour un emplacement donné, ce qui s'y offre et pourquoi le
 * reste ne s'y offre pas.
 */
import { capacitesDeClasse, type CapaciteDeVoie } from '../rules/capacites'
import type { Don } from '../rules/load'
import { listeDons } from '../rules/talents'
import { plafondDuTrocDeDon } from '../rules/troc'
import type { OptionDeCapacite } from './capacites'
import type { FicheCreation } from './types'

// ---------------------------------------------------------------------------
// Libellés — ceux de la maquette D18 v1, arbitrés mot pour mot
// ---------------------------------------------------------------------------

/** L'en-tête de la voie de troc, sous les vraies voies d'un emplacement. */
export function libelleTrocDuGuerrier(): string {
  return '⚔ Troc du guerrier — un don à la place'
}

/** L'en-tête des voies de troc, sous les dons de l'échelon N. */
export function libelleTrocDuMage(echelon: number): string {
  return `✦ Troc du mage — une capacité ≤ niv ${plafondDuTrocDeDon(echelon)}`
}

/** La raison affichée sur un don qu'un emplacement ne peut plus offrir. */
export function raisonDonDejaPris(niveau?: number): string {
  const ou = niveau === undefined ? '' : ` au niveau ${niveau}`
  return `Déjà pris${ou} — un don ne se prend qu'une fois, sauf s'il est cumulable.`
}

/** La raison affichée sur une capacité au-dessus du plafond du troc. */
export function raisonCapaciteTropHaute(echelon: number): string {
  return `Au-dessus du niveau du don obtenu (${plafondDuTrocDeDon(echelon)}).`
}

// ---------------------------------------------------------------------------
// Les dons de la fiche — échelons ET trocs confondus
// ---------------------------------------------------------------------------

/**
 * D'où vient une prise de don : de l'étape des dons (aucun niveau), ou d'un
 * emplacement de capacité troqué (le niveau de l'emplacement).
 */
export interface PriseDeDon {
  id: string
  /** Le niveau de l'emplacement de capacité troqué, s'il y en a un. */
  niveau?: number
}

/** Toutes les prises de don de la fiche, dans l'ordre : dons, puis trocs. */
export function prisesDeDon(fiche: FicheCreation): PriseDeDon[] {
  const prises: PriseDeDon[] = []
  for (const [id, n] of Object.entries(fiche.dons ?? {})) {
    for (let i = 0; i < n; i++) prises.push({ id })
  }
  for (const [cle, id] of Object.entries(fiche.donNiveaux ?? {})) {
    prises.push({ id, niveau: Number(cle) })
  }
  return prises
}

/** Les dons de la fiche comptés par id — c'est ce que `refusDons` juge. */
export function donsPris(fiche: FicheCreation): Record<string, number> {
  const comptes: Record<string, number> = {}
  for (const prise of prisesDeDon(fiche)) {
    comptes[prise.id] = (comptes[prise.id] ?? 0) + 1
  }
  return comptes
}

/** Un don de la fiche, avec son nombre de prises — pour la fiche imprimée. */
export interface DonDeFiche {
  don: Don
  n: number
}

/**
 * Les dons de la fiche dans l'ordre du catalogue, troqués compris : la fiche
 * et l'impression ne font AUCUNE différence entre un don d'échelon et un don
 * pris à la place d'une capacité.
 */
export function donsDeLaFiche(fiche: FicheCreation): DonDeFiche[] {
  const comptes = donsPris(fiche)
  return listeDons()
    .filter((don) => (comptes[don.id] ?? 0) > 0)
    .map((don) => ({ don, n: comptes[don.id] }))
}

// ---------------------------------------------------------------------------
// Troc « une capacité → un don » (guerrier)
// ---------------------------------------------------------------------------

/**
 * L'emplacement de capacité qu'on regarde. D18-bis : ce sont ceux que la
 * TABLE D'ÉVOLUTION donne, et eux seuls — un achat d'héritage n'en est pas
 * un (le catalogue porte déjà « +1 Don », moins cher).
 */
export type EmplacementDeCapacite = { niveau: number }

export interface OptionDeDon {
  don: Don
  /** Non cumulable et déjà pris ailleurs : carte éteinte, raison affichée. */
  indisponible: boolean
  /** Pourquoi la carte est éteinte (jamais un texte du Tome). */
  raison?: string
  /** Le don que CET emplacement porte. */
  choisi: boolean
}

/** Les prises de don qui ne viennent PAS de l'emplacement qu'on regarde. */
function prisesAilleurs(
  fiche: FicheCreation,
  emplacement: EmplacementDeCapacite,
): PriseDeDon[] {
  const prises: PriseDeDon[] = []
  for (const [id, n] of Object.entries(fiche.dons ?? {})) {
    for (let i = 0; i < n; i++) prises.push({ id })
  }
  for (const [cle, id] of Object.entries(fiche.donNiveaux ?? {})) {
    if (cle === String(emplacement.niveau)) continue
    prises.push({ id, niveau: Number(cle) })
  }
  return prises
}

/**
 * Les dons qu'un emplacement de capacité peut recevoir : TOUT le catalogue,
 * rien n'est caché. Un don non cumulable déjà pris ailleurs — à l'étape des
 * dons comme dans un autre emplacement troqué — s'y montre éteint, avec la
 * raison.
 */
export function optionsDeTrocDon(
  fiche: FicheCreation,
  emplacement: EmplacementDeCapacite,
): OptionDeDon[] {
  const ailleurs = prisesAilleurs(fiche, emplacement)
  const ici = fiche.donNiveaux?.[String(emplacement.niveau)]
  return listeDons().map((don) => {
    const prise = ailleurs.find((p) => p.id === don.id)
    const indisponible = prise !== undefined && !don.cumulable
    return {
      don,
      indisponible,
      raison: indisponible ? raisonDonDejaPris(prise?.niveau) : undefined,
      choisi: ici === don.id,
    }
  })
}

// ---------------------------------------------------------------------------
// Troc « un don → une capacité » (mage)
// ---------------------------------------------------------------------------

/** Les capacités prises à la place d'un don, tous échelons confondus. */
export function capacitesTroquees(fiche: FicheCreation): string[] {
  return Object.values(fiche.capDons ?? {})
}

/**
 * Ce que l'emplacement du don de l'échelon N montre : TOUT l'arbre de la
 * classe. Les capacités de niveau > N s'y montrent éteintes avec la raison
 * (« au-dessus du niveau du don obtenu ») — la maquette D18 le demande, et
 * ça évite de faire croire que l'arbre s'arrête là. L'anti-doublon D16 est
 * global : ce qui est pris ailleurs (niveaux, achats, autre échelon troqué)
 * est éteint aussi.
 */
export function optionsDeTrocCapacite(
  fiche: FicheCreation,
  echelon: number,
  dejaPrisesAilleurs: Iterable<string> = [],
): OptionDeCapacite[] {
  const plafond = plafondDuTrocDeDon(echelon)
  const ici = fiche.capDons?.[String(echelon)]
  const ailleurs = new Set(dejaPrisesAilleurs)
  return capacitesDeClasse(fiche.classe).map((capacite: CapaciteDeVoie) => {
    const tropHaute = capacite.niveau > plafond
    const prise = ailleurs.has(capacite.id)
    return {
      capacite,
      dejaPrise: tropHaute || prise,
      raison: tropHaute ? raisonCapaciteTropHaute(echelon) : undefined,
      choisie: capacite.id === ici,
    }
  })
}
