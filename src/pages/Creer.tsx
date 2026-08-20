/**
 * Wizard de création (maquette A v3 validée) : les étapes du flux actif, hors
 * ligne, persistance Dexie à CHAQUE geste (D8-bis), fenêtre de répercussions
 * (rien ne s'applique avant Continuer), stepper d'étapes nommées, bandeau
 * vivant fixé au-dessus de la navigation.
 *
 * D12 (t006) : l'étape « Ton niveau » s'insère après le camp, avant tout ce
 * qui consomme dons ou capacités.
 *
 * Lot C : l'étape tranche d'âge EMBRANCHE. La tranche enfant suit le flux de
 * la planche (camp → niveau → classe → nom → fiche, corpus rules_kids.json) ;
 * l'autre poursuit le wizard du Tome. Une seule maison pour la persistance,
 * la fenêtre de répercussions et la barre du bas — les deux flux la partagent.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { db, nouvellePersonnageVierge } from '../db'
import { capacitesDeBase } from '../rules/branches'
import {
  capacitesEnfantAcquises,
  classeEnfant,
  factionEnfant,
  getVersionKids,
  normaliserNiveauEnfant,
  raceEnfant,
} from '../rules/kids'
import { getRules, getVersion } from '../rules/load'
import { normaliserNiveau } from '../rules/niveau'
import { languesAcquises } from '../rules/langues'
import { classeSquelette, raceDe, valeurCarac } from '../rules/stats'
import { choixEnfant, ETAPES_ENFANT, etapesValidesEnfant } from '../wizard/enfant'
import type { FicheCreation } from '../wizard/types'
import {
  ETAPES,
  etapesValides,
  surplusDons,
  surplusLangues,
  trancheEnfant,
  type Changement,
} from '../wizard/validation'
import Bandeau from './creation/Bandeau'
import EtapeAge from './creation/EtapeAge'
import EtapeCamp from './creation/EtapeCamp'
import EtapeCapacites from './creation/EtapeCapacites'
import EtapeClasse from './creation/EtapeClasse'
import EtapeDestin from './creation/EtapeDestin'
import EtapeFiche from './creation/EtapeFiche'
import EtapeForces from './creation/EtapeForces'
import EtapeLangues from './creation/EtapeLangues'
import EtapeNiveau from './creation/EtapeNiveau'
import EtapeNom from './creation/EtapeNom'
import EtapeTalents from './creation/EtapeTalents'
import EtapeTerminee from './creation/EtapeTerminee'
import EtapeCampEnfant from './creation/enfant/EtapeCampEnfant'
import EtapeClasseEnfant from './creation/enfant/EtapeClasseEnfant'
import EtapeFicheEnfant from './creation/enfant/EtapeFicheEnfant'
import EtapeNiveauEnfant from './creation/enfant/EtapeNiveauEnfant'
import EtapeNomEnfant from './creation/enfant/EtapeNomEnfant'
import Fenetre from './creation/Fenetre'
import Pastilles from './creation/Pastilles'

const ID_BROUILLON = 1

interface EtatFenetre {
  impacts: string[]
  appliquer: () => void
}

export default function Creer() {
  const [fiche, setFiche] = useState<FicheCreation>({})
  const [etapeBrute, setEtape] = useState(0)
  const [charge, setCharge] = useState(false)
  const [fenetre, setFenetre] = useState<EtatFenetre | null>(null)
  const [enregistree, setEnregistree] = useState(false)

  useEffect(() => {
    let annule = false
    db.brouillons
      .get(ID_BROUILLON)
      .then((brouillon) => {
        if (annule) return
        if (brouillon?.donnees.fiche) {
          setFiche(brouillon.donnees.fiche)
          setEtape(Math.max(brouillon.etape - 1, 0))
        }
        setCharge(true)
      })
      .catch(() => setCharge(true))
    return () => {
      annule = true
    }
  }, [])

  // Le flux actif se lit de la seule donnée d'âge existante : la tranche.
  const enfant = fiche.trancheAge === trancheEnfant()
  const etapes: readonly { id: string; nom: string; icone?: string }[] = enfant
    ? ETAPES_ENFANT
    : ETAPES
  const valides = enfant ? etapesValidesEnfant(fiche) : etapesValides(fiche)
  const etape = Math.min(Math.max(etapeBrute, 0), etapes.length - 1)

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
    window.scrollTo({ top: 0 })
  }

  /**
   * Changement à répercussions : rien ne s'applique tant que la fenêtre
   * n'est pas confirmée ; Annuler ferme sans rien changer.
   */
  function appliquerChangement(changement: Changement) {
    if (changement.retraits.length === 0) {
      maj(changement.fiche)
      return
    }
    setFenetre({
      impacts: changement.retraits,
      appliquer: () => maj(changement.fiche),
    })
  }

  function continuer() {
    const suivante = etape + 1
    // Quitter Forces avec un surplus (Esprit qui a baissé) : la fenêtre
    // nomme ce que le joueur devra retirer, puis on avance.
    if (!enfant && ETAPES[etape].id === 'forces') {
      const impacts: string[] = []
      const donsEnTrop = surplusDons(fiche)
      const languesEnTrop = surplusLangues(fiche)
      if (donsEnTrop > 0) {
        impacts.push(
          `Ton Esprit a baissé : retire ${donsEnTrop} don${donsEnTrop > 1 ? 's' : ''} à l'étape Talents.`,
        )
      }
      if (languesEnTrop > 0) {
        impacts.push(
          `Retire ${languesEnTrop} langue${languesEnTrop > 1 ? 's' : ''} à l'étape Langues.`,
        )
      }
      if (impacts.length > 0) {
        setFenetre({ impacts, appliquer: () => allerEtape(suivante) })
        return
      }
    }
    allerEtape(suivante)
  }

  async function enregistrer() {
    const regles = getRules()
    const classe = classeSquelette(fiche.classe)
    const niveau = normaliserNiveau(fiche.niveau)
    const now = Date.now()
    const complet: FicheCreation = { ...fiche, reglesVersion: getVersion() }
    await db.personnages.add({
      ...nouvellePersonnageVierge(),
      nomPerso: fiche.nom ?? '',
      faction: regles.factions.liste.find((f) => f.id === fiche.faction)?.nom ?? '',
      race: raceDe(fiche.race)?.nom ?? '',
      classe: classe?.nom ?? '',
      caracs: {
        puissance: valeurCarac(fiche, 'p'),
        resistance: valeurCarac(fiche, 'r'),
        esprit: valeurCarac(fiche, 'e'),
      },
      dons: Object.keys(fiche.dons ?? {}),
      competences: [...(fiche.comps ?? [])],
      // D16 : les capacités de base de la classe, puis celles que le joueur
      // a choisies — une par niveau — et celles achetées par XP.
      capacites: [
        ...capacitesDeBase(fiche.classe ?? '').map((c) => c.id),
        ...Object.values(fiche.capNiveaux ?? {}),
        ...Object.values(fiche.capChoix ?? {}).flat(),
      ],
      niveau,
      langues: [...languesAcquises(fiche.race, fiche.classe), ...(fiche.langChoix ?? [])],
      createdAt: now,
      updatedAt: now,
      trancheAge: fiche.trancheAge,
      reglesVersion: getVersion(),
      creation: complet,
    })
    await db.brouillons.delete(ID_BROUILLON)
    setEnregistree(true)
  }

  /**
   * Enregistrement du flux enfant : la fiche vit dans les MÊMES tables, avec
   * la version du corpus enfant. Aucun champ nouveau n'est indexé, donc
   * aucune migration Dexie (`creation` porte déjà la fiche du wizard).
   */
  async function enregistrerEnfant() {
    const choix = choixEnfant(fiche)
    const niveau = normaliserNiveauEnfant(choix.niveau)
    const now = Date.now()
    const complet: FicheCreation = { ...fiche, reglesVersion: getVersionKids() }
    await db.personnages.add({
      ...nouvellePersonnageVierge(),
      nomPerso: choix.nom ?? '',
      faction: factionEnfant(choix.faction)?.nom ?? '',
      race: raceEnfant().nom,
      classe: classeEnfant(choix.classe)?.nom ?? '',
      capacites: capacitesEnfantAcquises(choix.classe, niveau).map((c) => c.id),
      niveau,
      createdAt: now,
      updatedAt: now,
      trancheAge: fiche.trancheAge,
      reglesVersion: getVersionKids(),
      creation: complet,
    })
    await db.brouillons.delete(ID_BROUILLON)
    setEnregistree(true)
  }

  if (!charge) {
    return <p className="text-muted-foreground">Chargement…</p>
  }

  if (enregistree) {
    return (
      <div>
        <header className="px-1 pb-0.5 pt-2 text-center">
          <Link
            to="/"
            className="text-gradient-gold font-wordmark text-sm font-extrabold tracking-[0.24em]"
          >
            TERRA MORTIS
          </Link>
          <h1 className="text-gradient-gold terra-heading m-0 text-[26px]">Créer un personnage</h1>
        </header>
        <EtapeTerminee />
      </div>
    )
  }

  const etapeId = etapes[etape].id
  const derniere = etape === etapes.length - 1
  const valide = valides[etape]
  const fichePrete = valides[etapes.length - 1]

  return (
    <div className="pb-[168px]">
      <header className="pas-a-imprimer px-1 pb-0.5 pt-2 text-center">
        <Link
          to="/"
          className="text-gradient-gold font-wordmark text-sm font-extrabold tracking-[0.24em]"
        >
          TERRA MORTIS
        </Link>
        <h1 className="text-gradient-gold terra-heading m-0 text-[26px]">Créer un personnage</h1>
      </header>
      <div className="pas-a-imprimer">
        <Pastilles
          etapes={etapes}
          valides={valides}
          etape={etape}
          onAller={allerEtape}
          barre={!enfant}
        />
      </div>

      {etapeId === 'age' && <EtapeAge fiche={fiche} onMaj={maj} />}

      {enfant ? (
        <>
          {etapeId === 'camp' && <EtapeCampEnfant fiche={fiche} onMaj={maj} />}
          {etapeId === 'niveau' && (
            <EtapeNiveauEnfant fiche={fiche} onChangement={appliquerChangement} />
          )}
          {etapeId === 'classe' && <EtapeClasseEnfant fiche={fiche} onMaj={maj} />}
          {etapeId === 'nom' && <EtapeNomEnfant fiche={fiche} onMaj={maj} />}
          {etapeId === 'fiche' && <EtapeFicheEnfant fiche={fiche} />}
        </>
      ) : (
        <>
          {etapeId === 'camp' && (
            <EtapeCamp fiche={fiche} onMaj={maj} onChangement={appliquerChangement} />
          )}
          {etapeId === 'niveau' && <EtapeNiveau fiche={fiche} onChangement={appliquerChangement} />}
          {etapeId === 'classe' && <EtapeClasse fiche={fiche} onChangement={appliquerChangement} />}
          {etapeId === 'capacites' && <EtapeCapacites fiche={fiche} onMaj={maj} />}
          {etapeId === 'destin' && (
            <EtapeDestin fiche={fiche} onMaj={maj} onChangement={appliquerChangement} />
          )}
          {etapeId === 'forces' && <EtapeForces fiche={fiche} onMaj={maj} />}
          {etapeId === 'talents' && (
            <EtapeTalents fiche={fiche} onMaj={maj} onChangement={appliquerChangement} />
          )}
          {etapeId === 'langues' && <EtapeLangues fiche={fiche} onMaj={maj} />}
          {etapeId === 'nom' && <EtapeNom fiche={fiche} onMaj={maj} />}
          {etapeId === 'fiche' && <EtapeFiche fiche={fiche} />}
        </>
      )}

      {!derniere && !enfant && <Bandeau fiche={fiche} />}

      <div className="pas-a-imprimer fixed inset-x-0 bottom-0 z-50 bg-gradient-to-b from-transparent via-background/90 to-background px-4 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2.5">
        <div className="mx-auto flex w-full max-w-[640px] gap-2.5">
          {etape > 0 && (
            <button
              type="button"
              className="btn-ghost flex-none"
              aria-label="Étape précédente"
              onClick={() => allerEtape(etape - 1)}
            >
              ‹
            </button>
          )}
          {derniere ? (
            <button
              type="button"
              className="btn-cta"
              disabled={!fichePrete}
              onClick={() => void (enfant ? enregistrerEnfant() : enregistrer())}
            >
              Créer la fiche
            </button>
          ) : (
            <button type="button" className="btn-cta" disabled={!valide} onClick={continuer}>
              Continuer
            </button>
          )}
        </div>
      </div>

      {fenetre && (
        <Fenetre
          impacts={fenetre.impacts}
          onContinuer={() => {
            fenetre.appliquer()
            setFenetre(null)
          }}
          onAnnuler={() => setFenetre(null)}
        />
      )}
    </div>
  )
}
