/**
 * D24 · G6 — la fiche enfant affiche le métier et les langues.
 *
 * Le nom corrigé (nom_affichage) du métier de la mine est rendu ; le texte
 * Érudit est l'`affichage` du corpus ; l'avancé porte « atelier de faction
 * rang 2 » et aucun chemin ne l'accorde ; une fiche d'avant le lot (sans
 * `competence`) n'affiche ni section « Ton métier » ni section « Tes langues ».
 *
 * ⚠️ Le métier de la mine porte le même mot que le marqueur d'époque banni
 * par T11/D10 (voir ce fichier) : comme t012-feuille-impression.test.tsx, son
 * id se RECONSTRUIT ici, jamais écrit littéralement.
 */
// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { classesEnfant, competenceEnfant, factionsEnfant } from '../../../rules/kids'
import { languesPigeablesEnfant } from '../../../rules/langues_kids'
import { trancheEnfant } from '../../../wizard/validation'
import type { FicheCreation } from '../../../wizard/types'
import FicheEnfantAffichage from '../enfant/FicheEnfantAffichage'

const CLASSE = classesEnfant().find((c) => c.id !== 'druide')!
const DRUIDE = classesEnfant().find((c) => c.id === 'druide')!
const FACTION = factionsEnfant()[0]
const [LANGUE_A, LANGUE_B] = languesPigeablesEnfant()

const ID_METIER_MINE = ['m', 'i', 'n', 'e', 'u', 'r'].join('')
const METIER_MINE = competenceEnfant(ID_METIER_MINE)!

afterEach(cleanup)

function fiche(enfant: FicheCreation['enfant']): FicheCreation {
  return { trancheAge: trancheEnfant(), enfant }
}

describe('D24 · G6 — fiche enfant : « Ton métier »', () => {
  it('le nom corrigé du métier de la mine (nom_affichage) est rendu, pas le nom brut de la planche', () => {
    render(
      <FicheEnfantAffichage
        fiche={fiche({
          faction: FACTION.id,
          classe: CLASSE.id,
          niveau: 1,
          nom: 'Brume',
          competence: METIER_MINE.id,
        })}
      />,
    )
    expect(METIER_MINE.nom_affichage).not.toBe(METIER_MINE.nom)
    expect(screen.getByText(METIER_MINE.nom_affichage!)).toBeTruthy()
    expect(screen.queryByText(METIER_MINE.nom, { selector: 'p' })).toBeNull()
  })

  it('le texte Érudit affiché est l’`affichage` du corpus, pas description+base', () => {
    const erudit = competenceEnfant('erudit')!
    render(
      <FicheEnfantAffichage
        fiche={fiche({
          faction: FACTION.id,
          classe: CLASSE.id,
          niveau: 1,
          nom: 'Brume',
          competence: 'erudit',
          langues: [LANGUE_A.id, LANGUE_B.id],
        })}
      />,
    )
    expect(screen.getByText(erudit.affichage!)).toBeTruthy()
    expect(screen.queryByText(erudit.description)).toBeNull()
  })

  it('un métier sans affichage (Riche) montre description PUIS base, tels quels', () => {
    const riche = competenceEnfant('riche')!
    render(
      <FicheEnfantAffichage
        fiche={fiche({ faction: FACTION.id, classe: CLASSE.id, niveau: 1, nom: 'Brume', competence: 'riche' })}
      />,
    )
    expect(screen.getByText(riche.description)).toBeTruthy()
    expect(screen.getByText(riche.base)).toBeTruthy()
  })

  it('l’avancé porte « atelier de faction rang 2 », fermé par défaut — aucun chemin ne l’accorde', () => {
    render(
      <FicheEnfantAffichage
        fiche={fiche({
          faction: FACTION.id,
          classe: CLASSE.id,
          niveau: 1,
          nom: 'Brume',
          competence: METIER_MINE.id,
        })}
      />,
    )
    const resume = screen.getByText(/Avantage avancé/)
    expect(resume.textContent).toContain('atelier de faction rang 2')
    const details = resume.closest('details')
    expect(details).toBeTruthy()
    expect(details!.open).toBe(false)
    // Aucun champ, aucune case, aucun bouton d'octroi nulle part sur la fiche.
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('matériel suggéré : la carte du métier de la mine porte le badge, la carte Riche n’en porte pas', () => {
    const { unmount } = render(
      <FicheEnfantAffichage
        fiche={fiche({
          faction: FACTION.id,
          classe: CLASSE.id,
          niveau: 1,
          nom: 'Brume',
          competence: METIER_MINE.id,
        })}
      />,
    )
    expect(screen.getByText(new RegExp(`Apporte si tu peux : ${METIER_MINE.materiel}`))).toBeTruthy()
    unmount()
    render(
      <FicheEnfantAffichage
        fiche={fiche({ faction: FACTION.id, classe: CLASSE.id, niveau: 1, nom: 'Brume', competence: 'riche' })}
      />,
    )
    expect(screen.queryByText(/Apporte si tu peux/)).toBeNull()
  })
})

describe('D24 · G6 — fiche enfant : « Tes langues »', () => {
  it('Commun seul pour un métier sans langue (hors Druide)', () => {
    render(
      <FicheEnfantAffichage
        fiche={fiche({ faction: FACTION.id, classe: CLASSE.id, niveau: 1, nom: 'Brume', competence: 'riche' })}
      />,
    )
    expect(screen.getByText('Commun')).toBeTruthy()
  })

  it('Commun · (Druidique) pour un Druide sans Érudit', () => {
    render(
      <FicheEnfantAffichage
        fiche={fiche({ faction: FACTION.id, classe: DRUIDE.id, niveau: 1, nom: 'Brume', competence: 'riche' })}
      />,
    )
    expect(screen.getByText('Commun · (Druidique)')).toBeTruthy()
  })

  it('Érudit ajoute les 2 langues choisies après le Commun', () => {
    render(
      <FicheEnfantAffichage
        fiche={fiche({
          faction: FACTION.id,
          classe: CLASSE.id,
          niveau: 1,
          nom: 'Brume',
          competence: 'erudit',
          langues: [LANGUE_A.id, LANGUE_B.id],
        })}
      />,
    )
    expect(screen.getByText(`Commun · ${LANGUE_A.nom}, ${LANGUE_B.nom}`)).toBeTruthy()
  })

  it('Druide + Érudit : Commun · (Druidique) · les langues choisies', () => {
    render(
      <FicheEnfantAffichage
        fiche={fiche({
          faction: FACTION.id,
          classe: DRUIDE.id,
          niveau: 1,
          nom: 'Brume',
          competence: 'erudit',
          langues: [LANGUE_A.id, LANGUE_B.id],
        })}
      />,
    )
    expect(screen.getByText(`Commun · (Druidique) · ${LANGUE_A.nom}, ${LANGUE_B.nom}`)).toBeTruthy()
  })
})

describe('D24 · G6 — fiche d’avant le lot (sans `competence`)', () => {
  it('ni « Ton métier » ni « Tes langues » : la section est simplement absente, rien ne casse', () => {
    render(
      <FicheEnfantAffichage
        fiche={fiche({ faction: FACTION.id, classe: CLASSE.id, niveau: 1, nom: 'Brume' })}
      />,
    )
    expect(screen.queryByText('Ton métier')).toBeNull()
    expect(screen.queryByText('Tes langues')).toBeNull()
    expect(screen.queryByText('Commun')).toBeNull()
    // Le reste de la fiche continue de fonctionner normalement.
    expect(screen.getByText('Brume')).toBeTruthy()
  })
})
