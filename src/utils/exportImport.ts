/**
 * Export / import JSON d'une fiche.
 *
 * D16 : un ancien export reste lisible — ses champs d'époque (`sousBranche`,
 * `creation.voie`) sont recopiés tels quels, jamais exigés ; un nouvel export
 * ne les porte plus.
 */
import { db, type Personnage } from '../db'

export function exporterPersonnageJSON(personnage: Personnage) {
  const blob = new Blob([JSON.stringify(personnage, null, 2)], {
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
    throw new Error('Fichier invalide : champ "nomPerso" manquant.')
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
