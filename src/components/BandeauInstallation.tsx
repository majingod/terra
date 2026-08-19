/**
 * Bandeau d'installation — n'apparaît QUE si le navigateur offre lui-même
 * l'installation (`beforeinstallprompt`). Aucune autre condition : pas de
 * détection de plateforme, pas de relance, pas de second écran. Refermable ;
 * une fois installé, le navigateur cesse d'offrir et le bandeau disparaît.
 */
import { useEffect, useState } from 'react'

/** L'événement n'est pas dans lib.dom : sa forme est déclarée ici. */
interface EvenementInstallation extends Event {
  prompt: () => Promise<void>
}

export default function BandeauInstallation() {
  const [offre, setOffre] = useState<EvenementInstallation | null>(null)
  const [ferme, setFerme] = useState(false)

  useEffect(() => {
    function surOffre(e: Event) {
      // Sans ceci, le navigateur affiche sa propre invite à notre place.
      e.preventDefault()
      setOffre(e as EvenementInstallation)
    }
    function surInstallation() {
      setOffre(null)
    }
    window.addEventListener('beforeinstallprompt', surOffre)
    window.addEventListener('appinstalled', surInstallation)
    return () => {
      window.removeEventListener('beforeinstallprompt', surOffre)
      window.removeEventListener('appinstalled', surInstallation)
    }
  }, [])

  if (!offre || ferme) return null

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm px-3 py-2.5">
      <p className="m-0 flex-1 text-[15px] text-secondary-foreground">
        Garde Terra Mortis sur ton écran d’accueil, même sans réseau.
      </p>
      <button
        type="button"
        className="btn-cta flex-none px-4 py-2 text-[15px]"
        onClick={() => {
          void offre.prompt()
          setOffre(null)
        }}
      >
        Installer l’app
      </button>
      <button
        type="button"
        className="flex-none px-1 text-muted-foreground"
        aria-label="Fermer"
        onClick={() => setFerme(true)}
      >
        ✕
      </button>
    </div>
  )
}
