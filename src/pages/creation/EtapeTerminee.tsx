/**
 * Écran de sortie du wizard (D13) : après « Créer la fiche », pas de
 * navigation — juste la confirmation que la fiche vit sur cet appareil et
 * le chemin pour la retrouver (onglet Accueil).
 */
import { Link } from 'react-router-dom'

export default function EtapeTerminee() {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="titre-etape">Fiche créée</h2>
      <p className="carte text-secondary-foreground">
        Ta fiche est enregistrée sur cet appareil. Tu la retrouveras à tout moment dans l'onglet
        Accueil, sous « Mes fiches ».
      </p>
      <Link to="/" className="btn-cta text-center">
        Voir mes fiches
      </Link>
    </section>
  )
}
