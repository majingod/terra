/**
 * L'offre d'installation du navigateur, retenue AVANT React.
 *
 * Chrome n'émet `beforeinstallprompt` qu'à son heure — après une présence
 * suffisante sur la page et au moins une interaction — et rien ne garantit
 * que React soit monté à ce moment-là. Un écouteur posé dans un `useEffect`
 * rate l'offre pour tout ce chargement de page : la rangée montre alors
 * « Comment faire », les instructions manuelles, alors que le navigateur
 * offrait l'installation en un tap.
 *
 * Ce module pose donc ses écouteurs À L'IMPORT (`src/main.tsx`, avant
 * `createRoot`), retient l'offre dans une variable de module, et laisse
 * l'interface s'y abonner quand elle arrive — même en retard.
 *
 * ⚠️ Ce module ne connaît QUE l'offre. Savoir si l'app tourne déjà installée
 * reste à la rangée (`dejaInstallee`), qui seule décide de s'afficher.
 */

/** L'événement n'est pas dans lib.dom : sa forme est déclarée ici. */
export interface EvenementInstallation extends Event {
  prompt: () => Promise<void>
}

let offre: EvenementInstallation | null = null
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
    prevenir()
  })
}

/**
 * L'offre retenue, ou `null` si le navigateur n'a rien dit (encore).
 *
 * ⚠️ Rend la variable de module elle-même, jamais une copie : c'est
 * l'instantané que lit `useSyncExternalStore`, et un objet neuf à chaque
 * appel ferait boucler le rendu.
 */
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
 * est relâchée aussitôt, et l'interface retombe sur « Comment faire », qui
 * marche toujours.
 */
export function passerLaMainAuNavigateur(): void {
  const offreDuMoment = offre
  if (!offreDuMoment) return
  offre = null
  prevenir()
  void offreDuMoment.prompt()
}
