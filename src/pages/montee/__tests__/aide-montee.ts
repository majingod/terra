/**
 * Fabriques des gates D17 : un personnage ENREGISTRÉ, pas une fiche en
 * cours. La montée part de ce qui est dans le magasin.
 *
 * Le mapping est celui de la création (`Creer.enregistrer`) : capacités de
 * base + choix de niveaux + achats XP, caractéristiques calculées. D5 : rien
 * n'est recopié du Tome ici — tout est déduit de rules.json.
 */
import { capacitesDeBase } from '../../../rules/branches'
import { capacitesEnfantAcquises, classeEnfant, factionEnfant, getVersionKids, normaliserNiveauEnfant, raceEnfant } from '../../../rules/kids'
import { languesAcquises } from '../../../rules/langues'
import { getRules, getVersion } from '../../../rules/load'
import { normaliserNiveau } from '../../../rules/niveau'
import { classeSquelette, raceDe, valeurCarac } from '../../../rules/stats'
import { nouvellePersonnageVierge, type Personnage } from '../../../db'
import type { FicheCreation } from '../../../wizard/types'

/** Le personnage tel que la création l'écrit dans Dexie (12+). */
export function personnageDeLaFiche(fiche: FicheCreation): Omit<Personnage, 'id'> {
  const regles = getRules()
  const classe = classeSquelette(fiche.classe)
  const maintenant = Date.now()
  return {
    ...nouvellePersonnageVierge(),
    nomPerso: fiche.nom ?? '',
    faction: regles.factions.liste.find((f) => f.id === fiche.faction)?.nom ?? '',
    race: raceDe(fiche.race)?.nom ?? '',
    classe: classe?.nom ?? '',
    caracs: {
      puissance: valeurCarac(fiche, 'p'),
      resistance: valeurCarac(fiche, 'r'),
      esprit: valeurCarac(fiche, 'e'),
    },
    dons: Object.keys(fiche.dons ?? {}),
    competences: [...(fiche.comps ?? [])],
    capacites: [
      ...capacitesDeBase(fiche.classe ?? '').map((c) => c.id),
      ...Object.values(fiche.capNiveaux ?? {}),
      ...Object.values(fiche.capChoix ?? {}).flat(),
    ],
    niveau: normaliserNiveau(fiche.niveau),
    langues: [...languesAcquises(fiche.race, fiche.classe), ...(fiche.langChoix ?? [])],
    createdAt: maintenant,
    updatedAt: maintenant,
    trancheAge: fiche.trancheAge,
    reglesVersion: getVersion(),
    creation: { ...fiche, reglesVersion: getVersion() },
  }
}

/** Le personnage tel que le flux ≤11 l'écrit dans Dexie. */
export function personnageEnfant(fiche: FicheCreation): Omit<Personnage, 'id'> {
  const choix = fiche.enfant ?? {}
  const niveau = normaliserNiveauEnfant(choix.niveau)
  const maintenant = Date.now()
  return {
    ...nouvellePersonnageVierge(),
    nomPerso: choix.nom ?? '',
    faction: factionEnfant(choix.faction)?.nom ?? '',
    race: raceEnfant().nom,
    classe: classeEnfant(choix.classe)?.nom ?? '',
    capacites: capacitesEnfantAcquises(choix.classe, niveau).map((c) => c.id),
    niveau,
    createdAt: maintenant,
    updatedAt: maintenant,
    trancheAge: fiche.trancheAge,
    reglesVersion: getVersionKids(),
    creation: { ...fiche, reglesVersion: getVersionKids() },
  }
}
