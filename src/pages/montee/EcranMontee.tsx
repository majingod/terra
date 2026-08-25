/**
 * D17 — l'écran de montée de niveau, flux 12+ (maquette
 * MAQUETTE_MONTER_NIVEAU_D17_v1, écran 2).
 *
 * Le personnage existe déjà : il ne se recrée pas pour gagner un niveau. Cet
 * écran ne demande QUE ce que l'échelon atteint apporte — les gains sont lus
 * de la table d'évolution (`gainsMontee`), jamais écrits ici :
 *   - un point de caractéristique, posé sur un jeton (choix exclusif) ;
 *   - un don, choisi dans le sélecteur de dons de la création ;
 *   - et toujours (D16) une capacité de niveau ≤ l'échelon atteint, choisie
 *     dans le sélecteur en accordéons de la création.
 *
 * Rien n'est écrit avant « Confirmer » : Annuler laisse la fiche intacte.
 */
import { useState } from 'react'
import { getRules } from '../../rules/load'
import { valeurCarac } from '../../rules/stats'
import { listeDons } from '../../rules/talents'
import { gainsMontee } from '../../rules/montee'
import {
  prendUnDonAuLieuDUneCapacite,
  prendUneCapaciteAuLieuDUnDon,
} from '../../rules/troc'
import type { Personnage } from '../../db'
import {
  choixComplet,
  donPrenable,
  donPrenableAuPalier,
  donsDePalierDeLaMontee,
  libelleCarteCapacite,
  libelleCarteDonDuPalier,
  libelleRaisonDuPalier,
  libelleChapeau,
  libelleConfirmer,
  libelleMonter,
  optionsDeLaMontee,
  niveauDuPalierDeLaMontee,
  optionsDeTrocDeLaMontee,
  optionsDeTrocDeDonDeLaMontee,
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

/** Une carte de gain : son titre, ce qu'elle demande. */
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
  niveauAtteint: number
  onConfirmer: (choix: ChoixMontee) => void
  onAnnuler: () => void
}

export default function EcranMontee({
  personnage,
  niveauAtteint,
  onConfirmer,
  onAnnuler,
}: Props) {
  const [choix, setChoix] = useState<ChoixMontee>({})
  const regles = getRules()
  const gains = gainsMontee(niveauAtteint)
  const max = regles.caracteristiques.creation.max
  const complet = choixComplet(personnage, niveauAtteint, choix)
  // D19 ③ — l'emplacement supplémentaire du palier d'Esprit : il s'ouvre dès
  // que le point de CETTE montée pousse l'Esprit au palier, et il reste
  // ouvert quand une montée passée l'a laissé non consommé.
  const donsDuPalier = donsDePalierDeLaMontee(personnage, niveauAtteint, choix)

  /**
   * Retoucher le jeton posé le reprend — la carte redevient sans choix. D19 ③ :
   * si le point retiré est celui qui ouvrait le palier d'Esprit, le don du
   * palier n'a plus de droit — il se reprend avec lui, jamais silencieusement
   * gardé.
   */
  function poserJeton(cle: CleCarac) {
    setChoix((precedent) => {
      const suite = { ...precedent, carac: precedent.carac === cle ? undefined : cle }
      if (donsDePalierDeLaMontee(personnage, niveauAtteint, suite) === 0) {
        return { ...suite, donPalier: undefined }
      }
      return suite
    })
  }

  function choisirDon(id: string, n: number) {
    setChoix((precedent) => ({ ...precedent, don: n > 0 ? id : undefined }))
  }

  /** D19 ③ — le don de l'emplacement ouvert par le palier d'Esprit. */
  function choisirDonDuPalier(id: string, n: number) {
    setChoix((precedent) => ({ ...precedent, donPalier: n > 0 ? id : undefined }))
  }

  function choisirCapacite(id: string) {
    setChoix((precedent) => ({
      ...precedent,
      capacite: precedent.capacite === id ? undefined : id,
      // D18 : l'emplacement porte l'un OU l'autre.
      donTroque: undefined,
    }))
  }

  /** D18 — un don DANS l'emplacement de capacité (troc du guerrier). */
  function choisirDonTroque(id: string) {
    setChoix((precedent) => ({
      ...precedent,
      capacite: undefined,
      donTroque: precedent.donTroque === id ? undefined : id,
    }))
  }

  /** D18 — une capacité DANS l'emplacement de don (troc du mage). */
  function choisirCapaciteTroquee(id: string) {
    setChoix((precedent) => ({
      ...precedent,
      don: undefined,
      capTroquee: precedent.capTroquee === id ? undefined : id,
    }))
  }

  return (
    <section>
      <h2 className="titre-etape">{libelleMonter(niveauAtteint)}</h2>
      <p className="my-2 text-[15.5px] text-muted-foreground">{libelleChapeau(niveauAtteint)}</p>

      {gains.caracPoints > 0 && (
        <CarteGain
          titre={`+${gains.caracPoints} point${gains.caracPoints > 1 ? 's' : ''} de caractéristique`}
        >
          <div className="flex gap-2">
            {CARACS.map(({ cle, table, nom, couleur }) => {
              const valeur = valeurCarac(personnage.creation ?? {}, cle)
              const apres = valeur + gains.caracPoints
              // Le plafond vient des données (caracteristiques.creation.max) :
              // un jeton qui le dépasserait est indisponible.
              const auMax = apres > max
              const palier = regles.caracteristiques.table[table][String(apres)]
              return (
                <button
                  key={cle}
                  type="button"
                  disabled={auMax}
                  aria-pressed={choix.carac === cle}
                  onClick={() => poserJeton(cle)}
                  className={`min-h-touch flex-1 rounded-lg border p-2.5 text-center transition-all duration-300 ${
                    choix.carac === cle
                      ? 'border-2 border-primary bg-primary/[0.08] glow-gold'
                      : 'border-border/50 bg-muted/40'
                  } ${auMax ? 'cursor-not-allowed opacity-40' : ''}`}
                >
                  <b className={`block text-[15.5px] ${couleur}`}>{nom}</b>
                  <span className="block font-wordmark text-lg font-extrabold text-gold">
                    {valeur} → {apres}
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

      {/* D19 ③ — le palier d'Esprit ouvre un don. Il se pose ICI, sous le
          jeton qui vient de l'ouvrir : la cause et l'effet se lisent d'un
          coup d'œil. Le don gardera la date du niveau où l'Esprit a atteint
          le palier, même choisi plus tard. */}
      {donsDuPalier > 0 && (
        <CarteGain titre={libelleCarteDonDuPalier()}>
          <p className="m-0 mb-2 text-[15px] text-muted-foreground">
            {libelleRaisonDuPalier(
              niveauDuPalierDeLaMontee(personnage, niveauAtteint, choix),
            )}
          </p>
          {listeDons().map((don) => (
            <CarteDon
              key={don.id}
              don={don}
              n={choix.donPalier === don.id ? 1 : 0}
              plein={
                choix.donPalier !== undefined || !donPrenableAuPalier(personnage, don, choix)
              }
              onMaj={choisirDonDuPalier}
            />
          ))}
        </CarteGain>
      )}

      {gains.dons > 0 && (
        <CarteGain titre={`+${gains.dons} don${gains.dons > 1 ? 's' : ''}`}>
          {listeDons().map((don) => (
            <CarteDon
              key={don.id}
              don={don}
              n={choix.don === don.id ? 1 : 0}
              plein={
                choix.don !== undefined ||
                choix.capTroquee !== undefined ||
                !donPrenable(personnage, don, choix, 'don')
              }
              onMaj={choisirDon}
            />
          ))}
          {/* D18 — le troc du mage : sous les dons, les voies de la classe. */}
          {prendUneCapaciteAuLieuDUnDon(personnage.creation?.classe) && (
            <SelecteurTrocDeDon
              titre={libelleTrocDuMage()}
              plafond={libellePlafondDuTroc(niveauAtteint)}
              options={optionsDeTrocDeDonDeLaMontee(personnage, niveauAtteint, choix)}
              onChoisir={choisirCapaciteTroquee}
            />
          )}
        </CarteGain>
      )}

      <CarteGain titre={libelleCarteCapacite(niveauAtteint)}>
        <SelecteurCapacites
          options={optionsDeLaMontee(personnage, niveauAtteint, choix)}
          onChoisir={choisirCapacite}
          troc={
            prendUnDonAuLieuDUneCapacite(personnage.creation?.classe)
              ? {
                  titre: libelleTrocDuGuerrier(),
                  options: optionsDeTrocDeLaMontee(personnage, niveauAtteint, choix),
                  onChoisir: choisirDonTroque,
                }
              : undefined
          }
        />
      </CarteGain>

      <div className="mt-4 flex gap-2.5">
        <button
          type="button"
          className="btn-ghost flex-none"
          onClick={onAnnuler}
        >
          Annuler
        </button>
        <button
          type="button"
          className="btn-cta"
          disabled={!complet}
          onClick={() => onConfirmer(choix)}
        >
          {libelleConfirmer(niveauAtteint)}
        </button>
      </div>
    </section>
  )
}
