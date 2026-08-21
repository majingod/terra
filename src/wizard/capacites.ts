/**
 * Les capacités d'une fiche en création — D16.
 *
 * Deux sources, une seule règle anti-doublon GLOBALE : les capacités
 * choisies à chaque niveau (`capNiveaux`) et celles achetées par XP
 * (`capChoix`, « +1 Capacité de niveau N »). Une capacité prise d'un côté
 * sort du bassin de l'autre.
 *
 * D5 : les échelons proposés viennent de la table d'évolution, l'arbre de
 * `branches_de_classes`. Rien n'est recopié ici.
 */
import {
  capaciteDeClasseParId,
  capacitesDisponibles,
  type CapaciteDeVoie,
  type ChoixCapacite,
} from '../rules/capacites'
import { niveauxPossibles } from '../rules/niveau'
import { niveauCourant } from './historique'
import type { FicheCreation } from './types'

/**
 * Les emplacements du personnage : un par niveau, du plus bas au plus haut.
 *
 * D20 : le niveau vient de l'historique, jamais d'un champ saisi — une fiche
 * en création n'a donc qu'un seul emplacement, celui du niveau 1.
 */
export function niveauxDeLaFiche(fiche: FicheCreation): number[] {
  const niveau = niveauCourant(fiche)
  return niveauxPossibles().filter((valeur) => valeur <= niveau)
}

/**
 * Les ids déjà pris : choix de niveaux, achats XP — et, D18, les capacités
 * prises à la place d'un don. L'anti-doublon D16 est global, le troc n'y
 * ouvre aucune porte dérobée.
 */
export function idsDejaPris(fiche: FicheCreation): string[] {
  return [
    ...Object.values(fiche.capNiveaux ?? {}),
    ...Object.values(fiche.capChoix ?? {}).flat(),
    ...Object.values(fiche.capDons ?? {}),
  ]
}

/**
 * Ce qui est pris AILLEURS que dans l'emplacement qu'on regarde. Un
 * emplacement laisse toujours voir SON propre choix (il s'y montre coché) ;
 * tout le reste, choix de niveaux comme achats XP, en sort.
 */
export function prisesAilleurs(
  fiche: FicheCreation,
  emplacement: { niveau?: number; achat?: number; echelonDon?: number },
): string[] {
  const desNiveaux = Object.entries(fiche.capNiveaux ?? {})
    .filter(([cle]) => cle !== String(emplacement.niveau))
    .map(([, id]) => id)
  const desAchats = Object.entries(fiche.capChoix ?? {})
    .filter(([cle]) => cle !== String(emplacement.achat))
    .flatMap(([, ids]) => ids)
  // D18 : une capacité prise à la place d'un don compte comme prise.
  const desTrocs = Object.entries(fiche.capDons ?? {})
    .filter(([cle]) => cle !== String(emplacement.echelonDon))
    .map(([, id]) => id)
  return [...desNiveaux, ...desAchats, ...desTrocs]
}

/** Le bassin de l'emplacement du niveau k : niveau ≤ k, moins le déjà-pris. */
export function bassinDuNiveau(fiche: FicheCreation, niveauDuChoix: number): CapaciteDeVoie[] {
  return capacitesDisponibles(
    fiche.classe,
    niveauDuChoix,
    prisesAilleurs(fiche, { niveau: niveauDuChoix }),
  )
}

/**
 * Le bassin d'un achat « +1 Capacité de niveau N » : toutes les capacités de
 * la classe DE CE NIVEAU, moins tout ce qui est déjà pris — les choix de
 * niveaux inclus. Plus aucun concept « d'office » : la voie ne donne plus
 * rien toute seule.
 */
export function bassinAchat(fiche: FicheCreation, niveauAchat: number): CapaciteDeVoie[] {
  return capacitesDisponibles(
    fiche.classe,
    niveauAchat,
    prisesAilleurs(fiche, { achat: niveauAchat }),
  ).filter((capacite) => capacite.niveau === niveauAchat)
}

export interface OptionDeCapacite {
  capacite: CapaciteDeVoie
  /** Prise ailleurs — à un autre niveau ou en achat XP : rayée, non cliquable. */
  dejaPrise: boolean
  /**
   * D18 — pourquoi elle est indisponible, quand ce n'est pas « déjà choisie »
   * (ex. au-dessus du plafond du troc). Jamais un texte du Tome.
   */
  raison?: string
  /** Le choix actuel de CET emplacement. */
  choisie: boolean
}

/**
 * Ce que montre l'emplacement du niveau k : tout l'arbre de la classe jusqu'à
 * l'échelon k — rien n'est caché, ce qui est pris ailleurs se raye. L'ordre
 * est celui de l'arbre, voie par voie.
 */
export function optionsDuNiveau(fiche: FicheCreation, niveauDuChoix: number): OptionDeCapacite[] {
  const actuelle = fiche.capNiveaux?.[String(niveauDuChoix)]
  const ailleurs = new Set(prisesAilleurs(fiche, { niveau: niveauDuChoix }))
  return capacitesDisponibles(fiche.classe, niveauDuChoix).map((capacite) => ({
    capacite,
    dejaPrise: ailleurs.has(capacite.id),
    choisie: capacite.id === actuelle,
  }))
}

/**
 * Les choix de niveaux résolus en capacités (les emplacements vides sautent,
 * et D18 : ceux qui portent un don aussi — ils se comptent à part).
 */
export function choixDeNiveaux(fiche: FicheCreation): ChoixCapacite[] {
  return niveauxDeLaFiche(fiche).flatMap((niveau) => {
    const capacite = capaciteDeClasseParId(fiche.classe, fiche.capNiveaux?.[String(niveau)] ?? '')
    return capacite ? [{ id: capacite.id, niveau: capacite.niveau }] : []
  })
}

/**
 * D18 — les emplacements de niveau qui portent un DON au lieu d'une capacité.
 * Ils comptent dans le nombre d'emplacements remplis sans porter de niveau :
 * un don n'a pas d'échelon, il se range partout.
 */
export function emplacementsTroques(fiche: FicheCreation): number[] {
  const niveaux = new Set(niveauxDeLaFiche(fiche).map(String))
  return Object.keys(fiche.donNiveaux ?? {})
    .filter((cle) => niveaux.has(cle))
    .map(Number)
    .sort((a, b) => a - b)
}

/** Une capacité de la classe, retrouvée par son id (affichage). */
export function capaciteParId(
  classeId: string | undefined,
  id: string,
): CapaciteDeVoie | undefined {
  return capaciteDeClasseParId(classeId, id)
}

export interface CapaciteDeFiche {
  capacite: CapaciteDeVoie
  /** Vraie quand la capacité vient d'un achat « +1 Capacité de niveau N ». */
  achatXp: boolean
}

/**
 * Toutes les capacités de la fiche, triées par niveau croissant : les choix
 * de niveaux et les achats XP dans la même liste, chacun sachant d'où il vient.
 */
export function capacitesDeLaFiche(fiche: FicheCreation): CapaciteDeFiche[] {
  const desNiveaux = Object.values(fiche.capNiveaux ?? {}).map((id) => ({ id, achatXp: false }))
  const desAchats = Object.values(fiche.capChoix ?? {})
    .flat()
    .map((id) => ({ id, achatXp: true }))
  // D18 : une capacité prise à la place d'un don se range comme les autres —
  // la fiche et l'impression ne la distinguent pas.
  const desTrocs = Object.values(fiche.capDons ?? {}).map((id) => ({ id, achatXp: false }))
  return [...desNiveaux, ...desAchats, ...desTrocs]
    .flatMap(({ id, achatXp }) => {
      const capacite = capaciteDeClasseParId(fiche.classe, id)
      return capacite ? [{ capacite, achatXp }] : []
    })
    .sort((a, b) => a.capacite.niveau - b.capacite.niveau)
}
