/**
 * Composants partagés du wizard, conformes à la maquette A v3 validée :
 * carte avec coche ✓ (défilement sous les en-têtes collants), badges
 * colorés, tutoriel repliable 💡, notes et bandeaux d'erreur.
 */
import { useRef, useState, type ReactNode } from 'react'

/** Place un élément en haut de l'écran, sous les en-têtes collants. */
export function placerEnHaut(el: HTMLElement | null) {
  if (!el) return
  requestAnimationFrame(() => {
    el.scrollIntoView({ block: 'start' })
  })
}

type Peau = 'or' | 'sanctum' | 'legion'

interface CarteChoixProps {
  choisi: boolean
  /** Appelé au clic sur la carte (pas sur ses contrôles internes). */
  onChoisir: () => void
  peau?: Peau
  /** Carte éteinte et non cliquable (interdit / droit épuisé). */
  eteinte?: boolean
  petite?: boolean
  children: ReactNode
}

const BORDS: Record<Peau, string> = {
  or: 'border-primary bg-primary/10',
  sanctum: 'border-sanctum/60 bg-sanctum/10 glow-sanctum',
  legion: 'border-legion/60 bg-legion/10 glow-legion',
}
const COCHES: Record<Peau, string> = {
  or: 'bg-primary border-primary',
  sanctum: 'bg-sanctum border-sanctum',
  legion: 'bg-legion border-legion',
}

/**
 * Carte de choix (maquette) : div cliquable avec coche ✓ en haut à droite ;
 * après un choix, la carte se place en haut de l'écran. Jamais de
 * défilement sur un simple re-rendu.
 */
export function CarteChoix({
  choisi,
  onChoisir,
  peau = 'or',
  eteinte = false,
  petite = false,
  children,
}: CarteChoixProps) {
  const ref = useRef<HTMLDivElement>(null)
  return (
    <div
      ref={ref}
      role="button"
      tabIndex={eteinte ? -1 : 0}
      aria-pressed={choisi}
      aria-disabled={eteinte}
      onClick={(e) => {
        e.stopPropagation()
        if (eteinte) return
        const deja = choisi
        onChoisir()
        if (!deja) placerEnHaut(ref.current)
      }}
      onKeyDown={(e) => {
        if (eteinte) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          e.stopPropagation()
          const deja = choisi
          onChoisir()
          if (!deja) placerEnHaut(ref.current)
        }
      }}
      className={`carte-choix relative my-2 rounded-lg border ${petite ? 'p-2.5 pr-11' : 'p-3.5 pr-12'} ${
        choisi ? BORDS[peau] : 'border-border/50 bg-card/50 backdrop-blur-sm'
      } ${eteinte ? 'cursor-not-allowed opacity-45' : 'cursor-pointer'}`}
    >
      {children}
      <div
        aria-hidden
        className={`absolute right-3 top-3.5 flex h-[26px] w-[26px] items-center justify-center rounded-lg border-2 text-base ${
          choisi ? `${COCHES[peau]} text-white` : 'border-border bg-input text-transparent'
        }`}
      >
        ✓
      </div>
    </div>
  )
}

export function TitreCarte({
  peau,
  children,
}: {
  peau?: 'sanctum' | 'legion'
  children: ReactNode
}) {
  const couleur =
    peau === 'sanctum' ? 'text-sanctum-texte' : peau === 'legion' ? 'text-legion-texte' : 'text-gold'
  return (
    <h3 className={`m-0 mb-1 font-titre text-[21px] font-bold ${couleur}`}>{children}</h3>
  )
}

export function Badge({
  variante,
  children,
}: {
  variante?: 'xp' | 'pv' | 'mana' | 'lutte' | 'gold'
  children: ReactNode
}) {
  return <span className={`badge ${variante ? `badge-${variante}` : ''}`}>{children}</span>
}

/** Badge coloré automatiquement selon le libellé (+1 PV, +2 Mana, …). */
export function BadgeBonus({ libelle }: { libelle: string }) {
  const variante = /PV/i.test(libelle) ? 'pv' : /Mana/i.test(libelle) ? 'mana' : 'lutte'
  return <Badge variante={variante}>{libelle}</Badge>
}

export function Note({ children }: { children: ReactNode }) {
  return <div className="note">{children}</div>
}

export function ErreurNote({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="err-note">
      {children}
    </div>
  )
}

interface TutorielProps {
  etapeId: string
  gestes: ReactNode[]
  pourquoi: ReactNode
}

/**
 * « 💡 Comment fonctionne cette étape » : cadre repliable, état replié
 * mémorisé pour la session (sessionStorage).
 */
export function Tutoriel({ etapeId, gestes, pourquoi }: TutorielProps) {
  const cle = `tuto-${etapeId}`
  const [replie, setReplie] = useState(() => sessionStorage.getItem(cle) === 'replie')
  return (
    <div className="pas-a-imprimer my-2 overflow-hidden rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm">
      <button
        type="button"
        className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left font-sans text-sm text-secondary-foreground"
        onClick={() => {
          const suite = !replie
          setReplie(suite)
          sessionStorage.setItem(cle, suite ? 'replie' : 'deplie')
        }}
        aria-expanded={!replie}
      >
        <span aria-hidden>💡</span>
        <b className="text-secondary-foreground">Comment fonctionne cette étape</b>
        <span aria-hidden className="ml-auto text-muted-foreground">
          {replie ? '▸' : '▾'}
        </span>
      </button>
      {!replie && (
        <div>
          <ol className="m-0 flex list-decimal flex-col gap-1 px-3.5 pb-3 pl-8 text-[15px] text-muted-foreground">
            {gestes.map((geste, i) => (
              <li key={i}>{geste}</li>
            ))}
          </ol>
          <p className="m-0 border-t border-dashed border-border/50 px-3.5 pb-3 pt-2 text-sm italic text-muted-foreground">
            Pourquoi : {pourquoi}
          </p>
        </div>
      )}
    </div>
  )
}

/**
 * Source d'un texte de règle : le verbatim du Tome et, quand les données en
 * portent une, sa correction d'affichage.
 *
 * D14 : les coquilles se corrigent À L'AFFICHAGE, le verbatim sous gate reste
 * intact à l'octet près. Les corrections vivent dans les données
 * (rules.json 1.1.0, champs `affichage`), jamais dans le code.
 *
 * Un texte porte au moins l'un des deux. Le corpus enfant a des textes
 * arbitrés (règle maison, présentation des factions) qui n'ont pas de
 * verbatim de planche : leur seule forme est `affichage`, et rien n'est
 * inventé pour combler la case manquante.
 */
export type SourceDeTexte =
  | { verbatim: string; affichage?: string }
  | { verbatim?: string; affichage: string }

/** Le texte à montrer : `affichage` s'il existe, sinon le verbatim (D14). */
export function texteAffiche(source: SourceDeTexte): string {
  return source.affichage ?? source.verbatim ?? ''
}

/**
 * Le SEUL composant qui rend un texte de règle. Il prend la donnée elle-même
 * (une capacité, un don, un désavantage…), jamais une chaîne recopiée, et en
 * affiche `affichage ?? verbatim`. Aucune correction n'est codée ici : elles
 * vivent toutes dans les champs `affichage` des données (rules.json 1.1.0).
 */
export function TexteRegle({
  source,
  gras,
  etiquette,
  classe,
  enfants,
}: {
  source: SourceDeTexte
  gras?: string
  /**
   * Étiquette rendue TELLE QUELLE en gras — celles que le Tome écrit
   * lui-même (« Mana. », « Fouiller une personne : ») et celles que l'écran
   * pose (« Avantage de base : »). `gras`, lui, ajoute son propre point.
   */
  etiquette?: string
  /** Peau du paragraphe. Sans elle, celle du wizard, inchangée. */
  classe?: string
  /**
   * Le texte DÉJÀ découpé, quand l'écran doit y glisser un lien croisé. Ce
   * découpage part toujours de `texteAffiche(source)` : D14 s'applique en
   * amont, et `source` reste la source de vérité du paragraphe.
   */
  enfants?: ReactNode
}) {
  return (
    <p className={classe ?? 'my-1 text-[15px] italic text-secondary-foreground'}>
      {gras && <b className="not-italic">{gras}. </b>}
      {etiquette && <b className="not-italic">{etiquette} </b>}
      {enfants ?? texteAffiche(source)}
    </p>
  )
}
