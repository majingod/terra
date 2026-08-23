/**
 * D26 — le bandeau qui explique le retour des fiches retirées.
 *
 * Il n'apparaît qu'au passage où le balayage a REMONTÉ au moins une fiche.
 * Ensuite il n'a plus de raison d'être : le balayage est idempotent, il ne
 * remontera plus jamais rien. C'est pour ça que « Compris » est un état de
 * session et non une préférence persistée — il n'y a rien à se rappeler.
 */

/** Le compte, avec son accord — verbatim. */
export function phraseRetour(nombre: number): string {
  return nombre >= 2
    ? `${nombre} fiches retirées sont revenues dans ta liste.`
    : '1 fiche retirée est revenue dans ta liste.'
}

/** La nouvelle règle du jeu, mot pour mot. */
export const EXPLICATION_CORBEILLE =
  "La corbeille n'existe plus. « Supprimer » efface maintenant une fiche pour de bon — l'app te le demandera deux fois."

interface Props {
  nombre: number
  onCompris: () => void
}

export default function BandeauRetourDesFiches({ nombre, onCompris }: Props) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-gold/60 bg-card/50 p-4 text-gold backdrop-blur-sm">
      <p className="font-bold">{phraseRetour(nombre)}</p>
      <p className="text-[15px]">{EXPLICATION_CORBEILLE}</p>
      <button type="button" className="btn-ghost self-end text-gold" onClick={onCompris}>
        Compris
      </button>
    </div>
  )
}
