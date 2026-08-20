/**
 * L'offre d'installation du navigateur, retenue AVANT React.
 *
 * Chrome n'émet `beforeinstallprompt` qu'après une trentaine de secondes de
 * présence sur la page et au moins un tap — mais rien ne garantit que React
 * soit monté à ce moment-là, ni que l'usager soit sur l'Accueil. Un écouteur
 * posé dans un `useEffect`, dans un composant monté seulement sur l'Accueil,
 * rate l'offre pour tout ce chargement de page : c'est l'une des trois causes
 * mesurées de « je ne trouve aucune façon d'installer l'app ».
 *
 * Ce module pose donc ses écouteurs À L'IMPORT (`src/main.tsx`, avant
 * `createRoot`), retient l'offre dans une variable de module, et laisse
 * l'interface s'y abonner quand elle arrive — même en retard.
 */

/** L'événement n'est pas dans lib.dom : sa forme est déclarée ici. */
interface EvenementInstallation extends Event {
  prompt: () => Promise<void>
}

let offre: EvenementInstallation | null = null
let installee = false
const abonnes = new Set<() => void>()

function prevenir() {
  for (const abonne of abonnes) abonne()
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Sans ceci, le navigateur affiche sa propre invite à notre place.
    e.preventDefault()
    offre = e as EvenementInstallation
    prevenir()
  })
  window.addEventListener('appinstalled', () => {
    // L'offre est morte : elle ne sert qu'une fois, et l'app est installée.
    offre = null
    installee = true
    prevenir()
  })
}

/** L'offre retenue, ou `null` si le navigateur n'a rien dit (encore). */
export function offreRetenue(): EvenementInstallation | null {
  return offre
}

/** S'abonner aux changements ; la fonction rendue se désabonne. */
export function sAbonner(prevenu: () => void): () => void {
  abonnes.add(prevenu)
  return () => {
    abonnes.delete(prevenu)
  }
}

/**
 * Passe la main à l'invite du navigateur. L'offre ne sert qu'une fois : elle
 * est relâchée aussitôt, et l'interface retombe sur « Comment faire ».
 */
export function passerLaMainAuNavigateur(): void {
  const offreDuMoment = offre
  if (!offreDuMoment) return
  offre = null
  prevenir()
  void offreDuMoment.prompt()
}

/**
 * L'app tourne-t-elle déjà installée ? `display-mode: standalone` couvre
 * Android et le bureau, `navigator.standalone` est le seul témoin sur iOS.
 *
 * ⚠️ Défaut d'OUVERTURE : si la détection est indisponible ou lève, on
 * répond « non installée », donc la rangée s'affiche. Un joueur qui voit une
 * rangée inutile s'en remet ; un joueur qui ne trouve pas comment installer,
 * non.
 */
export function dejaInstallee(): boolean {
  if (installee) return true
  try {
    if (typeof window === 'undefined') return false
    if (
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(display-mode: standalone)').matches
    ) {
      return true
    }
    return (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  } catch {
    return false
  }
}
