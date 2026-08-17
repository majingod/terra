import Dexie, { type EntityTable } from 'dexie'

export interface Caracteristiques {
  puissance: number
  resistance: number
  esprit: number
}

export interface Personnage {
  id?: number
  nomPerso: string
  joueurMineur: boolean
  faction: string
  race: string
  classe: string
  sousBranche: string
  caracs: Caracteristiques
  dons: string[]
  competences: string[]
  capacites: string[]
  langues: string[]
  niveau: number
  ressources: Record<string, number>
  createdAt: number
  updatedAt: number
}

export interface Brouillon {
  id?: number
  etape: number
  donnees: Partial<Personnage>
  updatedAt: number
}

export const db = new Dexie('TerraMortisDB') as Dexie & {
  personnages: EntityTable<Personnage, 'id'>
  brouillons: EntityTable<Brouillon, 'id'>
}

db.version(1).stores({
  personnages: '++id, nomPerso, faction, race, classe, niveau, updatedAt',
  brouillons: '++id, updatedAt',
})

export function nouvellePersonnageVierge(): Omit<Personnage, 'id'> {
  const now = Date.now()
  return {
    nomPerso: '',
    joueurMineur: false,
    faction: '',
    race: '',
    classe: '',
    sousBranche: '',
    caracs: { puissance: 0, resistance: 0, esprit: 0 },
    dons: [],
    competences: [],
    capacites: [],
    langues: [],
    niveau: 1,
    ressources: {},
    createdAt: now,
    updatedAt: now,
  }
}
