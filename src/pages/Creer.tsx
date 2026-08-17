import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, nouvellePersonnageVierge, type Personnage } from '../db'

const ID_BROUILLON = 1

export default function Creer() {
  const navigate = useNavigate()
  const brouillon = useLiveQuery(() => db.brouillons.get(ID_BROUILLON), [])
  const [donnees, setDonnees] = useState<Partial<Personnage>>(nouvellePersonnageVierge())
  const [charge, setCharge] = useState(false)

  useEffect(() => {
    if (brouillon && !charge) {
      setDonnees(brouillon.donnees)
      setCharge(true)
    } else if (brouillon === undefined && !charge) {
      setCharge(true)
    }
  }, [brouillon, charge])

  function majChamp<K extends keyof Personnage>(champ: K, valeur: Personnage[K]) {
    const suite = { ...donnees, [champ]: valeur }
    setDonnees(suite)
    void db.brouillons.put({ id: ID_BROUILLON, etape: 1, donnees: suite, updatedAt: Date.now() })
  }

  async function creerFiche() {
    const now = Date.now()
    const id = await db.personnages.add({
      ...nouvellePersonnageVierge(),
      ...donnees,
      createdAt: now,
      updatedAt: now,
    } as Omit<Personnage, 'id'>)
    await db.brouillons.delete(ID_BROUILLON)
    navigate(`/fiche/${id}`)
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-extrabold text-ambre-500">Créer un personnage</h1>
      <p className="text-stone-300">
        Assistant de création (placeholder) — les étapes détaillées (race, classe, dons, voies…)
        arriveront avec le contenu des règles. Ta saisie est sauvegardée automatiquement.
      </p>

      <div className="carte flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-lg font-bold">Nom du personnage</span>
          <input
            type="text"
            value={donnees.nomPerso ?? ''}
            onChange={(e) => majChamp('nomPerso', e.target.value)}
            className="min-h-touch rounded-xl border-2 border-stone-600 bg-terre-950 px-4 text-lg text-stone-100"
            placeholder="Ex. Kaelen Sombrelame"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-lg font-bold">Faction</span>
          <input
            type="text"
            value={donnees.faction ?? ''}
            onChange={(e) => majChamp('faction', e.target.value)}
            className="min-h-touch rounded-xl border-2 border-stone-600 bg-terre-950 px-4 text-lg text-stone-100"
            placeholder="Ex. Sanctum, Légion…"
          />
        </label>

        <label className="flex min-h-touch items-center gap-3">
          <input
            type="checkbox"
            checked={donnees.joueurMineur ?? false}
            onChange={(e) => majChamp('joueurMineur', e.target.checked)}
            className="h-8 w-8 accent-ambre-500"
          />
          <span className="text-lg font-bold">Le joueur ou la joueuse est mineur·e</span>
        </label>
      </div>

      <button onClick={creerFiche} className="btn-grand" disabled={!donnees.nomPerso}>
        Créer la fiche
      </button>
    </div>
  )
}
