/**
 * La fiche d'un personnage enregistré.
 *
 * Le repli d'AVANT le wizard (une fiche sans `creation`) ne montre plus la
 * ligne « Sous-branche » : la voie n'est plus un enclos depuis D16, et le
 * libellé ne veut plus rien dire à l'écran. Le champ, lui, reste stocké tel
 * quel sur les vieux enregistrements — jamais renommé, jamais effacé (D16 ⑨).
 *
 * D20 : une fiche SANS historique vient d'une version précédente du jeu. Elle
 * s'ouvre en lecture seule (`AncienneFiche`) — bandeau, Exporter d'abord,
 * Supprimer — et rien n'y est modifiable. ⛔ Aucune suppression sans un geste
 * du joueur. Le niveau, lui, se dérive de l'historique : jamais d'un champ.
 *
 * D17 : depuis deux ans, les personnages gagnent des niveaux ENTRE les GN —
 * la fiche monte, elle ne se recrée pas. Sous le contenu (et hors zone
 * d'impression) : « Monter au niveau {N+1} », ou, au plafond de la table, la
 * ligne « vois ton MJ ». Le MJ arbitre la quête ; l'app ne garde rien.
 *
 * t012 : « Imprimer / PDF » ne lance plus l'impression de CET écran — il mène
 * à la feuille pleine page (`pages/impression`), la même que le papier du
 * terrain, pré-remplie. La planche ≤11, qui n'a pas de feuille papier 12+,
 * garde l'impression simple de son propre affichage.
 *
 * D25 : le vrai nom du JOUEUR se lit et s'édite ici, sur cette page — la même
 * pour les ≤11 et les 12+. Toujours optionnel : vide, la fiche est exactement
 * celle d'avant, et la case de la feuille se remplit au crayon. Les contrôles
 * de saisie vivent hors de la zone imprimée, comme partout ailleurs ; la ligne
 * « joué par … », elle, fait partie de la fiche et s'imprime avec elle.
 */
import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Personnage } from '../db'
import { supprimerFicheDefinitivement } from '../db/suppression'
import { niveauMaxEnfant, normaliserNiveauEnfant } from '../rules/kids'
import { niveauAtteignable, niveauAtteignableEnfant } from '../rules/montee'
import { niveauMax } from '../rules/niveau'
import { estAncienneFiche } from '../wizard/historique'
import {
  miseAJourMontee,
  miseAJourMonteeEnfant,
  niveauDeLaFiche,
  type ChoixMontee,
} from '../wizard/montee'
import { normaliserNomDuJoueur } from '../wizard/nomDuJoueur'
import { exporterPersonnageJSON, importerPersonnageJSON } from '../utils/exportImport'
import AncienneFiche from './AncienneFiche'
import FicheAffichage from './creation/FicheAffichage'
import FicheEnfantAffichage from './creation/enfant/FicheEnfantAffichage'
import BoutonMontee from './montee/BoutonMontee'
import EcranMontee from './montee/EcranMontee'
import EcranMonteeEnfant from './montee/EcranMonteeEnfant'

/**
 * D25 — « joué par X » sur la fiche, ou le bouton qui ouvre la saisie.
 *
 * Rempli : une ligne discrète, et un tap dessus rouvre l'édition. Vide : un
 * bouton en pointillé — une invitation, jamais une exigence. Dans les deux cas
 * l'input porte un libellé et « OK » s'atteint au clavier : cette page se tient
 * debout sur un téléphone comme au lecteur d'écran.
 */
function NomDuJoueur({
  nom,
  onEnregistrer,
}: {
  nom?: string
  onEnregistrer: (saisie: string) => void
}) {
  const [edition, setEdition] = useState(false)
  const [saisie, setSaisie] = useState('')

  function ouvrir() {
    setSaisie(nom ?? '')
    setEdition(true)
  }

  function valider() {
    onEnregistrer(saisie)
    setEdition(false)
  }

  if (edition) {
    return (
      <div className="pas-a-imprimer flex items-center gap-2">
        <input
          type="text"
          aria-label="Ton vrai nom"
          placeholder="Ton vrai nom"
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') valider()
          }}
          className="min-w-0 flex-1 rounded-lg border-[1.5px] border-border/50 bg-input p-2 font-corps text-[16.5px] text-foreground focus:border-primary focus:outline-none"
          autoComplete="off"
          maxLength={40}
        />
        <button
          type="button"
          onClick={valider}
          className="min-h-touch rounded-lg border-[1.5px] border-border/50 px-4 font-semibold text-secondary-foreground"
        >
          OK
        </button>
      </div>
    )
  }

  if (nom) {
    return (
      <button type="button" onClick={ouvrir} className="text-left text-muted-foreground">
        joué par <span className="font-semibold text-secondary-foreground">{nom}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={ouvrir}
      className="pas-a-imprimer self-start rounded-lg border border-dashed border-border/50 px-3 py-2 text-sm text-muted-foreground"
    >
      + Ton nom (le joueur)
    </button>
  )
}

export default function Fiche() {
  const { id } = useParams()
  const idNombre = Number(id)
  const personnage = useLiveQuery(() => db.personnages.get(idNombre), [idNombre])
  const inputFichier = useRef<HTMLInputElement>(null)
  const [enMontee, setEnMontee] = useState(false)
  const naviguer = useNavigate()

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

  // D20 — fiche d'une version précédente : lecture seule, et deux gestes.
  // Le critère est l'absence d'historique, pas un numéro de version.
  if (estAncienneFiche(personnage.creation)) {
    return (
      <AncienneFiche
        personnage={personnage}
        onExporter={() => exporterPersonnageJSON(personnage)}
        onSupprimer={() => {
          // D23 : l'effacement passe par le SEUL module qui le porte
          // (`db/suppression`) — ici comme depuis l'accueil.
          void supprimerFicheDefinitivement(personnage.id as number).then(() => naviguer('/'))
        }}
      />
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

  /**
   * D25 — le seul champ, et l'horodatage que porte toute modification de fiche.
   * Une saisie vide (ou faite de blancs) RETIRE la clé : Dexie supprime le
   * chemin quand la valeur est `undefined`, et le magasin ne garde donc jamais
   * un `''` qu'on ne saurait plus distinguer d'un champ jamais rempli.
   */
  async function enregistrerNomDuJoueur(saisie: string) {
    await db.personnages.update(personnage!.id as number, {
      nomDuJoueur: normaliserNomDuJoueur(saisie),
      updatedAt: Date.now(),
    })
  }

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
      {/* D25 — à qui est cette feuille. Une seule page pour les ≤11 et les
          12+, donc un seul endroit où ce nom se lit et s'édite. */}
      <NomDuJoueur
        nom={personnage.nomDuJoueur}
        onEnregistrer={(saisie) => void enregistrerNomDuJoueur(saisie)}
      />

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
        {/* t012 : l'action Imprimer mène à la VRAIE feuille — la même
            pleine page que le papier, pré-remplie. Le flux ≤11 garde
            l'impression simple de sa planche : les deux corpus ne se
            mélangent pas ici plus qu'ailleurs. */}
        {personnage.creation &&
          (enfant ? (
            <button onClick={() => window.print()} className="btn-secondaire">
              Imprimer / PDF
            </button>
          ) : (
            <Link to={`/fiche/${personnage.id}/impression`} className="btn-secondaire text-center">
              Imprimer / PDF
            </Link>
          ))}
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
