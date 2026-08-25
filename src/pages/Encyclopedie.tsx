/**
 * Encyclopédie (D9-ter) — TOUT le manuel, dans la poche, hors réseau.
 *
 * ⛔ Zéro texte de règle en dur ici : chaque phrase du Tome affichée sort du
 * corpus, voyage dans le modèle sous forme de `SourceDeTexte` et passe par
 * `TexteRegle` (D14 : `affichage ?? verbatim`). Les seuls littéraux de ce
 * fichier sont des libellés d'écran — jamais une règle.
 *
 * D9-ter (Fred, 2026-08-24, renumérote D9-bis ①) : six chips — ☆ Épinglés,
 * Règles, Classes & voies, Dons, Compétences, Désavantages —, recherche,
 * accordéons, épinglés persistants, liens croisés dérivés du corpus, trois
 * crans de taille de texte.
 *
 * Le CONTENU (quels groupes, quelles entrées, quels blocs) vit dans
 * `src/encyclopedie/modele.ts` ; ce fichier n'en est que l'écran.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  budgetDeCorps,
  ciblesDe,
  premierLien,
  type BudgetDeLiens,
  type Cible,
} from '../encyclopedie/liens'
import {
  CRANS_DE_TAILLE,
  basculer,
  ecrireCran,
  ecrireEpingles,
  lireCran,
  lireEpingles,
} from '../encyclopedie/epingles'
import {
  LIBELLES,
  cartesDe,
  compteDe,
  entreesDe,
  ongletsDeContenu,
  sousEntrees,
  texteCherchable,
  type Bloc,
  type Carte,
  type Entree,
  type Groupe,
  type Onglet,
  type OngletId,
  type Pastille,
} from '../encyclopedie/modele'
import { enParagraphes } from '../encyclopedie/texte'
import { getRules } from '../rules/load'
import { TexteRegle, texteAffiche } from './creation/ui'

/** Les six chips de D9-ter, dans CET ordre. Libellés d'écran, pas des règles. */
export const SECTIONS = [
  { id: 'epingles', nom: LIBELLES.epingles },
  { id: 'regles', nom: LIBELLES.regles },
  { id: 'classes', nom: LIBELLES.classes },
  { id: 'dons', nom: LIBELLES.dons },
  { id: 'competences', nom: LIBELLES.competences },
  { id: 'desavantages', nom: LIBELLES.desavantages },
] as const

export type SectionId = (typeof SECTIONS)[number]['id']

/** Libellés d'écran propres à la page. */
const ECRAN = {
  titre: 'Encyclopédie',
  chercher: 'Chercher une règle, une capacité, un objet…',
  toutOuvrir: 'Tout ouvrir',
  toutFermer: 'Tout fermer',
  rien: 'Rien ne correspond dans cette section — essaie un autre mot, ou un autre onglet.',
  aucunEpingle:
    'Touche l’étoile ☆ sur une section, une capacité ou un objet pour le retrouver ici.',
  epingler: 'Épingler',
  desepingler: 'Retirer des épinglés',
  haut: 'Retour en haut',
  taille: 'Taille du texte',
  sections: 'Sections de l’encyclopédie',
  versionRegles: 'Règles v',
} as const

/** Dès deux caractères, la recherche filtre : en dessous, elle se tait. */
const SEUIL_RECHERCHE = 2

/** Défilement au-delà duquel le bouton « retour en haut » apparaît. */
const SEUIL_RETOUR_EN_HAUT = 600

// ---------------------------------------------------------------------------
// Contexte de la page : ce dont chaque morceau d'écran a besoin
// ---------------------------------------------------------------------------

interface ContexteEncyclo {
  cibles: Cible[]
  suivreLien: (cible: Cible) => void
  epingles: readonly string[]
  basculerEpingle: (id: string) => void
  surligne: string | null
}

const Contexte = createContext<ContexteEncyclo | null>(null)

function useEncyclo(): ContexteEncyclo {
  const contexte = useContext(Contexte)
  if (!contexte) throw new Error('Encyclopédie : contexte absent.')
  return contexte
}

/** L'ancre DOM d'une entrée ou d'une carte, tirée de son identifiant stable. */
function ancre(id: string): string {
  return `enc-${id.replace(/[^a-zA-Z0-9]+/g, '-')}`
}

const CLASSES_DE_TON: Record<string, string> = {
  or: 'badge-gold',
  rouge: 'badge-rouge',
  sanctum: 'badge-sanctum',
  legion: 'badge-legion',
}

function Pastilles({ pastilles }: { pastilles: readonly Pastille[] }) {
  if (pastilles.length === 0) return null
  return (
    <p className="rangee-pastilles">
      {pastilles.map((pastille, i) => (
        <span key={i} className={`badge ${pastille.ton ? CLASSES_DE_TON[pastille.ton] : ''}`}>
          {pastille.texte}
        </span>
      ))}
    </p>
  )
}

/** L'étoile d'épinglage : cible tactile de 44 px, ☆ vide / ★ pleine. */
function Etoile({ id, classe }: { id: string; classe: string }) {
  const { epingles, basculerEpingle } = useEncyclo()
  const epingle = epingles.includes(id)
  return (
    <button
      type="button"
      className={`${classe} ${epingle ? 'etoile-on' : ''}`}
      aria-pressed={epingle}
      aria-label={`${epingle ? ECRAN.desepingler : ECRAN.epingler} : ${id}`}
      onClick={(e) => {
        e.stopPropagation()
        basculerEpingle(id)
      }}
    >
      {epingle ? '★' : '☆'}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Textes de règle — tout passe par `TexteRegle` (D14)
// ---------------------------------------------------------------------------

/** Le lien croisé d'un paragraphe : il ouvre l'onglet et l'accordéon visés. */
function LienCroise({ cible, children }: { cible: Cible; children: ReactNode }) {
  const { suivreLien } = useEncyclo()
  return (
    <button
      type="button"
      className="lien-croise"
      onClick={(e) => {
        e.stopPropagation()
        suivreLien(cible)
      }}
    >
      {children}
    </button>
  )
}

interface ProprietesDeTexte {
  source: Parameters<typeof texteAffiche>[0]
  /** Étiquette d'écran posée devant le texte (« Avantage de base : »). */
  etiquette?: string
  budget?: BudgetDeLiens
}

/**
 * Un texte du Tome, aéré sur ses étiquettes internes puis rendu paragraphe
 * par paragraphe. Au plus UN lien croisé par corps d'accordéon : le budget
 * passe de paragraphe en paragraphe et s'épuise au premier lien posé.
 */
function TexteAere({ source, etiquette, budget }: ProprietesDeTexte) {
  const { cibles } = useEncyclo()
  const paragraphes = enParagraphes(texteAffiche(source))
  return (
    <>
      {paragraphes.map((paragraphe, i) => {
        const enTete = i === 0 ? etiquette : undefined
        const coupure =
          budget && budget.restant > 0
            ? premierLien(paragraphe.texte, cibles, budget.exclue)
            : null
        const etiquetteDuParagraphe = [enTete, paragraphe.etiquette]
          .filter(Boolean)
          .join(' ')
        if (coupure && budget) {
          budget.restant -= 1
          return (
            <TexteRegle
              key={i}
              classe="regle-encyclo"
              etiquette={etiquetteDuParagraphe || undefined}
              source={{ verbatim: paragraphe.texte }}
              enfants={
                <>
                  {coupure.avant}
                  <LienCroise cible={coupure.cible}>{coupure.lien}</LienCroise>
                  {coupure.apres}
                </>
              }
            />
          )
        }
        return (
          <TexteRegle
            key={i}
            classe="regle-encyclo"
            etiquette={etiquetteDuParagraphe || undefined}
            source={{ verbatim: paragraphe.texte }}
          />
        )
      })}
    </>
  )
}

/** L'ouverture d'un groupe : un paragraphe, sans étiquette interne à couper. */
function IntroDeGroupe({ source }: { source: ProprietesDeTexte['source'] }) {
  return <TexteRegle classe="regle-encyclo" source={source} />
}

/** Le lore d'une race ou d'un métier : la couleur, pas la mécanique. */
function TexteLore({ source }: { source: ProprietesDeTexte['source'] }) {
  return <TexteRegle classe="regle-lore" source={source} />
}

/** Les deux avantages d'un métier, sous leurs libellés d'écran (p.15-16). */
function AvantagesDeMetier({
  avantageBase,
  avantageAvance,
}: {
  avantageBase: ProprietesDeTexte['source']
  avantageAvance: ProprietesDeTexte['source']
}) {
  return (
    <>
      <TexteRegle
        classe="regle-encyclo"
        etiquette={LIBELLES.avantageBase}
        source={avantageBase}
      />
      <TexteRegle
        classe="regle-encyclo"
        etiquette={LIBELLES.avantageAvance}
        source={avantageAvance}
      />
    </>
  )
}

/** Le bonus NOMMÉ d'une race : « Transfère. Les elfes peuvent… ». */
function BonusNomme({ nom, source }: { nom: string; source: ProprietesDeTexte['source'] }) {
  return <TexteRegle classe="regle-encyclo" gras={nom} source={source} />
}

/** Un trait de classe sous son libellé d'écran : Code, Échange, ressource. */
function TraitDeClasse({
  etiquette,
  source,
}: {
  etiquette: string
  source: ProprietesDeTexte['source']
}) {
  return <TexteRegle classe="regle-encyclo" etiquette={etiquette} source={source} />
}

/** La restriction d'un artisanat, mise en note pour qu'elle se voie. */
function RestrictionDArtisanat({ source }: { source: ProprietesDeTexte['source'] }) {
  return <TexteRegle classe="note" source={source} />
}

/** Une note encadrée : plafond d'XP, interdiction d'artisanat. */
function TexteNote({ source }: { source: ProprietesDeTexte['source'] }) {
  return <TexteRegle classe="note" source={source} />
}

/** Une ligne de définition : le nom en petites capitales dorées, la règle dessous. */
function LigneDeDefinition({
  nom,
  source,
}: {
  nom: string
  source: ProprietesDeTexte['source']
}) {
  return (
    <div className="def-ligne">
      <b className="def-nom">{nom}</b>
      <TexteRegle classe="regle-encyclo" source={source} />
    </div>
  )
}

/** Une carte : capacité, état, objet, substance, rune — épinglable. */
function CarteVue({
  carte,
  budget,
  metaAvant = false,
}: {
  carte: Carte
  budget: BudgetDeLiens
  metaAvant?: boolean
}) {
  const { surligne } = useEncyclo()
  return (
    <div
      id={ancre(carte.id)}
      className={`carte-objet ${surligne === carte.id ? 'surligne' : ''}`}
    >
      <div className="nom-objet">
        <Etoile id={carte.id} classe="etoile-carte" />
        {carte.nom}
        {carte.pastilles.map((pastille, i) => (
          <span key={i} className={`badge ml-2 ${pastille.ton ? CLASSES_DE_TON[pastille.ton] : ''}`}>
            {pastille.texte}
          </span>
        ))}
      </div>
      {metaAvant && <Pastilles pastilles={carte.meta} />}
      {carte.source ? <TexteAere source={carte.source} budget={budget} /> : null}
      {!metaAvant && <Pastilles pastilles={carte.meta} />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Blocs
// ---------------------------------------------------------------------------

interface ProprietesDeBloc {
  bloc: Bloc
  budget: BudgetDeLiens
  ouverts: EtatDOuverture
}

function BlocVue({ bloc, budget, ouverts }: ProprietesDeBloc) {
  switch (bloc.genre) {
    case 'texte':
      return <TexteAere source={bloc.source} budget={budget} />
    case 'intro':
      return <IntroDeGroupe source={bloc.source} />
    case 'lore':
      return <TexteLore source={bloc.source} />
    case 'note':
      return <TexteNote source={bloc.source} />
    case 'avantages':
      return (
        <AvantagesDeMetier
          avantageBase={bloc.avantageBase}
          avantageAvance={bloc.avantageAvance}
        />
      )
    case 'bonusNomme':
      return <BonusNomme nom={bloc.nom} source={bloc.source} />
    case 'trait':
      return <TraitDeClasse etiquette={bloc.etiquette} source={bloc.source} />
    case 'restriction':
      return <RestrictionDArtisanat source={bloc.source} />
    case 'pastilles':
      return <Pastilles pastilles={bloc.pastilles} />
    case 'titre':
      return <b className="sous-titre-encyclo">{bloc.titre}</b>
    case 'definitions':
      return (
        <div>
          {bloc.items.map((item) => (
            <LigneDeDefinition key={item.nom} nom={item.nom} source={item.source} />
          ))}
        </div>
      )
    case 'cartes':
      return (
        <div>
          {bloc.cartes.map((carte) => (
            <CarteVue key={carte.id} carte={carte} budget={budget} metaAvant={bloc.metaAvant} />
          ))}
        </div>
      )
    case 'tableau':
      return (
        <div className="tableau-cadre">
          <table className="tableau-regles">
            <thead>
              <tr>
                {bloc.colonnes.map((colonne) => (
                  <th key={colonne} scope="col">
                    {colonne}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bloc.lignes.map((ligne, i) => (
                <tr key={i}>
                  {ligne.map((cellule, j) => (
                    <td key={j} className={j === 0 ? 'cellule-nom' : undefined}>
                      {cellule}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'sous':
      // En recherche, un sous-accordéon qui ne correspond pas s'efface aussi :
      // sinon le tri du parent ramènerait tout son contenu (maquette v3.1).
      return (
        <div>
          {bloc.entrees.filter(ouverts.visible).map((entree) => (
            <AccordeonVue key={entree.id} entree={entree} ouverts={ouverts} sous />
          ))}
        </div>
      )
  }
}

// ---------------------------------------------------------------------------
// Accordéons
// ---------------------------------------------------------------------------

/** Qui est ouvert, et comment on l'ouvre. */
interface EtatDOuverture {
  estOuvert: (id: string) => boolean
  basculer: (id: string) => void
  visible: (entree: Entree) => boolean
}

function AccordeonVue({
  entree,
  ouverts,
  sous = false,
}: {
  entree: Entree
  ouverts: EtatDOuverture
  sous?: boolean
}) {
  const { surligne } = useEncyclo()
  const ouvert = ouverts.estOuvert(entree.id)
  const budget = budgetDeCorps(entree.id)
  return (
    <div
      id={ancre(entree.id)}
      className={`acc ${sous ? 'acc-sous' : ''} ${surligne === entree.id ? 'surligne' : ''}`}
    >
      <div className="relative">
        <button
          type="button"
          className="acc-tete w-full text-left"
          aria-expanded={ouvert}
          onClick={() => ouverts.basculer(entree.id)}
        >
          <span>{entree.titre}</span>
          {entree.pastilles.map((pastille, i) => (
            <span key={i} className={`badge ${pastille.ton ? CLASSES_DE_TON[pastille.ton] : ''}`}>
              {pastille.texte}
            </span>
          ))}
        </button>
        <Etoile id={entree.id} classe="etoile" />
        <span aria-hidden className="acc-signe">
          {ouvert ? '–' : '+'}
        </span>
      </div>
      {ouvert && (
        <div className="acc-corps">
          {entree.blocs.map((bloc, i) => (
            <BlocVue key={i} bloc={bloc} budget={budget} ouverts={ouverts} />
          ))}
        </div>
      )}
    </div>
  )
}

function GroupeVue({
  groupe,
  ouverts,
  toutOuvrir,
}: {
  groupe: Groupe
  ouverts: EtatDOuverture
  toutOuvrir: (groupe: Groupe, ouvrir: boolean) => void
}) {
  const visibles = groupe.entrees.filter(ouverts.visible)
  if (visibles.length === 0 && groupe.entrees.length > 0) return null
  const budget = budgetDeCorps(undefined)
  const tousOuverts = visibles.length > 0 && visibles.every((e) => ouverts.estOuvert(e.id))
  return (
    <section>
      <div className="groupe-tete">
        <h3 className="groupe-titre">{groupe.titre}</h3>
        {visibles.length > 0 && (
          <button type="button" className="btn-mini" onClick={() => toutOuvrir(groupe, !tousOuverts)}>
            {tousOuverts ? ECRAN.toutFermer : ECRAN.toutOuvrir}
          </button>
        )}
      </div>
      {groupe.entete.map((bloc, i) => (
        <BlocVue key={i} bloc={bloc} budget={budget} ouverts={ouverts} />
      ))}
      {visibles.map((entree) => (
        <AccordeonVue key={entree.id} entree={entree} ouverts={ouverts} />
      ))}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Onglet « ☆ Épinglés »
// ---------------------------------------------------------------------------

function VueEpingles({ onglets, ouverts }: { onglets: Onglet[]; ouverts: EtatDOuverture }) {
  const { epingles } = useEncyclo()
  const index = useMemo(() => indexEpinglable(onglets), [onglets])
  return (
    <section>
      <div className="groupe-tete">
        <h3 className="groupe-titre">{LIBELLES.mesEpingles}</h3>
      </div>
      {epingles.length === 0 && <p className="note">{ECRAN.aucunEpingle}</p>}
      {epingles.map((id) => {
        const trouve = index.get(id)
        if (!trouve) return null
        if (trouve.genre === 'entree') {
          return <AccordeonVue key={id} entree={trouve.entree} ouverts={ouverts} />
        }
        return <CarteVue key={id} carte={trouve.carte} budget={budgetDeCorps(undefined)} />
      })}
    </section>
  )
}

type Epinglable =
  | { genre: 'entree'; entree: Entree }
  | { genre: 'carte'; carte: Carte }

/** Tout ce qui porte une ☆ : entrées, sous-entrées et cartes. */
function indexEpinglable(onglets: readonly Onglet[]): Map<string, Epinglable> {
  const index = new Map<string, Epinglable>()
  const poserEntree = (entree: Entree) => {
    index.set(entree.id, { genre: 'entree', entree })
    for (const sous of sousEntrees(entree)) poserEntree(sous)
    for (const carte of cartesDe(entree)) index.set(carte.id, { genre: 'carte', carte })
  }
  for (const onglet of onglets) for (const entree of entreesDe(onglet)) poserEntree(entree)
  return index
}

// ---------------------------------------------------------------------------
// La page
// ---------------------------------------------------------------------------

export default function Encyclopedie() {
  const onglets = useMemo(ongletsDeContenu, [])
  const cibles = useMemo(() => ciblesDe(onglets), [onglets])
  const comptes = useMemo(
    () => new Map(onglets.map((onglet) => [onglet.id, compteDe(onglet)])),
    [onglets],
  )

  const [onglet, setOnglet] = useState<OngletId>('regles')
  const [recherche, setRecherche] = useState('')
  const [ouverts, setOuverts] = useState<readonly string[]>([])
  const [epingles, setEpingles] = useState<readonly string[]>(lireEpingles)
  const [cran, setCran] = useState(lireCran)
  const [surligne, setSurligne] = useState<string | null>(null)
  const [enHaut, setEnHaut] = useState(true)
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null)

  const quete = recherche.trim().toLowerCase()
  const chercheActive = quete.length >= SEUIL_RECHERCHE

  useEffect(() => {
    const surDefilement = () => setEnHaut(window.scrollY <= SEUIL_RETOUR_EN_HAUT)
    surDefilement()
    window.addEventListener('scroll', surDefilement, { passive: true })
    return () => window.removeEventListener('scroll', surDefilement)
  }, [])

  useEffect(() => () => {
    if (minuterie.current) clearTimeout(minuterie.current)
  }, [])

  const basculerEpingle = useCallback((id: string) => {
    setEpingles((precedents) => {
      const suite = basculer(precedents, id)
      ecrireEpingles(suite)
      return suite
    })
  }, [])

  const changerTaille = useCallback(() => {
    setCran((precedent) => {
      const suite = (precedent + 1) % CRANS_DE_TAILLE.length
      ecrireCran(suite)
      return suite
    })
  }, [])

  const correspond = useCallback(
    (entree: Entree) => texteCherchable(entree).toLowerCase().includes(quete),
    [quete],
  )

  const etatDOuverture: EtatDOuverture = useMemo(
    () => ({
      estOuvert: (id) => (chercheActive ? true : ouverts.includes(id)),
      basculer: (id) =>
        setOuverts((precedents) =>
          precedents.includes(id) ? precedents.filter((x) => x !== id) : [...precedents, id],
        ),
      visible: (entree) => !chercheActive || correspond(entree),
    }),
    [chercheActive, correspond, ouverts],
  )

  const suivreLien = useCallback(
    (cible: Cible) => {
      setOnglet(cible.onglet)
      setRecherche('')
      setOuverts((precedents) =>
        precedents.includes(cible.id) ? precedents : [...precedents, cible.id],
      )
      setSurligne(cible.id)
      if (minuterie.current) clearTimeout(minuterie.current)
      minuterie.current = setTimeout(() => setSurligne(null), 1400)
      requestAnimationFrame(() => {
        document.getElementById(ancre(cible.id))?.scrollIntoView({ block: 'start' })
      })
    },
    [],
  )

  const toutOuvrir = useCallback((groupe: Groupe, ouvrir: boolean) => {
    const ids = groupe.entrees.flatMap((entree) => [
      entree.id,
      ...sousEntrees(entree).map((sous) => sous.id),
    ])
    setOuverts((precedents) =>
      ouvrir
        ? [...precedents, ...ids.filter((id) => !precedents.includes(id))]
        : precedents.filter((id) => !ids.includes(id)),
    )
  }, [])

  const contexte: ContexteEncyclo = useMemo(
    () => ({ cibles, suivreLien, epingles, basculerEpingle, surligne }),
    [cibles, suivreLien, epingles, basculerEpingle, surligne],
  )

  const actif = onglets.find((o) => o.id === onglet)
  const visibles = actif
    ? actif.groupes.flatMap((groupe) => groupe.entrees.filter(etatDOuverture.visible))
    : []

  return (
    <Contexte.Provider value={contexte}>
      <div className="encyclo-page" style={{ fontSize: CRANS_DE_TAILLE[cran] }}>
        <div className="encyclo-entete">
          <div className="flex items-center gap-2">
            <h1 className="titre-etape flex-1">{ECRAN.titre}</h1>
            <button
              type="button"
              className="btn-mini"
              aria-label={ECRAN.taille}
              onClick={changerTaille}
            >
              A · A+
            </button>
          </div>
          <div className="my-1.5">
            <input
              type="search"
              className="champ-recherche"
              placeholder={ECRAN.chercher}
              aria-label={ECRAN.chercher}
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
            />
          </div>
          <nav aria-label={ECRAN.sections} className="chips-barre">
            {SECTIONS.map((definition) => (
              <button
                key={definition.id}
                type="button"
                aria-pressed={onglet === definition.id}
                onClick={() => {
                  setOnglet(definition.id)
                  window.scrollTo({ top: 0 })
                }}
                className={`chip shrink-0 ${onglet === definition.id ? 'chip-on' : ''}`}
              >
                {definition.nom}
                <span className="chip-compte">
                  {definition.id === 'epingles' ? epingles.length : (comptes.get(definition.id) ?? 0)}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {onglet === 'epingles' ? (
          <VueEpingles onglets={onglets} ouverts={etatDOuverture} />
        ) : (
          <>
            {actif?.groupes.map((groupe) => (
              <GroupeVue
                key={groupe.id}
                groupe={groupe}
                ouverts={etatDOuverture}
                toutOuvrir={toutOuvrir}
              />
            ))}
            {chercheActive && visibles.length === 0 && (
              <p className="rien-ne-correspond">{ECRAN.rien}</p>
            )}
          </>
        )}

        {!enHaut && (
          <button
            type="button"
            className="btn-haut"
            aria-label={ECRAN.haut}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            ↑
          </button>
        )}

        <p className="note">
          {ECRAN.versionRegles}
          {getRules().meta.version}.
        </p>
      </div>
    </Contexte.Provider>
  )
}
