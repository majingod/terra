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
    joueurMineur: reste.joueurMineur ?? false,
    faction: reste.faction ?? '',
    race: reste.race ?? '',
    classe: reste.classe ?? '',
    sousBranche: reste.sousBranche ?? '',
    caracs: reste.caracs ?? { puissance: 0, resistance: 0, esprit: 0 },
    dons: reste.dons ?? [],
    competences: reste.competences ?? [],
    capacites: reste.capacites ?? [],
    langues: reste.langues ?? [],
    niveau: reste.niveau ?? 1,
    ressources: reste.ressources ?? {},
    createdAt: reste.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  }

  await db.personnages.add(personnage)
}
