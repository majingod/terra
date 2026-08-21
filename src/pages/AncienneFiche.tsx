/**
 * D20 ③ — une fiche d'AVANT ce lot.
 *
 * Le critère est l'absence d'historique, jamais une liste de versions ni une
 * comparaison de numéros : une fiche qui ne dit pas QUAND elle a acquis ses
 * niveaux ne peut plus être tenue à jour. Elle s'ouvre donc en lecture seule,
 * avec un bandeau qui le dit dans les mots du joueur, et deux gestes :
 * exporter d'abord, supprimer ensuite.
 *
 * ⛔ Rien n'est supprimé tout seul — ni au démarrage, ni au chargement de la
 * page, ni « pour faire propre ». MUST-FIX « perte de données joueur » : seule
 * une suite de gestes du joueur efface une fiche, et l'export est proposé
 * avant, pas après.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Personnage } from '../db'

/** Le bandeau, mot pour mot (arbitrage Fred, D20 ③). */
export const BANDEAU_ANCIENNE_FICHE =
  'Cette fiche vient d’une version précédente du jeu. Il faut la refaire.'

interface Props {
  personnage: Personnage
  onExporter: () => void
  onSupprimer: () => void
}

export default function AncienneFiche({ personnage, onExporter, onSupprimer }: Props) {
  const [aConfirmer, setAConfirmer] = useState(false)
  const nom = personnage.nomPerso || 'Sans nom'

  return (
    <div className="flex flex-col gap-4">
      <div role="alert" className="err-note">
        {BANDEAU_ANCIENNE_FICHE}
      </div>

      {/* Lecture seule : ce que la fiche portait, sans un seul contrôle qui
          la modifierait — ni montée, ni import, ni retouche. */}
      <h1 className="text-2xl font-extrabold text-gold">{nom}</h1>
      <div className="carte flex flex-col gap-2">
        <p>
          <span className="font-bold">Faction :</span> {personnage.faction || '—'}
        </p>
        <p>
          <span className="font-bold">Race :</span> {personnage.race || '—'}
        </p>
        <p>
          <span className="font-bold">Classe :</span> {personnage.classe || '—'}
        </p>
        <p>
          <span className="font-bold">Niveau :</span> {personnage.niveau}
        </p>
        <p>
          <span className="font-bold">Caractéristiques :</span> Puissance{' '}
          {personnage.caracs.puissance} · Résistance {personnage.caracs.resistance} · Esprit{' '}
          {personnage.caracs.esprit}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <button type="button" className="btn-secondaire" onClick={onExporter}>
          Exporter d’abord
        </button>

        {aConfirmer ? (
          <div className="note flex flex-col gap-2">
            <p className="text-foreground">Supprimer {nom} de cet appareil ?</p>
            <p>Cette fois la fiche est vraiment effacée. Exporte-la d’abord si tu y tiens.</p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-ghost flex-1"
                onClick={() => {
                  setAConfirmer(false)
                  onSupprimer()
                }}
              >
                Oui, supprimer
              </button>
              <button
                type="button"
                className="btn-ghost flex-1"
                onClick={() => setAConfirmer(false)}
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn-secondaire" onClick={() => setAConfirmer(true)}>
            Supprimer
          </button>
        )}

        <Link to="/" className="btn-ghost text-center">
          Retour à l’accueil
        </Link>
      </div>
    </div>
  )
}
