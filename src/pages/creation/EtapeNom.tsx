/**
 * Étape 8 — Nom : « Nom de ton personnage — jamais ton vrai nom » ;
 * histoire optionnelle. Aucun nom réel nulle part (D10).
 */
import { Tutoriel } from './ui'
import type { FicheCreation } from '../../wizard/types'

interface Props {
  fiche: FicheCreation
  onMaj: (fiche: FicheCreation) => void
}

export default function EtapeNom({ fiche, onMaj }: Props) {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="titre-etape">Qui es-tu, aventurier·ère ?</h1>
      <Tutoriel
        etapeId="nom"
        gestes={[
          'Invente le nom de ton personnage.',
          'Si tu veux, raconte son histoire en quelques lignes.',
        ]}
        pourquoi="La fiche appartient au personnage : on n'y écrit jamais ton vrai nom."
      />
      <label className="flex flex-col gap-2">
        <span className="font-titre text-lg font-bold">
          Nom de ton personnage — jamais ton vrai nom
        </span>
        <input
          type="text"
          value={fiche.nom ?? ''}
          onChange={(e) => onMaj({ ...fiche, nom: e.target.value })}
          className="min-h-touch rounded-xl border-2 border-ligne bg-panneau px-4 text-lg text-stone-100"
          placeholder="Ex. Kaelen Sombrelame"
          autoComplete="off"
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="font-titre text-lg font-bold">
          Son histoire <span className="text-sm font-normal text-stone-400">(optionnel)</span>
        </span>
        <textarea
          value={fiche.histoire ?? ''}
          onChange={(e) => onMaj({ ...fiche, histoire: e.target.value })}
          rows={6}
          className="rounded-xl border-2 border-ligne bg-panneau p-4 text-lg text-stone-100"
          placeholder="D'où vient ce personnage ? Que cherche-t-il ?"
        />
      </label>
    </section>
  )
}
