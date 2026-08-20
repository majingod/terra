/**
 * Rangée d'installation — le chemin d'installation, maquette v1 validée.
 *
 * Elle est là TOUJOURS, tant que l'app n'est pas installée, et elle est
 * dans le flot de l'accueil : ce n'est pas un bandeau qui flotte et qu'on
 * referme. Deux états seulement, selon ce que le navigateur offre :
 *
 *   1. le navigateur offre l'installation (`beforeinstallprompt`)
 *      → bouton doré « Installer », qui passe la main à son invite ;
 *   2. le navigateur ne dit rien (iOS, Samsung, Chrome pas encore décidé)
 *      → bouton fantôme « Comment faire », qui ouvre les instructions.
 *
 * Le correctif tient dans le cas 2 : aujourd'hui, quand le navigateur se
 * tait, il n'y a RIEN à l'écran, et le joueur n'a aucun moyen de savoir que
 * l'app s'installe.
 *
 * Une fois l'app installée, la rangée disparaît complètement — plus rien à
 * lire, plus rien à ignorer.
 */
import { useEffect, useState } from 'react'
import FeuilleInstallation from './FeuilleInstallation'

/** L'événement n'est pas dans lib.dom : sa forme est déclarée ici. */
interface EvenementInstallation extends Event {
  prompt: () => Promise<void>
}

/**
 * L'app tourne-t-elle déjà installée ? `display-mode: standalone` couvre
 * Android et le bureau ; `navigator.standalone` est le seul témoin sur iOS.
 * jsdom n'a pas `matchMedia` : la garde n'est pas décorative.
 */
export function dejaInstallee(): boolean {
  if (typeof window === 'undefined') return false
  const enStandalone =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches
  const iOS = (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  return enStandalone || iOS
}

export default function RangeeInstallation() {
  const [offre, setOffre] = useState<EvenementInstallation | null>(null)
  const [installee, setInstallee] = useState(dejaInstallee)
  const [instructions, setInstructions] = useState(false)

  useEffect(() => {
    function surOffre(e: Event) {
      // Sans ceci, le navigateur affiche sa propre invite à notre place.
      e.preventDefault()
      setOffre(e as EvenementInstallation)
    }
    function surInstallation() {
      setOffre(null)
      setInstallee(true)
      setInstructions(false)
    }
    window.addEventListener('beforeinstallprompt', surOffre)
    window.addEventListener('appinstalled', surInstallation)
    return () => {
      window.removeEventListener('beforeinstallprompt', surOffre)
      window.removeEventListener('appinstalled', surInstallation)
    }
  }, [])

  if (installee) return null

  return (
    <>
      <div className="pas-a-imprimer flex items-center gap-3 rounded-lg border border-border/50 bg-card/50 p-4 backdrop-blur-sm">
        <div className="min-w-0 flex-1">
          <div className="font-titre text-[15.5px] tracking-wide text-gold">Installer l’app</div>
          <p className="m-0 mt-0.5 text-[15px] leading-snug text-muted-foreground">
            Sur ton écran d’accueil, elle s’ouvre sans réseau.
          </p>
        </div>

        {offre ? (
          <button
            type="button"
            className="terra-button flex min-h-touch flex-none items-center justify-center px-4 py-3 text-[16px]"
            onClick={() => {
              // L'offre ne sert qu'une fois : après elle, la rangée bascule
              // sur « Comment faire », qui marche toujours.
              void offre.prompt()
              setOffre(null)
            }}
          >
            Installer
          </button>
        ) : (
          <button
            type="button"
            className="btn-ghost flex-none px-4 text-[16px]"
            onClick={() => setInstructions(true)}
          >
            Comment faire
          </button>
        )}
      </div>

      {instructions && <FeuilleInstallation onFermer={() => setInstructions(false)} />}
    </>
  )
}
