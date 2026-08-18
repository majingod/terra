/**
 * Wizard de création t004 — 9 étapes, hors ligne, persistance Dexie à
 * CHAQUE étape (D8-bis), fenêtre de répercussions à deux régimes,
 * navigation par pastilles nommées.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db, nouvellePersonnageVierge } from '../db'
import { branchesDe, capacitesDeBase } from '../rules/branches'
import { getRules, getVersion } from '../rules/load'
import { languesAcquises } from '../rules/langues'
import { classeSquelette, raceDe, valeurCarac } from '../rules/stats'
import type { FicheCreation } from '../wizard/types'
import {
  ETAPES,
  etapeValide,
  surplusCompetences,
  surplusDons,
  surplusLangues,
  trancheQuiContinue,
  type Changement,
} from '../wizard/validation'
import Bandeau from './creation/Bandeau'
import EtapeAge from './creation/EtapeAge'
import EtapeCamp from './creation/EtapeCamp'
import EtapeClasse from './creation/EtapeClasse'
import EtapeDestin from './creation/EtapeDestin'
import EtapeFiche from './creation/EtapeFiche'
import EtapeForces from './creation/EtapeForces'
import EtapeLangues from './creation/EtapeLangues'
import EtapeNom from './creation/EtapeNom'
import EtapeTalents from './creation/EtapeTalents'
import Fenetre from './creation/Fenetre'
import Pastilles from './creation/Pastilles'

const ID_BROUILLON = 1

interface EtatFenetre {
  retraits: string[]
  surplus: string[]
  avant: FicheCreation
}

export default function Creer() {
  const navigate = useNavigate()
  const [fiche, setFiche] = useState<FicheCreation>({})
  const [etape, setEtape] = useState(0)
  const [charge, setCharge] = useState(false)
  const [fenetre, setFenetre] = useState<EtatFenetre | null>(null)

  useEffect(() => {
    let annule = false
    db.brouillons
      .get(ID_BROUILLON)
      .then((brouillon) => {
        if (annule) return
        if (brouillon?.donnees.fiche) {
          setFiche(brouillon.donnees.fiche)
          setEtape(Math.min(Math.max(brouillon.etape - 1, 0), ETAPES.length - 1))
        }
        setCharge(true)
      })
      .catch(() => setCharge(true))
    return () => {
      annule = true
    }
  }, [])

  /** D8-bis : chaque modification est persistée immédiatement dans Dexie. */
  function persister(suite: FicheCreation, index: number) {
    void db.brouillons.put({
      id: ID_BROUILLON,
      etape: index + 1,
      donnees: { fiche: suite },
      updatedAt: Date.now(),
    })
  }

  function maj(suite: FicheCreation) {
    setFiche(suite)
    persister(suite, etape)
  }

  function allerEtape(index: number) {
    setEtape(index)
    persister(fiche, index)
    const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduit ? 'auto' : 'smooth' })
  }

  /**
   * Applique un changement à répercussions : les retraits automatiques sont
   * déjà faits (régime 1) ; les surplus créés sont listés pour le joueur
   * (régime 2). La fenêtre nomme tout ; Annuler restaure la fiche d'avant.
   */
  function appliquerChangement(changement: Changement, avant: FicheCreation) {
    const surplus: string[] = []
    const donsEnTrop = surplusDons(changement.fiche)
    if (donsEnTrop > surplusDons(avant)) {
      surplus.push(`À l'étape Talents : retire ${donsEnTrop} don${donsEnTrop > 1 ? 's' : ''}`)
    }
    const compsEnTrop = surplusCompetences(changement.fiche)
    if (compsEnTrop > surplusCompetences(avant)) {
      surplus.push(
        `À l'étape Talents : retire ${compsEnTrop} compétence${compsEnTrop > 1 ? 's' : ''}`,
      )
    }
    const languesEnTrop = surplusLangues(changement.fiche)
    if (languesEnTrop > surplusLangues(avant)) {
      surplus.push(
        `À l'étape Langues : retire ${languesEnTrop} langue${languesEnTrop > 1 ? 's' : ''}`,
      )
    }
    maj(changement.fiche)
    if (changement.retraits.length > 0 || surplus.length > 0) {
      setFenetre({ retraits: changement.retraits, surplus, avant })
    }
  }

  async function enregistrer() {
    const regles = getRules()
    const classe = classeSquelette(fiche.classe)
    const voie = branchesDe(fiche.classe ?? '').find((b) => b.id === fiche.voie)
    const capNiveau1 = voie?.capacites.find((c) => c.niveau === 1)
    const now = Date.now()
    const complet: FicheCreation = { ...fiche, reglesVersion: getVersion() }
    const id = await db.personnages.add({
      ...nouvellePersonnageVierge(),
      nomPerso: fiche.nom ?? '',
      faction: regles.factions.liste.find((f) => f.id === fiche.faction)?.nom ?? '',
      race: raceDe(fiche.race)?.nom ?? '',
      classe: classe?.nom ?? '',
      sousBranche: voie?.nom ?? '',
      caracs: {
        puissance: valeurCarac(fiche, 'p'),
        resistance: valeurCarac(fiche, 'r'),
        esprit: valeurCarac(fiche, 'e'),
      },
      dons: Object.keys(fiche.dons ?? {}),
      competences: [...(fiche.comps ?? [])],
      capacites: [
        ...capacitesDeBase(fiche.classe ?? '').map((c) => c.id),
        ...(capNiveau1 ? [capNiveau1.id] : []),
        ...Object.values(fiche.capChoix ?? {}).flat(),
      ],
      langues: [...languesAcquises(fiche.race, fiche.classe), ...(fiche.langChoix ?? [])],
      createdAt: now,
      updatedAt: now,
      trancheAge: fiche.trancheAge,
      reglesVersion: getVersion(),
      creation: complet,
    })
    await db.brouillons.delete(ID_BROUILLON)
    navigate(`/fiche/${id}`)
  }

  if (!charge) {
    return <p className="text-stone-400">Chargement…</p>
  }

  const etapeId = ETAPES[etape].id
  const valide = etapeValide(fiche, etapeId)
  const renvoye = fiche.trancheAge !== undefined && fiche.trancheAge !== trancheQuiContinue()

  return (
    <div className="flex flex-col gap-4">
      <div className="pas-a-imprimer sticky top-0 z-20 -mx-4 -mt-6 flex flex-col border-b border-ligne bg-fond px-4 pt-2">
        {fiche.classe && (
          <div className="pb-1">
            <Bandeau fiche={fiche} />
          </div>
        )}
        <Pastilles fiche={fiche} etape={etape} onAller={allerEtape} />
      </div>

      {etapeId === 'age' && <EtapeAge fiche={fiche} onMaj={maj} />}
      {etapeId === 'camp' && (
        <EtapeCamp fiche={fiche} onMaj={maj} onChangement={appliquerChangement} />
      )}
      {etapeId === 'classe' && <EtapeClasse fiche={fiche} onChangement={appliquerChangement} />}
      {etapeId === 'destin' && <EtapeDestin fiche={fiche} onMaj={maj} />}
      {etapeId === 'forces' && (
        <EtapeForces fiche={fiche} onMaj={maj} onChangement={appliquerChangement} />
      )}
      {etapeId === 'talents' && <EtapeTalents fiche={fiche} onMaj={maj} />}
      {etapeId === 'langues' && <EtapeLangues fiche={fiche} onMaj={maj} />}
      {etapeId === 'nom' && <EtapeNom fiche={fiche} onMaj={maj} />}
      {etapeId === 'fiche' && <EtapeFiche fiche={fiche} onEnregistrer={() => void enregistrer()} />}

      {etape < ETAPES.length - 1 && !renvoye && (
        <button
          type="button"
          className="btn-continuer pas-a-imprimer"
          disabled={!valide}
          onClick={() => allerEtape(etape + 1)}
        >
          Continuer
        </button>
      )}

      {fenetre && (
        <Fenetre
          titre="Ton choix a des répercussions"
          retraits={fenetre.retraits}
          aRetirerParJoueur={fenetre.surplus}
          onConfirmer={() => setFenetre(null)}
          onAnnuler={() => {
            maj(fenetre.avant)
            setFenetre(null)
          }}
        />
      )}
    </div>
  )
}
