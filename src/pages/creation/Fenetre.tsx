/**
 * Fenêtre de répercussions (maquette A v3) : « Si tu continues : » + liste
 * des impacts nommés. Rien n'est appliqué avant Continuer ; Annuler ferme
 * sans rien changer.
 */
interface FenetreProps {
  impacts: string[]
  onContinuer: () => void
  onAnnuler: () => void
}

export default function Fenetre({ impacts, onContinuer, onAnnuler }: FenetreProps) {
  return (
    <div
      className="pas-a-imprimer fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Ce changement a des répercussions"
    >
      <div className="w-full max-w-[440px] rounded-2xl border border-[#3a2c0c] bg-panneau p-4">
        <h3 className="m-0 mb-2 font-titre text-[22px] font-bold text-or">
          Ce changement a des répercussions
        </h3>
        <p className="m-0 text-[#96a0b1]">Si tu continues :</p>
        <ul className="my-2 flex list-disc flex-col gap-1 pl-5 text-[15.5px] text-[#96a0b1]">
          {impacts.map((impact, i) => (
            <li key={i}>{impact}</li>
          ))}
        </ul>
        <div className="mt-3.5 flex gap-2.5">
          <button type="button" className="btn-ghost flex-1" onClick={onAnnuler}>
            Annuler
          </button>
          <button type="button" className="btn-cta" onClick={onContinuer}>
            Continuer
          </button>
        </div>
      </div>
    </div>
  )
}
