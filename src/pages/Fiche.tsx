import { useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { exporterPersonnageJSON, importerPersonnageJSON } from '../utils/exportImport'
import FicheAffichage from './creation/FicheAffichage'
import FicheEnfantAffichage from './creation/enfant/FicheEnfantAffichage'

export default function Fiche() {
  const { id } = useParams()
  const idNombre = Number(id)
  const personnage = useLiveQuery(() => db.personnages.get(idNombre), [idNombre])
  const inputFichier = useRef<HTMLInputElement>(null)

  async function surImport(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0]
    if (!fichier) return
    try {
      await importerPersonnageJSON(fichier)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Import impossible.')
    } finally {
      e.target.value = ''
    }
  }

  if (personnage === undefined) {
    return <p className="text-muted-foreground">Chargement…</p>
  }

  if (personnage === null || !personnage) {
    return (
      <div className="flex flex-col gap-4">
        <p className="carte text-secondary-foreground">Cette fiche n'existe pas.</p>
        <Link to="/" className="btn-secondaire">
          Retour à l'accueil
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {personnage.creation?.enfant ? (
        // Fiche du flux ≤11 : elle se lit du corpus de la planche, jamais du Tome.
        <FicheEnfantAffichage fiche={personnage.creation} />
      ) : personnage.creation ? (
        <FicheAffichage fiche={personnage.creation} />
      ) : (
        <>
          <h1 className="text-2xl font-extrabold text-gold">
            {personnage.nomPerso || 'Sans nom'}
          </h1>

          <div className="carte flex flex-col gap-2">
            <p><span className="font-bold">Faction :</span> {personnage.faction || '—'}</p>
            <p><span className="font-bold">Race :</span> {personnage.race || '—'}</p>
            <p><span className="font-bold">Classe :</span> {personnage.classe || '—'}</p>
            <p><span className="font-bold">Sous-branche :</span> {personnage.sousBranche || '—'}</p>
            <p><span className="font-bold">Niveau :</span> {personnage.niveau}</p>
            <p>
              <span className="font-bold">Caractéristiques :</span> Puissance{' '}
              {personnage.caracs.puissance} · Résistance {personnage.caracs.resistance} · Esprit{' '}
              {personnage.caracs.esprit}
            </p>
          </div>
        </>
      )}

      <div className="pas-a-imprimer flex flex-col gap-3">
        {personnage.creation && (
          <button onClick={() => window.print()} className="btn-secondaire">
            Imprimer / PDF
          </button>
        )}
        <button onClick={() => exporterPersonnageJSON(personnage)} className="btn-secondaire">
          Exporter en JSON
        </button>

        <button onClick={() => inputFichier.current?.click()} className="btn-secondaire">
          Importer une fiche JSON
        </button>
        <input
          ref={inputFichier}
          type="file"
          accept="application/json"
          onChange={surImport}
          className="hidden"
        />
      </div>
    </div>
  )
}
