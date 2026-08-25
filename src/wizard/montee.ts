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
import { valeurCarac } from '../rules/stats'
import type { Don } from '../rules/load'
import { normaliserNiveau } from '../rules/niveau'
import type { Personnage } from '../db'
import { prisesAilleurs, optionsDuNiveau, type OptionDeCapacite } from './capacites'
import {
  agregatAvecPrise,
  donsDuPalierEsprit,
  niveauPalierEsprit3,
  palierNonConsomme,
  rangDuDroitDePalier,
  seuilPalierEsprit,
} from './datation'
import { avecMontee, estAncienneFiche, niveauCourant, niveauDerive } from './historique'
import {
  donsPris,
  optionsDeTrocCapacite,
  optionsDeTrocDon,
  type OptionDeDon,
} from './troc'
import type { CleCarac, FicheCreation } from './types'

/** Les trois clés de caractéristique, dans l'ordre de la répartition. */
export type { CleCarac }

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

/**
 * D19 ③ — le titre de l'emplacement SUPPLÉMENTAIRE que le palier d'Esprit
 * ouvre. Le seuil se lit de la table cumulative (D5 : aucun « 3 » écrit ici).
 */
export function libelleCarteDonDuPalier(): string {
  return `Don d'Esprit ${seuilPalierEsprit() ?? ''}`.trim()
}

/** La ligne sous ce titre : pourquoi cet emplacement est là. */
export function libelleRaisonDuPalier(niveauDuPalier?: number): string {
  const seuil = seuilPalierEsprit() ?? ''
  if (niveauDuPalier === undefined) {
    return `Ton Esprit atteint ${seuil} : la table des caractéristiques t'ouvre un don.`
  }
  return `Ton Esprit a atteint ${seuil} au niveau ${niveauDuPalier} : ce don date de là.`
}

/**
 * D19 ③ — le bouton de la carte de réclamation, sur l'écran Fiche : le
 * personnage est au plafond de la table, son droit de palier n'a jamais eu
 * d'emplacement où aller, et c'est la seule porte qui lui reste.
 */
export function libelleReclamerLePalier(): string {
  return 'Choisir ce don'
}

/** Le bouton qui ÉCRIT la réclamation, une fois le don posé. */
export function libelleConfirmerLaReclamation(): string {
  return 'Réclamer ce don'
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
  /**
   * D19 ③ — le don de l'emplacement SUPPLÉMENTAIRE ouvert par le palier
   * d'Esprit : celui que la montée en cours ouvre, ou celui qu'une montée
   * passée a laissé non consommé. Ce n'est ni l'emplacement de capacité ni
   * celui de don de l'échelon : c'est un troisième, qui vient de la table
   * des caractéristiques.
   */
  donPalier?: string
}

/**
 * La fiche telle qu'elle sera à l'échelon atteint, AVANT tout choix : c'est
 * sur elle que se demande le bassin de capacités, pour que l'emplacement du
 * nouveau niveau existe.
 */
function ficheDe(personnage: Personnage): FicheCreation {
  return personnage.creation ?? {}
}

/**
 * Le niveau du personnage — D20 : un fait DÉRIVÉ de son historique (montées
 * + 1). Une fiche d'avant D20 n'en a pas : son seul niveau est celui, archivé,
 * de l'enregistrement, que plus rien ne fait bouger.
 */
export function niveauDeLaFiche(personnage: Personnage): number {
  return niveauDerive(personnage.creation) ?? normaliserNiveau(personnage.niveau)
}

/**
 * La fiche telle que la montée la ferait : l'échelon atteint s'ajoute à
 * l'historique — c'est de LUI que le niveau se dérive (D20) — et la capacité
 * posée (s'il y en a une) occupe son emplacement. C'est elle qu'on montre.
 *
 * L'aperçu n'est jamais écrit : sa date est celle que l'appelant donne, et
 * `miseAJourMontee` refait l'entrée avec l'horodatage de la confirmation.
 */
export function ficheDeLaMontee(
  personnage: Personnage,
  niveauAtteint: number,
  choix: ChoixMontee = {},
  maintenant = 0,
): FicheCreation {
  const fiche = ficheDe(personnage)
  const capNiveaux = { ...(fiche.capNiveaux ?? {}) }
  if (choix.capacite) capNiveaux[String(niveauAtteint)] = choix.capacite
  // D18 : l'emplacement porte l'un OU l'autre — jamais les deux.
  const donNiveaux = { ...(fiche.donNiveaux ?? {}) }
  if (choix.donTroque) donNiveaux[String(niveauAtteint)] = choix.donTroque
  const capDons = { ...(fiche.capDons ?? {}) }
  if (choix.capTroquee) capDons[String(niveauAtteint)] = choix.capTroquee
  return {
    ...fiche,
    historique: avecMontee(fiche, niveauAtteint, maintenant),
    capNiveaux,
    donNiveaux,
    capDons,
  }
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

/** Les trois emplacements de la montée qui peuvent recevoir un DON. */
export type EmplacementDeDon = 'don' | 'donTroque' | 'donPalier'

const EMPLACEMENTS_DE_DON: EmplacementDeDon[] = ['don', 'donTroque', 'donPalier']

/** Les dons que la montée pose AILLEURS que dans l'emplacement qu'on regarde. */
function donsPosesAilleurs(choix: ChoixMontee, emplacement: EmplacementDeDon): string[] {
  return EMPLACEMENTS_DE_DON.filter((cle) => cle !== emplacement)
    .map((cle) => choix[cle])
    .filter((id): id is string => id !== undefined)
}

/**
 * Ce don peut-il être pris une fois de plus ? La règle n'est pas réécrite :
 * c'est `refusDons` (un don non cumulable ne se prend qu'une fois) appliquée
 * au compte qu'aurait ce don après la montée.
 *
 * D19 ③ : la montée peut désormais poser jusqu'à TROIS dons (l'échelon, le
 * troc du guerrier, le palier d'Esprit). Un don déjà posé dans un autre
 * emplacement de la même montée compte comme pris — l'anti-doublon ne dépend
 * pas de la porte.
 */
export function donPrenable(
  personnage: Personnage,
  don: Don,
  choix: ChoixMontee = {},
  emplacement: EmplacementDeDon = 'don',
): boolean {
  // D18 : « déjà pris » vaut aussi pour un don rangé dans un emplacement de
  // capacité troqué — l'anti-doublon des dons ne dépend pas de la porte.
  const dejaPris = donsPris(ficheDe(personnage))[don.id] ?? 0
  const enCours = donsPosesAilleurs(choix, emplacement).filter((id) => id === don.id).length
  return refusDons({ [don.id]: dejaPris + enCours + 1 }).length === 0
}

// ---------------------------------------------------------------------------
// D19 ③ — l'emplacement supplémentaire du palier d'Esprit
// ---------------------------------------------------------------------------

/** L'Esprit qu'aura le personnage une fois CETTE montée confirmée. */
function espritApresLaMontee(
  personnage: Personnage,
  niveauAtteint: number,
  choix: ChoixMontee,
): number {
  const fiche = ficheDe(personnage)
  const gains = gainsMontee(niveauAtteint)
  const pose = choix.carac === 'e' ? gains.caracPoints : 0
  return valeurCarac(fiche, 'e') + pose
}

/**
 * Combien de dons du palier d'Esprit CETTE montée doit faire choisir.
 *
 * Deux cas, le même compte : la montée en cours pousse l'Esprit au palier
 * (le point de la ligne de table posé sur l'Esprit), ou un droit de palier
 * est resté non consommé d'une montée passée — jusqu'ici il n'avait aucun
 * emplacement où aller.
 */
export function donsDePalierDeLaMontee(
  personnage: Personnage,
  niveauAtteint: number,
  choix: ChoixMontee = {},
): number {
  const fiche = ficheDe(personnage)
  const ouverts = donsDuPalierEsprit(espritApresLaMontee(personnage, niveauAtteint, choix))
  // Ce que le palier avait déjà ouvert ET que la fiche a déjà consommé.
  const consommes = Math.max(
    0,
    donsDuPalierEsprit(valeurCarac(fiche, 'e')) - palierNonConsomme(fiche),
  )
  return Math.max(0, ouverts - consommes)
}

/**
 * Le niveau dont ce don de palier DATERA — celui où l'Esprit a atteint le
 * palier. Déjà atteint avant cette montée : la dérivation le dit ; atteint
 * PAR cette montée : c'est l'échelon qu'on est en train de gagner.
 */
export function niveauDuPalierDeLaMontee(
  personnage: Personnage,
  niveauAtteint: number,
  choix: ChoixMontee = {},
): number | undefined {
  if (donsDePalierDeLaMontee(personnage, niveauAtteint, choix) === 0) return undefined
  return niveauPalierEsprit3(ficheDe(personnage)) ?? niveauAtteint
}

/**
 * Le bassin de l'emplacement du palier : TOUT le catalogue, comme partout
 * ailleurs. C'est l'appelant qui éteint ce qui ne se prend pas — la carte de
 * don ne connaît aucune règle.
 */
export function donPrenableAuPalier(
  personnage: Personnage,
  don: Don,
  choix: ChoixMontee = {},
): boolean {
  return donPrenable(personnage, don, choix, 'donPalier')
}

/** Vrai quand chaque gain de l'échelon atteint a reçu son choix. */
export function choixComplet(
  personnage: Personnage,
  niveauAtteint: number,
  choix: ChoixMontee,
): boolean {
  return manquesDeLaMontee(personnage, niveauAtteint, choix).length === 0
}

/** Le même critère, mais qui NOMME ce qui manque (diagnostic des gates). */
export function manquesDeLaMontee(
  personnage: Personnage,
  niveauAtteint: number,
  choix: ChoixMontee,
): string[] {
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
  // D19 ③ — l'emplacement du palier d'Esprit, quand la montée l'ouvre (ou
  // qu'une montée passée l'a laissé ouvert).
  const dusPalier = donsDePalierDeLaMontee(personnage, niveauAtteint, choix)
  if (dusPalier > 0 && !choix.donPalier) manques.push('don du palier d’Esprit non choisi')
  if (dusPalier === 0 && choix.donPalier) manques.push('don de palier sans droit de palier')
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
  const manques = manquesDeLaMontee(personnage, niveauAtteint, choix)
  if (manques.length > 0) {
    throw new Error(`Montée refusée — ${manques.join(', ')}.`)
  }
  const gains = gainsMontee(niveauAtteint)
  const fiche = ficheDe(personnage)
  // D20 : une fiche d'avant l'historique ne monte pas — elle se refait.
  if (estAncienneFiche(fiche)) {
    throw new Error(
      'Montée refusée — cette fiche vient d’une version précédente du jeu : il faut la refaire.',
    )
  }

  // D18 : l'emplacement de capacité de l'échelon reçoit une capacité ou un don.
  const capNiveaux = { ...(fiche.capNiveaux ?? {}) }
  const donNiveaux = { ...(fiche.donNiveaux ?? {}) }
  if (choix.capacite) capNiveaux[String(niveauAtteint)] = choix.capacite
  else donNiveaux[String(niveauAtteint)] = choix.donTroque!

  // …et l'emplacement de don, un don ou une capacité de niveau ≤ l'échelon.
  const dons = { ...(fiche.dons ?? {}) }
  const capDons = { ...(fiche.capDons ?? {}) }
  // D19 ③ — le don du palier s'inscrit AVANT celui de l'échelon : il date
  // d'un niveau antérieur ou égal (l'Esprit y a atteint le palier), et
  // l'agrégat garde ainsi l'ordre chronologique dont la datation se sert.
  const dusPalier = donsDePalierDeLaMontee(personnage, niveauAtteint, choix)
  if (dusPalier > 0) {
    dons[choix.donPalier!] = (dons[choix.donPalier!] ?? 0) + dusPalier
  }
  if (gains.dons > 0) {
    if (choix.capTroquee) capDons[String(niveauAtteint)] = choix.capTroquee
    else dons[choix.don!] = (dons[choix.don!] ?? 0) + gains.dons
  }

  const extras = { p: 0, r: 0, e: 0, ...(fiche.extras ?? {}) }
  // D20 : les points que CET échelon donne sont datés dans l'historique, avec
  // la caractéristique qui les reçoit — c'est ce qui rend le niveau
  // d'acquisition retrouvable (D19 lot 3).
  const caracsDeLEchelon: Partial<Record<CleCarac, number>> = {}
  if (gains.caracPoints > 0) {
    extras[choix.carac!] = extras[choix.carac!] + gains.caracPoints
    caracsDeLEchelon[choix.carac!] = gains.caracPoints
  }

  const creation: FicheCreation = {
    ...fiche,
    historique: avecMontee(fiche, niveauAtteint, maintenant, caracsDeLEchelon),
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
    // ⛔ Le niveau écrit sur l'enregistrement est le niveau DÉRIVÉ de
    // l'historique qu'on vient d'écrire : deux sources qui pourraient
    // diverger, c'est le trou de D19.
    niveau: niveauCourant(creation),
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
 * D19 ③ — RÉCLAMER le don du palier d'Esprit hors d'une montée.
 *
 * Cas résiduel : le personnage est au plafond de la table (il ne monte plus)
 * et porte un droit de palier que rien n'a consommé. L'écran Fiche lui offre
 * alors la seule porte qui reste — et elle écrit exactement comme la montée :
 * une SEULE mise à jour, la fiche du wizard et l'enregistrement d'un coup.
 *
 * ⛔ Aucun niveau n'est gagné ici : l'historique n'est pas touché. Le don
 * garde donc la date que la dérivation lui rend — le niveau où l'Esprit a
 * atteint le palier — quel que soit le jour où le joueur le choisit.
 */
export function miseAJourReclamationPalier(
  personnage: Personnage,
  donChoisi: string,
  maintenant: number,
): Partial<Personnage> {
  const fiche = ficheDe(personnage)
  if (estAncienneFiche(fiche)) {
    throw new Error(
      'Réclamation refusée — cette fiche vient d’une version précédente du jeu : il faut la refaire.',
    )
  }
  const du = palierNonConsomme(fiche)
  if (du <= 0) {
    throw new Error('Réclamation refusée — aucun droit de palier d’Esprit à réclamer.')
  }
  // Le droit réclamé est ANCIEN — il date du niveau où l'Esprit a atteint le
  // palier. La prise se range donc à SA place dans l'agrégat, pas au bout :
  // c'est ce qui garde `fiche.dons` dans l'ordre des droits consommés, et
  // c'est de cet ordre que la datation se sert.
  let dons = { ...(fiche.dons ?? {}) }
  const rang = rangDuDroitDePalier(fiche)
  for (let i = 0; i < du; i++) dons = agregatAvecPrise(dons, donChoisi, rang)
  const refus = refusDons({ [donChoisi]: dons[donChoisi] })
  if (refus.length > 0) {
    throw new Error(`Réclamation refusée — ${refus.join(', ')}.`)
  }
  const creation: FicheCreation = { ...fiche, dons }
  return {
    dons: Object.keys(donsPris(creation)),
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
