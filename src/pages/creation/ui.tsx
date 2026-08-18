/**
 * Petits composants partagés du wizard : carte de choix (avec défilement
 * conforme à la maquette), compteur ×n, bandeau rouge, tutoriel repliable.
 */
import { useRef, useState, type ReactNode } from 'react'
import { afficherVerbatim } from '../../wizard/fiche'

/** Place un élément en haut de l'écran, sous les en-têtes collants. */
export function placerEnHaut(el: HTMLElement | null) {
  if (!el) return
  const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  requestAnimationFrame(() => {
    el.scrollIntoView({ behavior: reduit ? 'auto' : 'smooth', block: 'start' })
  })
}

interface CarteChoixProps {
  choisi: boolean
  /** Appelé au clic ; le défilement n'a lieu QUE sur une sélection. */
  onChoisir: () => void
  accent?: 'or' | 'sanctum' | 'legion'
  children: ReactNode
}

/**
 * Carte sélectionnable : après un choix, la carte se place en haut de
 * l'écran (scroll-margin sous les en-têtes collants). Jamais de défilement
 * sur un simple re-rendu.
 */
export function CarteChoix({ choisi, onChoisir, accent = 'or', children }: CarteChoixProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const bordure = choisi
    ? accent === 'sanctum'
      ? 'border-sanctum'
      : accent === 'legion'
        ? 'border-legion'
        : 'border-or'
    : 'border-ligne'
  return (
    <button
      ref={ref}
      type="button"
      onClick={() => {
        const deja = choisi
        onChoisir()
        if (!deja) placerEnHaut(ref.current)
      }}
      className={`carte-choix block min-h-touch w-full rounded-2xl border-2 bg-panneau p-4 text-left transition-colors ${bordure}`}
      aria-pressed={choisi}
    >
      {children}
    </button>
  )
}

interface CompteurProps {
  valeur: number
  min?: number
  max?: number
  onChange: (valeur: number) => void
  etiquette: string
}

/** Compteur ×n : cibles ≥ 44 px, ne déplace jamais l'écran. */
export function Compteur({ valeur, min = 0, max, onChange, etiquette }: CompteurProps) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={etiquette}>
      <button
        type="button"
        className="flex h-11 w-11 items-center justify-center rounded-lg border border-ligne bg-fond text-xl font-bold disabled:opacity-30"
        disabled={valeur <= min}
        onClick={() => onChange(valeur - 1)}
        aria-label={`${etiquette} : moins`}
      >
        −
      </button>
      <span className="min-w-11 text-center font-titre text-lg font-bold text-or">
        ×{valeur}
      </span>
      <button
        type="button"
        className="flex h-11 w-11 items-center justify-center rounded-lg border border-ligne bg-fond text-xl font-bold disabled:opacity-30"
        disabled={max !== undefined && valeur >= max}
        onClick={() => onChange(valeur + 1)}
        aria-label={`${etiquette} : plus`}
      >
        +
      </button>
    </span>
  )
}

export function BandeauRouge({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="rounded-xl border-2 border-legion bg-legion/15 p-3 font-semibold text-legion"
    >
      {children}
    </div>
  )
}

interface TutorielProps {
  etapeId: string
  gestes: string[]
  pourquoi: ReactNode
}

/**
 * « Comment fonctionne cette étape » : cadre repliable, état replié mémorisé
 * pour la session (sessionStorage).
 */
export function Tutoriel({ etapeId, gestes, pourquoi }: TutorielProps) {
  const cle = `tuto-${etapeId}`
  const [replie, setReplie] = useState(() => sessionStorage.getItem(cle) === 'replie')
  return (
    <div className="pas-a-imprimer rounded-xl border border-ligne bg-panneau">
      <button
        type="button"
        className="flex min-h-touch w-full items-center justify-between px-4 py-2 text-left font-titre text-lg font-semibold text-or"
        onClick={() => {
          const suite = !replie
          setReplie(suite)
          sessionStorage.setItem(cle, suite ? 'replie' : 'deplie')
        }}
        aria-expanded={!replie}
      >
        <span>Comment fonctionne cette étape</span>
        <span aria-hidden>{replie ? '▸' : '▾'}</span>
      </button>
      {!replie && (
        <div className="flex flex-col gap-2 px-4 pb-4">
          <ol className="flex list-decimal flex-col gap-1 pl-5">
            {gestes.map((geste, i) => (
              <li key={i}>{geste}</li>
            ))}
          </ol>
          <p className="border-l-2 border-or pl-3 text-sm italic text-stone-300">
            <span className="font-semibold not-italic text-or">Pourquoi : </span>
            {pourquoi}
          </p>
        </div>
      )}
    </div>
  )
}

/** Affiche un verbatim du Tome tel quel, fautes incluses (D5), via la seule
 * exception d'affichage arbitrée (A1 : « tavernier » → « marchand »). */
export function Verbatim({ texte }: { texte: string }) {
  return <p className="text-sm italic text-stone-300">{afficherVerbatim(texte)}</p>
}
