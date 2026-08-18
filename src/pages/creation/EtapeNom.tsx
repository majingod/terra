/**
 * Étape 8 — Nom (maquette A v3) : nom du personnage — jamais le vrai nom —
 * et histoire optionnelle. Aucun nom réel nulle part (D10).
 */
import { Tutoriel } from './ui'
import type { FicheCreation } from '../../wizard/types'

interface Props {
  fiche: FicheCreation
  onMaj: (fiche: FicheCreation) => void
}

const CHAMP =
  'w-full rounded-[10px] border-[1.5px] border-ligne bg-[#0b101b] p-3 font-corps text-[16.5px] text-[#dee3ea] focus:border-cta focus:outline-none'

export default function EtapeNom({ fiche, onMaj }: Props) {
  return (
    <section>
      <h2 className="titre-etape">Ton personnage</h2>
      <Tutoriel
        etapeId="nom"
        gestes={[
          'Donne un nom à ton personnage.',
          'Ajoute son histoire si tu veux — c’est optionnel.',
        ]}
        pourquoi="le nom de ton personnage, jamais ton vrai nom : ta fiche reste anonyme."
      />
      <label className="my-2 block text-[17px] font-semibold" htmlFor="inom">
        Nom de ton personnage
      </label>
      <input
        id="inom"
        type="text"
        value={fiche.nom ?? ''}
        onChange={(e) => onMaj({ ...fiche, nom: e.target.value })}
        className={CHAMP}
        placeholder="Ex. Kaelen Sombrelame"
        autoComplete="off"
      />
      <p className="mt-1 text-sm text-[#6b7688]">
        Le nom de ton <b>personnage</b> — jamais ton vrai nom.
      </p>
      <label className="my-2 block text-[17px] font-semibold" htmlFor="ihist">
        Histoire (optionnel)
      </label>
      <textarea
        id="ihist"
        rows={4}
        value={fiche.histoire ?? ''}
        onChange={(e) => onMaj({ ...fiche, histoire: e.target.value })}
        className={CHAMP}
        placeholder="Son passé, ses motivations…"
      />
    </section>
  )
}
