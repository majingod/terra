/**
 * D19 ③ — la carte de RÉCLAMATION du don d'Esprit, sur l'écran Fiche.
 *
 * Q2 (t016, Fred 2026-08-25) : elle s'offre À TOUT NIVEAU, pas seulement au
 * plafond de la table — dès qu'un droit de palier dort sur la fiche, qu'il
 * reste ou non des montées à venir. Sans elle, une fiche en souffrance
 * resterait à « dons : N/N+1 » sans issue avant le plafond.
 *
 * Discrète : repliée, elle tient en deux lignes et un bouton. ⛔ Hors zone
 * d'impression (`pas-a-imprimer`) — la feuille du terrain ne connaît pas les
 * boutons de l'app.
 */
import { useState } from 'react'
import { listeDons } from '../../rules/talents'
import type { Personnage } from '../../db'
import { niveauPalierEsprit3, palierNonConsomme } from '../../wizard/datation'
import {
  donPrenable,
  libelleCarteDonDuPalier,
  libelleConfirmerLaReclamation,
  libelleRaisonDuPalier,
  libelleReclamerLePalier,
} from '../../wizard/montee'
import { CarteDon } from '../creation/SelecteurDons'

interface Props {
  personnage: Personnage
  onReclamer: (donChoisi: string) => void
}

export default function CarteReclamationPalier({ personnage, onReclamer }: Props) {
  const [ouvert, setOuvert] = useState(false)
  const [choisi, setChoisi] = useState<string | undefined>(undefined)
  const fiche = personnage.creation ?? {}

  // Aucun droit en souffrance : la carte n'existe pas. C'est le cas de
  // l'immense majorité des fiches — rien ne doit s'afficher pour elles.
  if (palierNonConsomme(fiche) <= 0) return null

  return (
    <div className="pas-a-imprimer my-3 rounded-lg border border-dashed border-border/50 bg-card/40 p-3.5">
      <h3 className="m-0 mb-1 font-titre text-xl font-bold text-gold">
        {libelleCarteDonDuPalier()}
      </h3>
      <p className="m-0 text-[15px] text-muted-foreground">
        {libelleRaisonDuPalier(niveauPalierEsprit3(fiche))}
      </p>

      {!ouvert ? (
        <button
          type="button"
          className="btn-secondaire mt-3"
          onClick={() => setOuvert(true)}
        >
          {libelleReclamerLePalier()}
        </button>
      ) : (
        <>
          <div className="mt-2">
            {listeDons().map((don) => (
              <CarteDon
                key={don.id}
                don={don}
                n={choisi === don.id ? 1 : 0}
                plein={
                  (choisi !== undefined && choisi !== don.id) || !donPrenable(personnage, don)
                }
                onMaj={(id, n) => setChoisi(n > 0 ? id : undefined)}
              />
            ))}
          </div>
          <div className="mt-3 flex gap-2.5">
            <button
              type="button"
              className="btn-ghost flex-none"
              onClick={() => {
                setChoisi(undefined)
                setOuvert(false)
              }}
            >
              Annuler
            </button>
            <button
              type="button"
              className="btn-cta"
              disabled={choisi === undefined}
              onClick={() => onReclamer(choisi as string)}
            >
              {libelleConfirmerLaReclamation()}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
