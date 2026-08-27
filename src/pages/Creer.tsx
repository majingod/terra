/**
 * Wizard de création (maquette A v3 validée) : les étapes du flux actif, hors
 * ligne, persistance Dexie à CHAQUE geste (D8-bis), fenêtre de répercussions
 * (rien ne s'applique avant Continuer), stepper d'étapes nommées, bandeau
 * vivant fixé au-dessus de la navigation.
 *
 * D20 : la création se fait au NIVEAU 1.
 *
 * D20-bis (t017, Q23 A, 2026-08-26 — retour terrain du 22 août) : l'étape
 * « Ton niveau » est RETIRÉE du wizard 12+. Elle arrivait avant que le joueur
 * ait compris ce qu'on lui demandait ; le fil va maintenant du Camp droit à la
 * Classe. Tout personnage naît niveau 1 et monte depuis SA FICHE, un niveau à
 * la fois (D17 + garde d'intention Q4). D12 (t006), qui plaçait l'étape après
 * le camp, ne s'applique donc plus à ce flux.
 *
 * ⚠️ Le TRAIN de montées reste — mais il ne part plus du wizard : seul un
 * brouillon commencé AVANT ce lot porte encore une `cible`, et lui seul
 * l'enchaîne. Chemin hérité assumé, code dormant nommé au rapport.
 *
 * Lot C : l'étape tranche d'âge EMBRANCHE. La tranche enfant suit le flux de
 * la planche (camp → niveau → classe → nom → fiche, corpus rules_kids.json) ;
 * l'autre poursuit le wizard du Tome. Une seule maison pour la persistance,
 * la fenêtre de répercussions et la barre du bas — les deux flux la partagent.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { db, nouvellePersonnageVierge, type Personnage } from '../db'
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
import { niveauAtteignable } from '../rules/montee'
import { normaliserNiveau } from '../rules/niveau'
import { languesAcquises } from '../rules/langues'
import { languesAcquisesEnfant } from '../rules/langues_kids'
import { classeSquelette, raceDe, valeurCarac } from '../rules/stats'
import { choixEnfant, etapesActivesEnfant, etapesValidesEnfant } from '../wizard/enfant'
import { entreeDeCreation, niveauCourant } from '../wizard/historique'
import { miseAJourCorrection, miseAJourMontee, type ChoixMontee } from '../wizard/montee'
import { niveauCorrigeable } from '../wizard/cascade'
import { champNomDuJoueur, sansNomDuJoueur } from '../wizard/nomDuJoueur'
import { capacitesTroquees, donsPris } from '../wizard/troc'
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
import EtapeNom from './creation/EtapeNom'
import EtapeTalents from './creation/EtapeTalents'
import EtapeTerminee from './creation/EtapeTerminee'
import EtapeCampEnfant from './creation/enfant/EtapeCampEnfant'
import EtapeClasseEnfant from './creation/enfant/EtapeClasseEnfant'
import EtapeFicheEnfant from './creation/enfant/EtapeFicheEnfant'
import EtapeLanguesEnfant from './creation/enfant/EtapeLanguesEnfant'
import EtapeMetierEnfant from './creation/enfant/EtapeMetierEnfant'
import EtapeNiveauEnfant from './creation/enfant/EtapeNiveauEnfant'
import EtapeNomEnfant from './creation/enfant/EtapeNomEnfant'
import Fenetre from './creation/Fenetre'
import Fil from './creation/Fil'
import Pastilles from './creation/Pastilles'
import EcranCorrection from './montee/EcranCorrection'
import EcranMontee from './montee/EcranMontee'

const ID_BROUILLON = 1

/**
 * D20 — un brouillon commencé AVANT ce lot porte un niveau SAISI. Il devient
 * une cible : le personnage naîtra au niveau 1 et montera jusque-là. Le champ
 * saisi ne survit pas au chargement — sinon deux sources se contrediraient
 * pendant toute la création, et c'est exactement ce que D20 supprime.
 *
 * (Un brouillon est un travail en cours, jamais une fiche enregistrée : D7 ne
 * protège pas ce champ-ci, il protège ceux de `personnages`.)
 */
export function brouillonSansNiveauSaisi(fiche: FicheCreation): FicheCreation {
  if (fiche.niveau === undefined) return fiche
  const { niveau, ...reste } = fiche
  return { ...reste, cible: fiche.cible ?? normaliserNiveau(niveau) }
}

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
  /**
   * Le train de montées (D20) : le personnage tel qu'il vient d'être créé au
   * niveau 1, et l'échelon que l'app lui fait traverser en ce moment.
   * `null` = pas de train en cours.
   */
  const [enTrain, setEnTrain] = useState<{ personnage: Personnage; niveauAtteint: number } | null>(
    null,
  )
  /**
   * D20 lot 2 — le niveau DÉJÀ traversé que le joueur rouvre depuis l'étage
   * « TES NIVEAUX » du fil. `null` = le train roule normalement.
   */
  const [enCorrection, setEnCorrection] = useState<number | null>(null)

  useEffect(() => {
    let annule = false
    db.brouillons
      .get(ID_BROUILLON)
      .then((brouillon) => {
        if (annule) return
        if (brouillon?.donnees.fiche) {
          setFiche(brouillonSansNiveauSaisi(brouillon.donnees.fiche))
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
    ? etapesActivesEnfant(fiche)
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

  /**
   * D20 — la création écrit une fiche de NIVEAU 1, avec sa première entrée
   * d'historique datée. Le niveau n'est plus copié d'un champ saisi : il se
   * dérive de cet historique, ici comme partout ailleurs.
   */
  async function enregistrer() {
    const regles = getRules()
    const classe = classeSquelette(fiche.classe)
    const now = Date.now()
    const complet: FicheCreation = {
      ...fiche,
      historique: [entreeDeCreation(now)],
      reglesVersion: getVersion(),
    }
    const niveau = niveauCourant(complet)
    const id = await db.personnages.add({
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
      // D18 : un don troqué se range comme les dons — la fiche ne distingue
      // pas d'où il vient ; `creation` garde la provenance.
      dons: Object.keys(donsPris(fiche)),
      competences: [...(fiche.comps ?? [])],
      // D16 : les capacités de base de la classe, puis celles que le joueur
      // a choisies — une par niveau — et celles achetées par XP. D18 : et
      // celles prises à la place d'un don.
      capacites: [
        ...capacitesDeBase(fiche.classe ?? '').map((c) => c.id),
        ...Object.values(fiche.capNiveaux ?? {}),
        ...Object.values(fiche.capChoix ?? {}).flat(),
        ...capacitesTroquees(fiche),
      ],
      niveau,
      langues: [...languesAcquises(fiche.race, fiche.classe), ...(fiche.langChoix ?? [])],
      createdAt: now,
      updatedAt: now,
      trancheAge: fiche.trancheAge,
      reglesVersion: getVersion(),
      // D25 : `creation` recopie la fiche du wizard — mais PAS le nom du
      // joueur, qui n'a qu'un seul domicile sur l'enregistrement (sinon
      // l'effacer depuis la fiche n'en retirerait qu'une copie sur deux).
      creation: sansNomDuJoueur(complet),
      // D25 : le vrai nom du joueur, trimé — et RIEN du tout quand la saisie
      // est vide. C'est ici qu'il quitte le wizard pour l'enregistrement.
      ...champNomDuJoueur(fiche.nomDuJoueur),
    })
    await db.brouillons.delete(ID_BROUILLON)

    // Le train : la cible dit jusqu'où monter. Le premier échelon au-dessus du
    // niveau de départ vient de la table, jamais d'un « +1 » écrit ici.
    const cible = normaliserNiveau(fiche.cible)
    const premier = niveauAtteignable(niveau)
    if (cible > niveau && premier !== undefined) {
      const personnage = await db.personnages.get(id)
      if (personnage) {
        setEnTrain({ personnage, niveauAtteint: premier })
        return
      }
    }
    setEnregistree(true)
  }

  /**
   * Une montée du train confirmée : elle s'écrit comme n'importe quelle
   * montée (D17, une SEULE mise à jour), puis l'app enchaîne sur l'échelon
   * suivant — ou rend la main à la fiche quand la cible est atteinte.
   */
  /**
   * D20 lot 2 — une montée DÉJÀ traversée, corrigée sans quitter le train :
   * les échelons au-dessus restent, et le train reprend où il en était.
   */
  async function confirmerLaCorrection(niveau: number, choix: ChoixMontee) {
    if (!enTrain) return
    const { personnage, niveauAtteint } = enTrain
    const maj = miseAJourCorrection(personnage, niveau, choix, Date.now())
    await db.personnages.update(personnage.id as number, maj)
    setEnTrain({ personnage: { ...personnage, ...maj }, niveauAtteint })
    setEnCorrection(null)
  }

  async function confirmerLaMontee(choix: ChoixMontee) {
    if (!enTrain) return
    const { personnage, niveauAtteint } = enTrain
    const maj = miseAJourMontee(personnage, niveauAtteint, choix, Date.now())
    await db.personnages.update(personnage.id as number, maj)
    const suite: Personnage = { ...personnage, ...maj }
    const cible = normaliserNiveau(fiche.cible)
    const prochain = niveauAtteignable(niveauAtteint)
    if (prochain !== undefined && prochain <= cible) {
      setEnTrain({ personnage: suite, niveauAtteint: prochain })
      return
    }
    setEnTrain(null)
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
      // D24 : la classe enfant se stocke en NOM ci-dessus — c'est l'id
      // (`choix.classe`) qui sert à dériver le Druidique, pas ce nom.
      competences: choix.competence ? [choix.competence] : [],
      capacites: capacitesEnfantAcquises(choix.classe, niveau).map((c) => c.id),
      niveau,
      langues: [...languesAcquisesEnfant(choix.classe), ...(choix.langues ?? [])],
      createdAt: now,
      updatedAt: now,
      trancheAge: fiche.trancheAge,
      reglesVersion: getVersionKids(),
      // D25 : un seul domicile pour le nom, ici comme dans le flux 12+.
      creation: sansNomDuJoueur(complet),
      // D25 : le champ vaut pour les ≤11 comme pour les 12+ — à l'écran et à
      // l'export. (D27-bis : eux n'ont pas de feuille imprimée.)
      ...champNomDuJoueur(fiche.nomDuJoueur),
    })
    await db.brouillons.delete(ID_BROUILLON)
    setEnregistree(true)
  }

  if (!charge) {
    return <p className="text-muted-foreground">Chargement…</p>
  }

  // D20 — le train : entre la fiche créée au niveau 1 et la cible, l'app
  // enchaîne les montées SANS repasser par la fiche. Le fil montre où on en est.
  if (enTrain) {
    return (
      <div className="pb-6">
        <header className="pas-a-imprimer px-1 pb-0.5 pt-2 text-center">
          <Link
            to="/"
            className="text-gradient-gold font-wordmark text-sm font-extrabold tracking-[0.24em]"
          >
            TERRA MORTIS
          </Link>
          <h1 className="text-gradient-gold terra-heading m-0 text-[26px]">Créer un personnage</h1>
        </header>
        <Fil
          etapes={etapes}
          valides={valides}
          etape={etapes.length - 1}
          onAller={() => {}}
          barre={!enfant}
          ici={enTrain.niveauAtteint}
          fige
          onCorrigerLeNiveau={(niveau) => setEnCorrection(niveau)}
        />
        {enCorrection !== null && niveauCorrigeable(enTrain.personnage, enCorrection) ? (
          // ⛔ Écran NEUF à chaque ouverture (`key`) : sans elle, les choix
          // d'un niveau fuiraient dans un autre.
          <EcranCorrection
            key={`correction-${enCorrection}`}
            personnage={enTrain.personnage}
            niveau={enCorrection}
            onCorriger={(choix: ChoixMontee) =>
              void confirmerLaCorrection(enCorrection, choix)
            }
            onAnnuler={() => setEnCorrection(null)}
          />
        ) : (
        <EcranMontee
          // `key` par échelon : chaque montée est un écran NEUF. Sans elle,
          // React réutilise l'instance et les choix du niveau précédent
          // fuiraient dans le suivant.
          key={enTrain.niveauAtteint}
          personnage={enTrain.personnage}
          niveauAtteint={enTrain.niveauAtteint}
          onConfirmer={(choix: ChoixMontee) => void confirmerLaMontee(choix)}
          onAnnuler={() => {
            // Quitter le train laisse la fiche telle qu'elle est : le joueur
            // reprendra ses montées depuis sa fiche, quand il voudra.
            setEnTrain(null)
            setEnregistree(true)
          }}
        />
        )}
      </div>
    )
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
      {/* ⚠️ ≤11 : rien ne change — la planche enfant garde son stepper, sans
          étage de niveaux : chez les enfants le niveau se déclare. */}
      {enfant ? (
        <div className="pas-a-imprimer">
          <Pastilles etapes={etapes} valides={valides} etape={etape} onAller={allerEtape} />
        </div>
      ) : (
        <Fil
          etapes={etapes}
          valides={valides}
          etape={etape}
          onAller={allerEtape}
          barre
          ici={niveauCourant(fiche)}
        />
      )}

      {etapeId === 'age' && <EtapeAge fiche={fiche} onMaj={maj} />}

      {enfant ? (
        <>
          {etapeId === 'camp' && <EtapeCampEnfant fiche={fiche} onMaj={maj} />}
          {etapeId === 'niveau' && (
            <EtapeNiveauEnfant fiche={fiche} onChangement={appliquerChangement} />
          )}
          {etapeId === 'classe' && <EtapeClasseEnfant fiche={fiche} onMaj={maj} />}
          {etapeId === 'metier' && (
            <EtapeMetierEnfant fiche={fiche} onChangement={appliquerChangement} />
          )}
          {etapeId === 'langues-enfant' && <EtapeLanguesEnfant fiche={fiche} onMaj={maj} />}
          {etapeId === 'nom' && <EtapeNomEnfant fiche={fiche} onMaj={maj} />}
          {etapeId === 'fiche' && <EtapeFicheEnfant fiche={fiche} />}
        </>
      ) : (
        <>
          {etapeId === 'camp' && (
            <EtapeCamp fiche={fiche} onMaj={maj} onChangement={appliquerChangement} />
          )}
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
