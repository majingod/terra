/**
 * D17 — monter de niveau depuis la fiche.
 *
 * Le joueur ne recrée pas son personnage pour gagner un niveau : la fiche
 * existante monte. Ce module tient les LIBELLÉS (arbitrés mot pour mot) et la
 * SEULE mise à jour que la confirmation écrit — niveau, capacité, don ou
 * caractéristique d'un coup, jamais en deux écritures.
 *
 * D7 : aucune montée de version Dexie. Rien de neuf n'est indexé ; la fiche
 * du wizard vit déjà sous `creation`, et c'est elle qu'on fait avancer.
 *
 * D16 : le bassin de capacités et l'anti-doublon ne sont PAS réimplémentés
 * ici — `bassinDuNiveau` (donc `capacitesDisponibles`) rend le bassin de
 * l'échelon atteint, choix de niveaux ET achats XP retirés.
 */
import { capacitesEnfantAcquises } from '../rules/kids'
import { refusDons } from '../rules/talents'
import { gainsMontee, gainsMonteeEnfant } from '../rules/montee'
import { normaliserNiveau } from '../rules/niveau'
import { valeurCarac } from '../rules/stats'
import type { Don } from '../rules/load'
import type { Personnage } from '../db'
import { prisesAilleurs, optionsDuNiveau, type OptionDeCapacite } from './capacites'
import {
  donsPris,
  optionsDeTrocCapacite,
  optionsDeTrocDon,
  type OptionDeDon,
} from './troc'
import type { FicheCreation } from './types'

/** Les trois clés de caractéristique, dans l'ordre de la répartition. */
export type CleCarac = 'p' | 'r' | 'e'

// ---------------------------------------------------------------------------
// Libellés — arbitrés mot pour mot (brief D17 ③)
// ---------------------------------------------------------------------------

/** Le bouton de la fiche, et le titre de l'écran de montée. */
export function libelleMonter(niveauAtteint: number): string {
  return `Monter au niveau ${niveauAtteint}`
}

/** Le chapeau de l'écran de montée. */
export function libelleChapeau(niveauAtteint: number): string {
  return `Le niveau ${niveauAtteint} t'apporte :`
}

/** Le bouton qui écrit — éteint tant qu'un gain n'a pas son choix. */
export function libelleConfirmer(niveauAtteint: number): string {
  return `Confirmer le niveau ${niveauAtteint}`
}

/** La ligne qui prend la place du bouton au plafond de la table (D12). */
export function libellePlafond(plafond: number): string {
  return `Niveau ${plafond} atteint. Au-delà, vois ton MJ.`
}

/** Le titre de la carte de capacité — le même libellé qu'à la création. */
export function libelleCarteCapacite(niveauAtteint: number): string {
  return `Capacité du niveau ${niveauAtteint}`
}

// ---------------------------------------------------------------------------
// Les choix que la montée demande
// ---------------------------------------------------------------------------

/** Ce que le joueur a posé sur l'écran de montée (12+). */
export interface ChoixMontee {
  /** La capacité de l'échelon atteint — toujours due (D16). */
  capacite?: string
  /** Le don, quand la ligne de table en donne un. */
  don?: string
  /** La caractéristique qui reçoit le(s) point(s) de la ligne de table. */
  carac?: CleCarac
  /**
   * D18 — le DON pris à la place de la capacité de l'échelon (troc du
   * guerrier). Exclusif avec `capacite` : c'est le même emplacement.
   */
  donTroque?: string
  /**
   * D18 — la CAPACITÉ prise à la place du don de l'échelon (troc du mage),
   * de niveau ≤ l'échelon atteint. Exclusive avec `don`.
   */
  capTroquee?: string
}

/**
 * La fiche telle qu'elle sera à l'échelon atteint, AVANT tout choix : c'est
 * sur elle que se demande le bassin de capacités, pour que l'emplacement du
 * nouveau niveau existe.
 */
function ficheDe(personnage: Personnage): FicheCreation {
  return personnage.creation ?? {}
}

/** Le niveau que porte la fiche du wizard (à défaut, celui du personnage). */
export function niveauDeLaFiche(personnage: Personnage): number {
  return normaliserNiveau(personnage.creation?.niveau ?? personnage.niveau)
}

/**
 * La fiche telle que la montée la ferait : l'échelon atteint devient le
 * niveau du personnage, et la capacité posée (s'il y en a une) occupe son
 * emplacement. C'est elle qu'on montre — et, une fois confirmée, elle qu'on
 * écrit.
 */
export function ficheDeLaMontee(
  personnage: Personnage,
  niveauAtteint: number,
  choix: ChoixMontee = {},
): FicheCreation {
  const fiche = ficheDe(personnage)
  const capNiveaux = { ...(fiche.capNiveaux ?? {}) }
  if (choix.capacite) capNiveaux[String(niveauAtteint)] = choix.capacite
  // D18 : l'emplacement porte l'un OU l'autre — jamais les deux.
  const donNiveaux = { ...(fiche.donNiveaux ?? {}) }
  if (choix.donTroque) donNiveaux[String(niveauAtteint)] = choix.donTroque
  const capDons = { ...(fiche.capDons ?? {}) }
  if (choix.capTroquee) capDons[String(niveauAtteint)] = choix.capTroquee
  return { ...fiche, niveau: niveauAtteint, capNiveaux, donNiveaux, capDons }
}

/**
 * Ce que le sélecteur de capacités montre pour l'échelon atteint : le bassin
 * D16 — capacités de la classe de niveau ≤ l'échelon, ce qui est déjà pris
 * (choix de niveaux ET achats XP) rayé. Rien n'est réimplémenté ici :
 * `optionsDuNiveau` s'appuie sur `capacitesDisponibles`, comme la création.
 */
export function optionsDeLaMontee(
  personnage: Personnage,
  niveauAtteint: number,
  choix: ChoixMontee = {},
): OptionDeCapacite[] {
  return optionsDuNiveau(ficheDeLaMontee(personnage, niveauAtteint, choix), niveauAtteint)
}

/**
 * D18 — les dons offerts DANS l'emplacement de capacité de l'échelon atteint
 * (troc du guerrier). Même bassin que la création : tout le catalogue, les
 * non-cumulables déjà pris éteints avec leur raison.
 */
export function optionsDeTrocDeLaMontee(
  personnage: Personnage,
  niveauAtteint: number,
  choix: ChoixMontee = {},
): OptionDeDon[] {
  return optionsDeTrocDon(ficheDeLaMontee(personnage, niveauAtteint, choix), {
    niveau: niveauAtteint,
  })
}

/**
 * D18 — les capacités offertes DANS l'emplacement de don de l'échelon atteint
 * (troc du mage) : tout l'arbre de la classe, celles de niveau > l'échelon
 * éteintes avec leur raison, l'anti-doublon D16 appliqué à travers tout
 * (niveaux, achats XP, autres échelons troqués).
 */
export function optionsDeTrocDeDonDeLaMontee(
  personnage: Personnage,
  niveauAtteint: number,
  choix: ChoixMontee = {},
): OptionDeCapacite[] {
  const fiche = ficheDeLaMontee(personnage, niveauAtteint, choix)
  return optionsDeTrocCapacite(
    fiche,
    niveauAtteint,
    prisesAilleurs(fiche, { echelonDon: niveauAtteint }),
  )
}

/**
 * Ce don peut-il être pris une fois de plus ? La règle n'est pas réécrite :
 * c'est `refusDons` (un don non cumulable ne se prend qu'une fois) appliquée
 * au compte qu'aurait ce don après la montée.
 */
export function donPrenable(personnage: Personnage, don: Don): boolean {
  // D18 : « déjà pris » vaut aussi pour un don rangé dans un emplacement de
  // capacité troqué — l'anti-doublon des dons ne dépend pas de la porte.
  const compte = (donsPris(ficheDe(personnage))[don.id] ?? 0) + 1
  return refusDons({ [don.id]: compte }).length === 0
}

/** Vrai quand chaque gain de l'échelon atteint a reçu son choix. */
export function choixComplet(niveauAtteint: number, choix: ChoixMontee): boolean {
  return manquesDeLaMontee(niveauAtteint, choix).length === 0
}

/** Le même critère, mais qui NOMME ce qui manque (diagnostic des gates). */
export function manquesDeLaMontee(niveauAtteint: number, choix: ChoixMontee): string[] {
  const gains = gainsMontee(niveauAtteint)
  const manques: string[] = []
  // D18 : l'emplacement de capacité est rempli par une capacité OU un don ;
  // l'emplacement de don, par un don OU une capacité. Le gain reste dû.
  if (!choix.capacite && !choix.donTroque) manques.push('capacité non choisie')
  if (choix.capacite && choix.donTroque) {
    manques.push('capacité et don dans le même emplacement')
  }
  if (gains.dons > 0 && !choix.don && !choix.capTroquee) manques.push('don non choisi')
  if (choix.don && choix.capTroquee) manques.push('don et capacité dans le même emplacement')
  if (gains.caracPoints > 0 && !choix.carac) manques.push('caractéristique non choisie')
  return manques
}

// ---------------------------------------------------------------------------
// L'écriture — une seule mise à jour
// ---------------------------------------------------------------------------

/**
 * Tout ce que la confirmation change sur le personnage, en UN objet : le
 * niveau, la capacité de l'échelon, et le don ou la caractéristique que la
 * ligne de table donne. L'appelant le passe tel quel à un seul `update`.
 *
 * La fiche du wizard (`creation`) avance en même temps que les champs de
 * l'enregistrement : c'est elle que la page de fiche affiche, et elle qui
 * porte l'anti-doublon de la prochaine montée.
 */
export function miseAJourMontee(
  personnage: Personnage,
  niveauAtteint: number,
  choix: ChoixMontee,
  maintenant: number,
): Partial<Personnage> {
  const manques = manquesDeLaMontee(niveauAtteint, choix)
  if (manques.length > 0) {
    throw new Error(`Montée refusée — ${manques.join(', ')}.`)
  }
  const gains = gainsMontee(niveauAtteint)
  const fiche = ficheDe(personnage)

  // D18 : l'emplacement de capacité de l'échelon reçoit une capacité ou un don.
  const capNiveaux = { ...(fiche.capNiveaux ?? {}) }
  const donNiveaux = { ...(fiche.donNiveaux ?? {}) }
  if (choix.capacite) capNiveaux[String(niveauAtteint)] = choix.capacite
  else donNiveaux[String(niveauAtteint)] = choix.donTroque!

  // …et l'emplacement de don, un don ou une capacité de niveau ≤ l'échelon.
  const dons = { ...(fiche.dons ?? {}) }
  const capDons = { ...(fiche.capDons ?? {}) }
  if (gains.dons > 0) {
    if (choix.capTroquee) capDons[String(niveauAtteint)] = choix.capTroquee
    else dons[choix.don!] = (dons[choix.don!] ?? 0) + gains.dons
  }

  const extras = { p: 0, r: 0, e: 0, ...(fiche.extras ?? {}) }
  if (gains.caracPoints > 0) {
    extras[choix.carac!] = extras[choix.carac!] + gains.caracPoints
  }

  const creation: FicheCreation = {
    ...fiche,
    niveau: niveauAtteint,
    capNiveaux,
    donNiveaux,
    capDons,
    dons,
    extras,
  }

  // Un don troqué se range comme les dons, une capacité troquée comme les
  // capacités : la fiche et l'impression ne les distinguent pas. La
  // provenance, elle, reste lisible dans `creation` (donNiveaux / capDons).
  const capacitesGagnees = [choix.capacite, choix.capTroquee].filter(
    (id): id is string => id !== undefined,
  )
  return {
    niveau: niveauAtteint,
    capacites: [...personnage.capacites, ...capacitesGagnees],
    dons: Object.keys(donsPris(creation)),
    caracs: {
      puissance: valeurCarac(creation, 'p'),
      resistance: valeurCarac(creation, 'r'),
      esprit: valeurCarac(creation, 'e'),
    },
    creation,
    updatedAt: maintenant,
  }
}

/**
 * La montée du flux ≤11 : aucun choix. L'échelon donne ce que la table de la
 * planche dit — la capacité unique de la classe, de la Lutte ou des Dégâts —
 * et les stats se recalculent du niveau, elles ne sont pas stockées.
 */
export function miseAJourMonteeEnfant(
  personnage: Personnage,
  niveauAtteint: number,
  maintenant: number,
): Partial<Personnage> {
  // Lève si l'échelon n'existe pas dans la table enfant — même garde que 12+.
  gainsMonteeEnfant(niveauAtteint)
  const fiche = ficheDe(personnage)
  const enfant = { ...(fiche.enfant ?? {}), niveau: niveauAtteint }
  const creation: FicheCreation = { ...fiche, enfant }
  return {
    niveau: niveauAtteint,
    capacites: capacitesEnfantAcquises(enfant.classe, niveauAtteint).map((c) => c.id),
    creation,
    updatedAt: maintenant,
  }
}
