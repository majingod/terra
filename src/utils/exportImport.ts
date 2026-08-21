/**
 * Export / import JSON d'une fiche.
 *
 * D16 : un ancien export reste lisible — ses champs d'époque (`sousBranche`,
 * `creation.voie`) sont recopiés tels quels, jamais exigés ; un nouvel export
 * ne les porte plus.
 *
 * D20 : le JSON exporté porte la MARQUE de sa version (`versionJeu`, lue des
 * données, jamais un numéro écrit ici). À l'import, un fichier d'une version
 * précédente est refusé — et le refus se lit : ⛔ jamais une erreur technique,
 * jamais un nom de champ, jamais un numéro. Le CRITÈRE du refus est celui de
 * toute l'app : une fiche sans historique ne peut plus être tenue à jour.
 */
import { getVersion } from '../rules/load'
import { estAncienneFiche } from '../wizard/historique'
import { db, type Personnage } from '../db'

/**
 * Le refus d'un fichier d'ancienne version, mot pour mot (arbitrage Fred,
 * D20 ③) — écrit pour être compris par un joueur de 12 ans.
 */
export const REFUS_ANCIENNE_VERSION =
  'Ce personnage vient d’une version précédente du jeu : il faut le refaire.'

/** Ce qu'un fichier exporté contient : la fiche, et la marque de sa version. */
export type FicheExportee = Personnage & { versionJeu?: string }

export function exporterPersonnageJSON(personnage: Personnage) {
  const contenu: FicheExportee = { ...personnage, versionJeu: getVersion() }
  const blob = new Blob([JSON.stringify(contenu, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const nomFichier = (personnage.nomPerso || 'fiche').replace(/[^a-z0-9-_]+/gi, '_')
  a.href = url
  a.download = `terra-mortis-${nomFichier}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function importerPersonnageJSON(fichier: File): Promise<void> {
  const texte = await fichier.text()
  const donnees = JSON.parse(texte) as Partial<Personnage>

  if (!donnees.nomPerso) {
    throw new Error('Ce fichier ne contient pas de personnage.')
  }

  // D20 : même critère qu'à l'écran — sans historique, la fiche vient d'une
  // version précédente et doit être refaite. La marque `versionJeu` du fichier
  // n'est pas ce qui décide : ⛔ pas de liste de versions, pas de comparaison
  // de numéros.
  if (estAncienneFiche(donnees.creation)) {
    throw new Error(REFUS_ANCIENNE_VERSION)
  }

  const { id: _ignoreId, ...reste } = donnees
  const personnage: Omit<Personnage, 'id'> = {
    nomPerso: reste.nomPerso ?? '',
    faction: reste.faction ?? '',
    race: reste.race ?? '',
    classe: reste.classe ?? '',
    // Champ d'époque (v1) : recopié tel quel quand un vieil export le porte,
    // jamais fabriqué quand il n'y est pas (D16).
    sousBranche: reste.sousBranche,
    caracs: reste.caracs ?? { puissance: 0, resistance: 0, esprit: 0 },
    dons: reste.dons ?? [],
    competences: reste.competences ?? [],
    capacites: reste.capacites ?? [],
    langues: reste.langues ?? [],
    niveau: reste.niveau ?? 1,
    ressources: reste.ressources ?? {},
    createdAt: reste.createdAt ?? Date.now(),
    updatedAt: Date.now(),
    trancheAge: reste.trancheAge,
    reglesVersion: reste.reglesVersion,
    creation: reste.creation,
  }

  await db.personnages.add(personnage)
}
