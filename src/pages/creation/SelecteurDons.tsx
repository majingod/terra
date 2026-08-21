/**
 * La carte d'un don — extraite telle quelle de l'étape « Tes talents » pour
 * être RÉUTILISÉE : la création y choisit ses dons, la montée de niveau
 * (D17) le don que l'échelon atteint apporte. Une seule carte de don existe
 * dans l'app : celle-ci.
 *
 * Elle ne compte aucun droit et ne connaît aucune règle : l'écran qui l'appelle
 * lui dit combien de fois ce don est pris (`n`) et si le droit est épuisé
 * (`plein`) — ce qui éteint les cartes non prises.
 */
import type { Don } from '../../rules/load'
import { Badge, CarteChoix, TexteRegle } from './ui'

export function CarteDon({
  don,
  n,
  plein,
  onMaj,
}: {
  don: Don
  /** Nombre de prises de ce don (0 = non pris). */
  n: number
  /** Droit épuisé : la carte non prise s'éteint. */
  plein: boolean
  onMaj: (id: string, n: number) => void
}) {
  return (
    <CarteChoix
      petite
      choisi={n > 0}
      eteinte={plein && n === 0}
      onChoisir={() => {
        if (n > 0) onMaj(don.id, 0)
        else if (!plein) onMaj(don.id, 1)
      }}
    >
      <h3 className="m-0 mb-1 font-titre text-[17.5px] font-bold text-gold">
        {don.nom}
        {don.cumulable && <Badge>cumulable</Badge>}
        {n > 1 && <Badge variante="gold">×{n}</Badge>}
      </h3>
      <TexteRegle source={don} />
      {don.cumulable && n > 0 && (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            className="subsel-btn"
            onClick={(e) => {
              e.stopPropagation()
              onMaj(don.id, n - 1)
            }}
          >
            − Retirer
          </button>
          <button
            type="button"
            className="subsel-btn"
            disabled={plein}
            onClick={(e) => {
              e.stopPropagation()
              if (!plein) onMaj(don.id, n + 1)
            }}
          >
            + Reprendre (×{n + 1})
          </button>
        </div>
      )}
    </CarteChoix>
  )
}
