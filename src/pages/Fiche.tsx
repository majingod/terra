/**
 * La fiche d'un personnage enregistré.
 *
 * Le repli d'AVANT le wizard (une fiche sans `creation`) ne montre plus la
 * ligne « Sous-branche » : la voie n'est plus un enclos depuis D16, et le
 * libellé ne veut plus rien dire à l'écran. Le champ, lui, reste stocké tel
 * quel sur les vieux enregistrements — jamais renommé, jamais effacé (D16 ⑨).
 *
 * D17 : depuis deux ans, les personnages gagnent des niveaux ENTRE les GN —
 * la fiche monte, elle ne se recrée pas. Sous le contenu (et hors zone
 * d'impression) : « Monter au niveau {N+1} », ou, au plafond de la table, la
 * ligne « vois ton MJ ». Le MJ arbitre la quête ; l'app ne garde rien.
 */
import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Personnage } from '../db'
import { niveauMaxEnfant, normaliserNiveauEnfant } from '../rules/kids'
import { niveauAtteignable, niveauAtteignableEnfant } from '../rules/montee'
import { niveauMax } from '../rules/niveau'
import {
  miseAJourMontee,
  miseAJourMonteeEnfant,
  niveauDeLaFiche,
  type ChoixMontee,
} from '../wizard/montee'
import { exporterPersonnageJSON, importerPersonnageJSON } from '../utils/exportImport'
import FicheAffichage from './creation/FicheAffichage'
import FicheEnfantAffichage from './creation/enfant/FicheEnfantAffichage'
import BoutonMontee from './montee/BoutonMontee'
import EcranMontee from './montee/EcranMontee'
import EcranMonteeEnfant from './montee/EcranMonteeEnfant'

export default function Fiche() {
  const { id } = useParams()
  const idNombre = Number(id)
  const personnage = useLiveQuery(() => db.personnages.get(idNombre), [idNombre])
  const inputFichier = useRef<HTMLInputElement>(null)
  const [enMontee, setEnMontee] = useState(false)

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

  // Le flux de la fiche se lit de la fiche elle-même : la planche enfant et
  // le Tome ne se mélangent pas, ici pas plus qu'ailleurs.
  const enfant = Boolean(personnage.creation?.enfant)
  const niveauCourant = enfant
    ? normaliserNiveauEnfant(personnage.creation?.enfant?.niveau)
    : niveauDeLaFiche(personnage)
  const niveauAtteint = enfant
    ? niveauAtteignableEnfant(niveauCourant)
    : niveauAtteignable(niveauCourant)
  const plafond = enfant ? niveauMaxEnfant() : niveauMax()

  /** D7 : une SEULE mise à jour — niveau, capacité, don ou caractéristique. */
  async function confirmer(maj: Partial<Personnage>) {
    await db.personnages.update(personnage!.id as number, maj)
    setEnMontee(false)
  }

  if (enMontee && niveauAtteint !== undefined) {
    return enfant ? (
      <EcranMonteeEnfant
        personnage={personnage}
        niveauAtteint={niveauAtteint}
        onConfirmer={() =>
          void confirmer(miseAJourMonteeEnfant(personnage, niveauAtteint, Date.now()))
        }
        onAnnuler={() => setEnMontee(false)}
      />
    ) : (
      <EcranMontee
        personnage={personnage}
        niveauAtteint={niveauAtteint}
        onConfirmer={(choix: ChoixMontee) =>
          void confirmer(miseAJourMontee(personnage, niveauAtteint, choix, Date.now()))
        }
        onAnnuler={() => setEnMontee(false)}
      />
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
            <p><span className="font-bold">Niveau :</span> {personnage.niveau}</p>
            <p>
              <span className="font-bold">Caractéristiques :</span> Puissance{' '}
              {personnage.caracs.puissance} · Résistance {personnage.caracs.resistance} · Esprit{' '}
              {personnage.caracs.esprit}
            </p>
          </div>
        </>
      )}

      {/* La montée part de la fiche du wizard : une fiche d'avant le wizard
          n'a ni classe identifiée ni emplacements de capacité — elle ne
          monte pas ici (écart rapporté, rien n'est inventé à sa place). */}
      {personnage.creation && (
        <BoutonMontee
          niveauAtteint={niveauAtteint}
          plafond={plafond}
          onMonter={() => setEnMontee(true)}
        />
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
