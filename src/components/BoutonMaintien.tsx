/**
 * Le 2e geste de D23 : un bouton qui n'agit qu'après un MAINTIEN de 1 500 ms,
 * avec un remplissage progressif qui montre où en est le geste.
 *
 * Arbitrage Fred (maquette tactile validée) : relâcher, quitter le bouton ou
 * voir le pointeur annulé AVANT la fin ne fait rien du tout — et la barre
 * repart de zéro. Le premier geste (ouvrir le panneau) n'efface rien ; celui-ci
 * est le seul qui efface, et il demande de la volonté.
 *
 * ⛔ Le clavier n'est pas un parcours au rabais : Entrée ou Espace ENFONCÉE
 * 1 500 ms est le même geste, avec la même barre (l'auto-répétition du système
 * est ignorée — sinon la touche se relancerait toute seule).
 *
 * Sur mobile, sans `touch-action: none` le navigateur prend le maintien pour un
 * défilement, et sans `contextmenu` prévenu Android ouvre le menu d'appui long
 * au milieu du geste.
 *
 * Le chrono est un `setInterval` — pas une animation : il se pilote à la
 * milliseconde sous les fake timers de vitest, ce qu'exige la gate G2.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

/** La durée du maintien, arbitrée sur maquette. */
export const DUREE_MAINTIEN_MS = 1500
/** Le pas du remplissage : assez fin pour être fluide, assez gros pour être bon marché. */
const PAS_MS = 50

interface Props {
  /** Le libellé du bouton, verbatim. */
  children: React.ReactNode
  /** Appelé UNE fois, quand le maintien est allé jusqu'au bout. */
  onMaintienComplet: () => void
  className?: string
}

export default function BoutonMaintien({ children, onMaintienComplet, className = '' }: Props) {
  const [ecoule, setEcoule] = useState(0)
  const ecouleRef = useRef(0)
  const minuterie = useRef<ReturnType<typeof setInterval> | null>(null)

  const arreter = useCallback(() => {
    if (minuterie.current !== null) {
      clearInterval(minuterie.current)
      minuterie.current = null
    }
    ecouleRef.current = 0
    setEcoule(0)
  }, [])

  const demarrer = useCallback(() => {
    // Un geste déjà en cours ne se relance pas (auto-répétition clavier,
    // deuxième doigt sur le même bouton).
    if (minuterie.current !== null) return
    ecouleRef.current = 0
    setEcoule(0)
    minuterie.current = setInterval(() => {
      ecouleRef.current += PAS_MS
      setEcoule(ecouleRef.current)
      if (ecouleRef.current >= DUREE_MAINTIEN_MS) {
        arreter()
        onMaintienComplet()
      }
    }, PAS_MS)
  }, [arreter, onMaintienComplet])

  // Le panneau peut se fermer (ou l'écran changer) pendant un maintien : le
  // chrono ne survit jamais au bouton qui le portait.
  useEffect(() => () => {
    if (minuterie.current !== null) clearInterval(minuterie.current)
  }, [])

  const pourcent = Math.min(100, Math.round((ecoule / DUREE_MAINTIEN_MS) * 100))

  return (
    <button
      type="button"
      className={`relative flex min-h-touch items-center justify-center overflow-hidden rounded-lg
        border border-destructive bg-destructive px-4 py-3 font-corps text-lg
        text-destructive-foreground ${className}`}
      style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
      onPointerDown={demarrer}
      onPointerUp={arreter}
      onPointerLeave={arreter}
      onPointerCancel={arreter}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.repeat) return
        if (e.key !== 'Enter' && e.key !== ' ') return
        // Sans ceci, le navigateur déclencherait un `click` sur la touche —
        // c'est-à-dire une suppression en UN geste.
        e.preventDefault()
        demarrer()
      }}
      onKeyUp={(e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return
        e.preventDefault()
        arreter()
      }}
      onBlur={arreter}
    >
      {/*
        La barre EST l'information : elle reste sous `prefers-reduced-motion`
        (seules les animations décoratives tombent). Aucune transition CSS —
        c'est le chrono qui la fait avancer, pas le navigateur.
      */}
      <span
        role="progressbar"
        aria-label="Progression du maintien"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pourcent}
        className="absolute inset-y-0 left-0 bg-destructive-foreground/30"
        style={{ width: `${pourcent}%` }}
      />
      <span className="relative">{children}</span>
    </button>
  )
}
