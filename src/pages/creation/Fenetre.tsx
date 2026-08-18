/**
 * Fenêtre de répercussions : nomme ce qui se retire tout seul (régime 1)
 * et ce que le joueur devra retirer lui-même (régime 2). Annuler restaure
 * tout.
 */
interface FenetreProps {
  titre: string
  retraits: string[]
  aRetirerParJoueur: string[]
  onConfirmer: () => void
  onAnnuler: () => void
}

export default function Fenetre({
  titre,
  retraits,
  aRetirerParJoueur,
  onConfirmer,
  onAnnuler,
}: FenetreProps) {
  return (
    <div
      className="pas-a-imprimer fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={titre}
    >
      <div className="w-full max-w-md rounded-2xl border-2 border-or bg-panneau p-5 shadow-2xl">
        <h2 className="font-titre text-xl font-bold text-or">{titre}</h2>
        {retraits.length > 0 && (
          <>
            <p className="mt-3 text-sm text-stone-300">Ce choix retire automatiquement :</p>
            <ul className="mt-1 flex list-disc flex-col gap-1 pl-5">
              {retraits.map((retrait, i) => (
                <li key={i}>{retrait}</li>
              ))}
            </ul>
          </>
        )}
        {aRetirerParJoueur.length > 0 && (
          <>
            <p className="mt-3 text-sm font-semibold text-legion">À retirer toi-même ensuite :</p>
            <ul className="mt-1 flex list-disc flex-col gap-1 pl-5 text-legion">
              {aRetirerParJoueur.map((surplus, i) => (
                <li key={i}>{surplus}</li>
              ))}
            </ul>
          </>
        )}
        <div className="mt-5 flex gap-3">
          <button type="button" className="btn-secondaire !border-2 !text-base" onClick={onAnnuler}>
            Annuler
          </button>
          <button type="button" className="btn-continuer" onClick={onConfirmer}>
            Confirmer
          </button>
        </div>
      </div>
    </div>
  )
}
