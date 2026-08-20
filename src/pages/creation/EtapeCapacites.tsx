/**
 * Étape — « Tes capacités » (D16). Elle remplace le choix de voie : la voie
 * n'est plus un enclos, c'est une étiquette portée par chaque capacité.
 *
 * Un emplacement par niveau du personnage. L'emplacement du niveau k s'ouvre
 * sur TOUT l'arbre de la classe jusqu'à l'échelon k — les trois voies, en
 * accordéons fermés par défaut (maquette v5) ; ouvrir une voie montre chaque
 * capacité avec son texte complet (D14 : `affichage ?? verbatim`, jamais
 * réécrit à la main), et ce qui est déjà pris ailleurs rayé.
 *
 * D5 : ni le nombre d'emplacements ni le plafond ne sont écrits ici — ils
 * viennent de la table d'évolution et du champ `niveau` des capacités.
 */
import { useEffect, useState } from 'react'
import { niveauMax } from '../../rules/niveau'
import type { CapaciteDeVoie } from '../../rules/capacites'
import {
  capaciteParId,
  niveauxDeLaFiche,
  optionsDuNiveau,
  type CapaciteDeFiche,
  type OptionDeCapacite,
} from '../../wizard/capacites'
import type { FicheCreation } from '../../wizard/types'
import { Badge, Note, TexteRegle, Tutoriel } from './ui'

interface Props {
  fiche: FicheCreation
  onMaj: (fiche: FicheCreation) => void
}

/** Le nom d'une capacité, sa marche et sa voie — la même ligne partout. */
export function LigneCapacite({
  capacite,
  achatXp,
}: {
  capacite: CapaciteDeFiche['capacite']
  achatXp?: boolean
}) {
  return (
    <span className="flex flex-wrap items-baseline gap-x-2">
      <b className="text-[17px]">{capacite.nom}</b>
      <Badge>niv {capacite.niveau}</Badge>
      <i className="text-[14.5px] text-muted-foreground">{capacite.voieNom}</i>
      {achatXp && <span className="text-[14.5px] text-muted-foreground">· achat XP</span>}
    </span>
  )
}

/**
 * L'aide au bas d'un emplacement ouvert : ce jusqu'où CE choix peut aller,
 * et ce qui attend aux prochains niveaux. Trois formes, parce que le français
 * n'accorde pas comme les bornes d'un intervalle (libellés arbitrés par
 * l'organisateur, mot pour mot) :
 * - il reste plusieurs échelons au-dessus : « de niveau k+1 à N … prochains
 *   niveaux » ;
 * - il n'en reste qu'un : « de niveau N … au prochain niveau » ;
 * - au dernier échelon de la table, seule la première phrase a un sens.
 *
 * D5 : le plafond vient de la table d'évolution, jamais d'un 5 écrit ici.
 */
export function texteAide(niveauDuChoix: number, plafond: number): string {
  const premiere = `Ce choix-ci peut aller jusqu'au niveau ${niveauDuChoix}.`
  if (niveauDuChoix >= plafond) return premiere
  const suivant = niveauDuChoix + 1
  if (suivant === plafond) {
    return `${premiere} Les capacités de niveau ${plafond} t'attendent au prochain niveau.`
  }
  return `${premiere} Les capacités de niveau ${suivant} à ${plafond} t'attendent aux prochains niveaux.`
}

/** Les options d'un emplacement, regroupées par voie, dans l'ordre de l'arbre. */
function groupesParVoie(options: OptionDeCapacite[]) {
  const groupes: Array<{ voieId: string; voieNom: string; options: OptionDeCapacite[] }> = []
  for (const option of options) {
    const dernier = groupes.find((g) => g.voieId === option.capacite.voieId)
    if (dernier) dernier.options.push(option)
    else
      groupes.push({
        voieId: option.capacite.voieId,
        voieNom: option.capacite.voieNom,
        options: [option],
      })
  }
  return groupes
}

/**
 * Une carte de capacité choisissable (maquette v5) : nom en Cinzel, badge de
 * niveau, description au complet — jamais de troncature, jamais d'aperçu,
 * jamais de chevron de carte. Choisie : contour orangé 2 px, halo léger,
 * coche ronde dégradée or, fond teinté `--primary` ~8 %, nom en or.
 *
 * `avecVoie` affiche le nom de la voie en italique — les achats XP (à plat,
 * sans étage voie) en ont besoin ; dans un accordéon de voie, c'est redondant
 * avec l'en-tête et ne s'affiche pas.
 */
export function CarteCapacite({
  capacite,
  choisie,
  onChoisir,
  avecVoie,
}: {
  capacite: CapaciteDeVoie
  choisie: boolean
  onChoisir: () => void
  avecVoie?: boolean
}) {
  return (
    <button
      type="button"
      aria-pressed={choisie}
      onClick={onChoisir}
      className={`my-1.5 block min-h-touch w-full rounded-lg border p-2.5 text-left transition-all duration-300 ${
        choisie
          ? 'border-2 border-primary bg-primary/[0.08] glow-gold'
          : 'border-border/50 bg-muted/40'
      }`}
    >
      <span className="flex items-center gap-2">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <b className={`font-titre text-[17px] ${choisie ? 'text-gold' : ''}`}>{capacite.nom}</b>
          {avecVoie && <i className="text-[14.5px] text-muted-foreground">{capacite.voieNom}</i>}
        </span>
        <span className="ml-auto flex flex-none items-center gap-1.5">
          <Badge>niv {capacite.niveau}</Badge>
          {choisie && (
            <span
              aria-hidden
              className="coche-or flex h-6 w-6 flex-none items-center justify-center rounded-full text-[13px] text-primary-foreground"
            >
              ✓
            </span>
          )}
        </span>
      </span>
      <TexteRegle source={capacite} />
    </button>
  )
}

/** Une capacité déjà prise ailleurs : rayée, sans description, insensible au toucher. */
function CarteDejaPrise({ nom }: { nom: string }) {
  return (
    <div className="my-1.5 flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 p-2.5 opacity-45">
      <b className="font-titre text-[17px] line-through">{nom}</b>
      <span className="ml-auto flex-none text-[13.5px] italic text-muted-foreground">
        déjà choisie
      </span>
    </div>
  )
}

/**
 * L'accordéon d'une voie, dans un emplacement ouvert (maquette v5) : fermé
 * par défaut. En-tête tactile : chevron (pivote à l'ouverture) · nom de la
 * voie en Cinzel · pastille de compte à droite — le nombre de capacités
 * CHOISISSABLES pour cet emplacement (niveau ≤ k, moins les déjà-prises),
 * jamais le total de la voie. Voie portant le choix courant : un point
 * orangé et le nom de la capacité choisie s'intercalent avant la pastille —
 * repliée ou non (maquette v5), pour qu'on sache toujours où vit le choix.
 */
function AccordeonVoie({
  voieNom,
  options,
  ouverte,
  onBasculer,
  onChoisir,
}: {
  voieNom: string
  options: OptionDeCapacite[]
  ouverte: boolean
  onBasculer: () => void
  onChoisir: (id: string) => void
}) {
  const choisissables = options.filter((option) => !option.dejaPrise).length
  const choix = options.find((option) => option.choisie)
  return (
    <div className="my-2 overflow-hidden rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm">
      <button
        type="button"
        aria-expanded={ouverte}
        onClick={onBasculer}
        className="flex min-h-touch w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        <span
          aria-hidden
          className={`flex-none text-muted-foreground transition-transform duration-200 ${
            ouverte ? 'rotate-90' : ''
          }`}
        >
          ▸
        </span>
        <h4 className="m-0 flex-none font-titre text-[15px] font-semibold uppercase tracking-wide text-gold">
          {voieNom}
        </h4>
        {choix && (
          <span className="flex min-w-0 items-center gap-1.5 text-[14px] text-muted-foreground">
            <span aria-hidden className="h-2 w-2 flex-none rounded-full bg-primary" />
            <span className="truncate">{choix.capacite.nom}</span>
          </span>
        )}
        <span className="ml-auto flex-none">
          <Badge>{choisissables}</Badge>
        </span>
      </button>
      {ouverte && (
        <div className="border-t border-border/40 px-3 pb-2.5 pt-1">
          {options.map((option) =>
            option.dejaPrise ? (
              <CarteDejaPrise key={option.capacite.id} nom={option.capacite.nom} />
            ) : (
              <CarteCapacite
                key={option.capacite.id}
                capacite={option.capacite}
                choisie={option.choisie}
                onChoisir={() => onChoisir(option.capacite.id)}
              />
            ),
          )}
        </div>
      )}
    </div>
  )
}

export default function EtapeCapacites({ fiche, onMaj }: Props) {
  const niveaux = niveauxDeLaFiche(fiche)
  const premierVide = niveaux.find((niveau) => !fiche.capNiveaux?.[String(niveau)])
  const [ouvertBrut, setOuvert] = useState<number | null>(null)
  const ouvert = ouvertBrut ?? premierVide ?? null
  const plafond = niveauMax()

  // Les voies ouvertes de l'emplacement courant — repliées par défaut à
  // chaque fois qu'un autre emplacement s'ouvre.
  const [voiesOuvertes, setVoiesOuvertes] = useState<Set<string>>(new Set())
  useEffect(() => {
    setVoiesOuvertes(new Set())
  }, [ouvert])

  function basculerVoie(voieId: string) {
    setVoiesOuvertes((precedent) => {
      const suite = new Set(precedent)
      if (suite.has(voieId)) suite.delete(voieId)
      else suite.add(voieId)
      return suite
    })
  }

  /** Retoucher la carte déjà choisie désélectionne — l'emplacement revient vide. */
  function choisir(niveau: number, id: string) {
    const actuel = fiche.capNiveaux?.[String(niveau)]
    const capNiveaux = { ...(fiche.capNiveaux ?? {}) }
    if (actuel === id) {
      delete capNiveaux[String(niveau)]
    } else {
      capNiveaux[String(niveau)] = id
    }
    onMaj({ ...fiche, capNiveaux })
    if (actuel === id) return
    const suivant = niveaux.find((n) => n !== niveau && !capNiveaux[String(n)])
    setOuvert(suivant ?? null)
  }

  return (
    <section>
      <h2 className="titre-etape">Tes capacités</h2>
      <p className="my-2 text-[15.5px] text-muted-foreground">
        À chaque niveau, tu as choisi 1 capacité de ta classe — n'importe quelle voie, de ce
        niveau ou d'un niveau plus bas. Jamais deux fois la même.
      </p>
      <Tutoriel
        etapeId="capacites"
        gestes={[
          'Touche un emplacement : les trois voies de ta classe apparaissent, repliées.',
          'Touche une voie pour l’ouvrir et voir ses capacités, texte complet.',
          'Une capacité déjà prise ailleurs est rayée — jamais deux fois la même.',
          'Retoucher la carte choisie la désélectionne ; « Changer » rouvre un emplacement rempli.',
        ]}
        pourquoi="la voie n'est pas un enclos : elle nomme la capacité, elle ne t'enferme pas."
      />

      {niveaux.map((niveau) => {
        const id = fiche.capNiveaux?.[String(niveau)]
        const capacite = id ? capaciteParId(fiche.classe, id) : undefined
        const estOuvert = ouvert === niveau
        return (
          <div key={niveau} className="carte-choix my-2 rounded-lg border border-border/50 bg-card/50 p-3.5 backdrop-blur-sm">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="m-0 font-sans text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                Capacité du niveau {niveau}
              </h3>
              {capacite && !estOuvert && (
                <button
                  type="button"
                  className="subsel-btn max-w-[8rem] flex-none"
                  onClick={() => setOuvert(niveau)}
                >
                  Changer
                </button>
              )}
            </div>

            {capacite && !estOuvert && (
              <div className="mt-1">
                <LigneCapacite capacite={capacite} />
                <TexteRegle source={capacite} />
              </div>
            )}

            {!capacite && !estOuvert && (
              <button
                type="button"
                className="subsel-btn mt-2 w-full"
                onClick={() => setOuvert(niveau)}
              >
                Choisir
              </button>
            )}

            {estOuvert && (
              <div className="mt-1">
                {groupesParVoie(optionsDuNiveau(fiche, niveau)).map((groupe) => (
                  <AccordeonVoie
                    key={groupe.voieId}
                    voieNom={groupe.voieNom}
                    options={groupe.options}
                    ouverte={voiesOuvertes.has(groupe.voieId)}
                    onBasculer={() => basculerVoie(groupe.voieId)}
                    onChoisir={(id) => choisir(niveau, id)}
                  />
                ))}
                <Note>{texteAide(niveau, plafond)}</Note>
              </div>
            )}
          </div>
        )
      })}
    </section>
  )
}
