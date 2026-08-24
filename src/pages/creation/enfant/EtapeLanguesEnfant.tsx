/**
 * Flux ≤11 — étape Langues (D24), conditionnelle : elle n'existe que si le
 * métier choisi est Érudit. Le Commun est déjà acquis, Érudit en ajoute 2 —
 * choisis en pastilles, ⚠️ des `<button>` (jamais `input`/`select`, G7).
 */
import { useState } from 'react'
import { getRulesKids } from '../../../rules/kids'
import { droitLanguesEnfant, languesPigeablesEnfant } from '../../../rules/langues_kids'
import { avecChoixEnfant, choixEnfant } from '../../../wizard/enfant'
import type { FicheCreation } from '../../../wizard/types'
import { ErreurNote, Note, Tutoriel } from '../ui'

interface Props {
  fiche: FicheCreation
  onMaj: (fiche: FicheCreation) => void
}

export default function EtapeLanguesEnfant({ fiche, onMaj }: Props) {
  const choix = choixEnfant(fiche)
  const langues = choix.langues ?? []
  const droit = droitLanguesEnfant(choix.competence)
  const [refus, setRefus] = useState(false)

  function basculer(id: string) {
    if (langues.includes(id)) {
      setRefus(false)
      onMaj(avecChoixEnfant(fiche, { langues: langues.filter((l) => l !== id) }))
      return
    }
    if (langues.length >= droit) {
      setRefus(true)
      return
    }
    setRefus(false)
    onMaj(avecChoixEnfant(fiche, { langues: [...langues, id] }))
  }

  return (
    <section>
      <h2 className="titre-etape">Tes langues</h2>
      <Tutoriel
        etapeId="enfant-langues"
        gestes={['Ton personnage parle déjà le Commun.', 'Grâce à Érudit, choisis 2 autres langues.']}
        pourquoi={`« ${getRulesKids().langues.regle_declaration} »`}
      />
      {choix.classe === 'druide' && (
        <Note>🌿 Ton personnage parle aussi déjà le Druidique — le langage secret des druides !</Note>
      )}
      <div className="flex flex-wrap gap-2">
        {languesPigeablesEnfant().map((langue) => {
          const choisie = langues.includes(langue.id)
          return (
            <button
              key={langue.id}
              type="button"
              className={`chip ${choisie ? 'chip-on' : ''}`}
              onClick={() => basculer(langue.id)}
            >
              {langue.nom}
              {choisie ? ' ✕' : ''}
            </button>
          )
        })}
      </div>
      {refus && <ErreurNote>Tu as déjà 2 langues — décoche-en une d'abord.</ErreurNote>}
    </section>
  )
}
