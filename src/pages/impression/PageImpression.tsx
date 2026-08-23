/**
 * L'écran d'impression : la feuille du personnage, pleine page, telle
 * qu'elle sortira de l'imprimante.
 *
 * ⛔ La page ne se replie JAMAIS. Sa largeur est fixe (196 mm) ; à l'écran
 * elle se met à l'échelle D'UN BLOC — `transform: scale()` calculé sur la
 * largeur disponible. Aucune media query de re-flow : ce qui est à l'écran
 * EST la page, réduite. À l'impression, l'échelle retombe à 1 (CSS_FEUILLE).
 *
 * ⛔ Les contrôles vivent hors de la zone imprimée (`pas-a-imprimer`, comme
 * partout ailleurs dans l'app) : le rendu imprimé ne porte aucun bouton.
 */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db'
import FeuilleImpression from './FeuilleImpression'

/** Met la page à l'échelle de la largeur disponible, d'un seul bloc. */
function ApercuALEchelle({ children }: { children: ReactNode }) {
  const boite = useRef<HTMLDivElement>(null)
  const [echelle, setEchelle] = useState(1)
  const [hauteur, setHauteur] = useState<number | undefined>(undefined)

  useLayoutEffect(() => {
    const cadre = boite.current
    const page = cadre?.firstElementChild as HTMLElement | null
    if (!cadre || !page) return
    // offsetWidth/offsetHeight : la taille de MISE EN PAGE, que le transform
    // ne change pas — sinon la mesure et l'échelle s'alimenteraient l'une
    // l'autre à chaque passe.
    const mesurer = () => {
      const rapport = Math.min(1, cadre.clientWidth / page.offsetWidth)
      setEchelle(rapport)
      setHauteur(page.offsetHeight * rapport)
    }
    mesurer()
    const observateur = new ResizeObserver(mesurer)
    observateur.observe(cadre)
    observateur.observe(page)
    return () => observateur.disconnect()
  }, [children])

  return (
    <div ref={boite} className="tm-apercu" style={{ height: hauteur }}>
      <div style={{ transform: `scale(${echelle})` }}>{children}</div>
    </div>
  )
}

export default function PageImpression() {
  const { id } = useParams()
  // `?? null` : sans lui, `undefined` voudrait dire deux choses — la requête
  // n'a pas encore répondu, OU la fiche n'existe pas. Le repli « fiche
  // introuvable » ne se déclencherait jamais.
  const personnage = useLiveQuery(
    () => db.personnages.get(Number(id)).then((p) => p ?? null),
    [id],
  )

  // Le navigateur ouvre son dialogue d'impression dès que la feuille est là :
  // c'est l'action « Imprimer » de la fiche qui mène ici.
  const fiche = personnage?.creation
  const imprimable = Boolean(fiche && !fiche.enfant && fiche.classe)
  useEffect(() => {
    if (imprimable) window.print()
  }, [imprimable])

  if (personnage === undefined) return <p className="text-muted-foreground">Chargement…</p>

  if (!fiche || !imprimable) {
    return (
      <div className="flex flex-col gap-4">
        <p className="carte text-secondary-foreground">
          Cette fiche n’a pas de feuille pleine page à imprimer.
        </p>
        <Link to="/" className="btn-secondaire">
          Retour à l’accueil
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <ApercuALEchelle>
        <FeuilleImpression fiche={fiche} />
      </ApercuALEchelle>
      <div className="pas-a-imprimer flex flex-col gap-3">
        <button type="button" onClick={() => window.print()} className="btn-secondaire">
          🖨 Imprimer / Enregistrer en PDF
        </button>
        <Link to={`/fiche/${personnage.id}`} className="btn-secondaire text-center">
          Retour à la fiche
        </Link>
      </div>
    </div>
  )
}
