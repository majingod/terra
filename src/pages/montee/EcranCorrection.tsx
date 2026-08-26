/**
 * D20 lot 2 — la montée ROUVERTE (MAQUETTE_FIL_D20_v3, écran ①).
 *
 * Toucher une pastille verte rouvre la montée de ce niveau-là, PRÉ-REMPLIE
 * avec les choix d'alors — retrouvés des données par `choixDAlors`, jamais
 * d'un champ qui les aurait stockés (il n'en existe pas, et D7 interdit d'en
 * ajouter un). Les niveaux au-dessus restent : c'est une chirurgie.
 *
 * Deux régimes, ceux de la maquette :
 * - un changement SANS perte (une capacité contre une autre libre, un don
 *   contre un autre libre) s'applique sans fenêtre — « rien n'en dépend » ;
 * - un changement AVEC pertes ouvre la fenêtre de répercussions AVANT que
 *   quoi que ce soit s'applique.
 *
 * ⛔ Cet écran ne connaît aucune règle : les bassins viennent de
 * `wizard/cascade`, qui s'appuie lui-même sur `optionsDuNiveau` et le troc
 * D18 — les mêmes que la création et la montée normale.
 *
 * ⚠️ Chaque ouverture est un écran NEUF (`key` par niveau chez l'appelant) :
 * sans elle, React réutiliserait l'instance et les choix d'un niveau
 * fuiraient dans un autre (la gate ③ de #23 a déjà attrapé cette fuite).
 */
import { useState } from 'react'
import { getRules } from '../../rules/load'
import { gainsMontee } from '../../rules/montee'
import { valeurCarac } from '../../rules/stats'
import { listeDons } from '../../rules/talents'
import {
  prendUnDonAuLieuDUneCapacite,
  prendUneCapaciteAuLieuDUnDon,
} from '../../rules/troc'
import type { Personnage } from '../../db'
import {
  choixDAlors,
  correctionComplete,
  corrigerChoix,
  donPrenableALaCorrection,
  fusionnerChoix,
  libelleChangementDuPoint,
  libelleChoixDAlors,
  libelleMonteeRouverte,
  optionsDeLaCorrection,
  optionsDeTrocDeDonDeLaCorrection,
  optionsDeTrocDeLaCorrection,
} from '../../wizard/cascade'
import { caracsDuNiveau } from '../../wizard/historique'
import {
  libelleCarteCapacite,
  libelleCarteDonDuPalier,
  type ChoixMontee,
  type CleCarac,
} from '../../wizard/montee'
import {
  libellePlafondDuTroc,
  libelleTrocDuGuerrier,
  libelleTrocDuMage,
} from '../../wizard/troc'
import { CARACS } from '../creation/EtapeForces'
import SelecteurCapacites, { SelecteurTrocDeDon } from '../creation/SelecteurCapacites'
import { CarteDon } from '../creation/SelecteurDons'
import FenetreRepercussions from './FenetreRepercussions'

/** Un étage de l'écran rouvert — le titre, puis ce qu'il demande. */
function CarteGain({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div className="my-3 rounded-lg border border-border/50 bg-card/50 p-3.5 backdrop-blur-sm">
      <h3 className="m-0 mb-2 font-titre text-xl font-bold text-gold">{titre}</h3>
      {children}
    </div>
  )
}

interface Props {
  personnage: Personnage
  /** Le niveau TRAVERSÉ qu'on rouvre (≥ le deuxième échelon de la table). */
  niveau: number
  /** Appelé à la confirmation — avec les choix corrigés, jamais avant. */
  onCorriger: (choix: ChoixMontee) => void
  onAnnuler: () => void
}

export default function EcranCorrection({
  personnage,
  niveau,
  onCorriger,
  onAnnuler,
}: Props) {
  const alors = choixDAlors(personnage, niveau)
  const [choix, setChoix] = useState<ChoixMontee>(alors)
  /** Le geste en attente de confirmation : il n'a RIEN écrit encore. */
  const [enAttente, setEnAttente] = useState<ChoixMontee | null>(null)

  const regles = getRules()
  const gains = gainsMontee(niveau)
  const max = regles.caracteristiques.creation.max
  const ancienne = (Object.keys(caracsDuNiveau(personnage.creation, niveau)) as CleCarac[])[0]

  /**
   * Le geste : on DÉRIVE ce qu'il ferait. Sans perte, il s'applique tout de
   * suite ; avec pertes, la fenêtre s'ouvre et rien ne bouge avant elle.
   */
  function poser(retouche: ChoixMontee) {
    const candidat = fusionnerChoix(choix, retouche)
    setChoix(candidat)
    if (corrigerChoix(personnage, niveau, candidat).pertes.length > 0) setEnAttente(candidat)
    else setEnAttente(null)
  }

  /** Annuler la fenêtre : les choix redeviennent ceux d'alors, rien n'a bougé. */
  function renoncer() {
    setEnAttente(null)
    setChoix(alors)
  }

  const complet = correctionComplete(personnage, niveau, choix)
  const modifie = JSON.stringify(choix) !== JSON.stringify(alors)

  return (
    <section>
      <h2 className="titre-etape">
        {libelleMonteeRouverte(niveau)}{' '}
        <em className="font-normal text-[0.7em] text-muted-foreground">
          ({libelleChoixDAlors()})
        </em>
      </h2>

      {gains.caracPoints > 0 && (
        <CarteGain titre="Le point de caractéristique">
          <div className="flex gap-2">
            {CARACS.map(({ cle, table, nom, couleur }) => {
              // La valeur MONTRÉE est celle que la fiche aurait si le point
              // allait là : on retire d'abord celui que cet échelon a donné.
              const socle =
                valeurCarac(personnage.creation ?? {}, cle) -
                (caracsDuNiveau(personnage.creation, niveau)[cle] ?? 0)
              const apres = socle + gains.caracPoints
              const auMax = apres > max
              const palier = regles.caracteristiques.table[table][String(apres)]
              return (
                <button
                  key={cle}
                  type="button"
                  disabled={auMax}
                  aria-pressed={choix.carac === cle}
                  onClick={() => poser({ carac: cle })}
                  className={`min-h-touch flex-1 rounded-lg border p-2.5 text-center transition-all duration-300 ${
                    choix.carac === cle
                      ? 'border-2 border-primary bg-primary/[0.08] glow-gold'
                      : 'border-border/50 bg-muted/40'
                  } ${auMax ? 'cursor-not-allowed opacity-40' : ''}`}
                >
                  <b className={`block text-[15.5px] ${couleur}`}>{nom}</b>
                  <span className="block font-wordmark text-lg font-extrabold text-gold">
                    {socle} → {apres}
                  </span>
                  {palier && (
                    <small className="block text-[13px] text-muted-foreground">{palier}</small>
                  )}
                </button>
              )
            })}
          </div>
        </CarteGain>
      )}

      {/* D19 ③ — le don du palier ne se rouvre QUE là où la datation le date :
          ailleurs, il appartient à un autre échelon, et on n'y touche pas. */}
      {choix.donPalier !== undefined && (
        <CarteGain titre={libelleCarteDonDuPalier()}>
          {listeDons().map((don) => (
            <CarteDon
              key={don.id}
              don={don}
              n={choix.donPalier === don.id ? 1 : 0}
              plein={
                choix.donPalier !== don.id &&
                !donPrenableALaCorrection(personnage, niveau, don.id, choix, 'donPalier')
              }
              onMaj={(id, n) => poser({ donPalier: n > 0 ? id : undefined })}
            />
          ))}
        </CarteGain>
      )}

      {gains.dons > 0 && (
        <CarteGain titre={`Le don du niveau ${niveau}`}>
          {listeDons().map((don) => (
            <CarteDon
              key={don.id}
              don={don}
              n={choix.don === don.id ? 1 : 0}
              plein={
                choix.don !== don.id &&
                !donPrenableALaCorrection(personnage, niveau, don.id, choix, 'don')
              }
              onMaj={(id, n) => poser(n > 0 ? { don: id } : { don: undefined })}
            />
          ))}
          {/* D18 — le troc du mage : sous les dons, les voies de la classe. */}
          {prendUneCapaciteAuLieuDUnDon(personnage.creation?.classe) && (
            <SelecteurTrocDeDon
              titre={libelleTrocDuMage()}
              plafond={libellePlafondDuTroc(niveau)}
              options={optionsDeTrocDeDonDeLaCorrection(personnage, niveau, choix)}
              onChoisir={(id) => poser({ capTroquee: id })}
            />
          )}
        </CarteGain>
      )}

      <CarteGain titre={libelleCarteCapacite(niveau)}>
        <SelecteurCapacites
          options={optionsDeLaCorrection(personnage, niveau, choix)}
          onChoisir={(id) => poser({ capacite: id })}
          troc={
            prendUnDonAuLieuDUneCapacite(personnage.creation?.classe)
              ? {
                  titre: libelleTrocDuGuerrier(),
                  options: optionsDeTrocDeLaCorrection(personnage, niveau, choix),
                  onChoisir: (id) => poser({ donTroque: id }),
                }
              : undefined
          }
        />
      </CarteGain>

      {/* ⛔ La fenêtre s'ouvre sur la DÉRIVATION : rien n'est écrit tant que
          « Changer quand même » n'a pas été touché. */}
      {enAttente && (
        <FenetreRepercussions
          correction={corrigerChoix(personnage, niveau, enAttente)}
          chapeau={libelleChangementDuPoint(niveau, ancienne, enAttente.carac)}
          onAnnuler={renoncer}
          onChanger={() => onCorriger(enAttente)}
        />
      )}

      <div className="mt-4 flex gap-2.5">
        <button type="button" className="btn-ghost flex-none" onClick={onAnnuler}>
          Annuler
        </button>
        <button
          type="button"
          className="btn-cta"
          disabled={!complet || !modifie || enAttente !== null}
          onClick={() => onCorriger(choix)}
        >
          Enregistrer la correction
        </button>
      </div>
    </section>
  )
}
