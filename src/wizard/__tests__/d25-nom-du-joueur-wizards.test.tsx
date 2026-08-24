/**
 * D25 · G3 — le nom du joueur entre par les DEUX wizards.
 *
 * Les deux flux, pas un seul : un frère de 9 ans et une sœur de 13 créent leurs
 * fiches sur le même téléphone, et c'est précisément cette famille-là qui a
 * besoin de savoir à qui est quelle feuille. Le champ vit donc au même endroit
 * pour les deux (`FicheCreation.nomDuJoueur`), et les deux points de sauvegarde
 * de `Creer` le portent.
 *
 * Le test tape DANS le vrai wizard et lit ce qui atterrit en base — pas ce que
 * le composant a en mémoire. Entre les deux il y a le brouillon, la validation
 * d'étape et l'`add()` : c'est cette chaîne entière qui doit tenir.
 *
 * La saisie porte des espaces autour, exprès : `  Joueur Exemple  ` doit
 * s'enregistrer trimé. Et un champ laissé vide doit laisser la clé ABSENTE —
 * jamais `''`.
 *
 * ⛔ Aucun vrai nom : les valeurs viennent de `NOMS_JOUEUR_FICTIFS` (G1).
 */
// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { db, type Personnage } from '../../db'
import { branchesDe, classesAvecBranches } from '../../rules/branches'
import { classesEnfant, factionsEnfant, niveauxPossiblesEnfant } from '../../rules/kids'
import { niveauMin } from '../../rules/niveau'
import Creer from '../../pages/Creer'
import { AUTRE_NOM_JOUEUR_FICTIF, NOM_JOUEUR_FICTIF } from '../../__tests__/aide-noms-joueur'
import { etapesActivesEnfant } from '../enfant'
import { ETAPES, trancheEnfant } from '../validation'
import { ficheComplete } from './aide-fiche-complete'

const CLASSE = classesAvecBranches()[0].classe_id
const VOIE = branchesDe(CLASSE)[0]
const BAS = niveauMin()

/** L'étape « Nom » de chaque flux — lue de la liste d'étapes, jamais comptée à la main. */
const ETAPE_NOM = ETAPES.findIndex((e) => e.id === 'nom')
/**
 * D24 : `langues-enfant` est conditionnelle — l'index de « Nom » se lit donc
 * des étapes ACTIVES pour une fiche sans métier choisi (celle que
 * `semerBrouillonEnfant` sème plus bas), pas du graphe brut.
 */
const ETAPE_NOM_ENFANT = etapesActivesEnfant({ enfant: {} }).findIndex((e) => e.id === 'nom')

beforeAll(() => {
  // jsdom n'implémente ni l'un ni l'autre ; le wizard s'en sert au clic.
  Element.prototype.scrollIntoView = () => {}
  window.scrollTo = () => {}
})

beforeEach(async () => {
  sessionStorage.clear()
  await db.brouillons.clear()
  await db.personnages.clear()
})

afterEach(async () => {
  cleanup()
  await db.brouillons.clear()
  await db.personnages.clear()
})

function afficheCreer() {
  return render(
    <MemoryRouter initialEntries={['/creer']}>
      <Routes>
        <Route path="/creer" element={<Creer />} />
        <Route path="/" element={<div>ACCUEIL-TEMOIN</div>} />
        <Route path="/fiche/:id" element={<div>FICHE-TEMOIN</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

/**
 * Un brouillon COMPLET, posé sur l'étape Nom. La création part alors du niveau
 * de départ sans train de montées : ce lot ne teste pas les montées, il teste
 * le champ.
 */
async function semerBrouillonAdulte() {
  const fiche = ficheComplete(CLASSE, BAS, {
    [String(BAS)]: VOIE.capacites.find((c) => c.niveau === BAS)!.id,
  }) as Record<string, unknown>
  delete fiche.niveau
  delete fiche.historique
  await db.brouillons.put({
    id: 1,
    etape: ETAPE_NOM + 1,
    donnees: { fiche } as never,
    updatedAt: Date.now(),
  })
}

/** Le même, côté planche ≤11 : camp, niveau, classe et métier faits, posé sur Nom. */
async function semerBrouillonEnfant() {
  const fiche = {
    trancheAge: trancheEnfant(),
    enfant: {
      faction: factionsEnfant()[0].id,
      classe: classesEnfant()[0].id,
      niveau: niveauxPossiblesEnfant()[0],
      // D24 : Riche, pas Érudit — ce test porte sur le nom du joueur, pas sur
      // l'étape Langues (testée à part).
      competence: 'riche',
      nom: 'Brume',
    },
  }
  await db.brouillons.put({
    id: 1,
    etape: ETAPE_NOM_ENFANT + 1,
    donnees: { fiche } as never,
    updatedAt: Date.now(),
  })
}

/** Le champ du vrai nom, retrouvé par son libellé — celui que le joueur lit. */
function champNomDuJoueur(): HTMLInputElement {
  return screen.getByLabelText(/Ton nom à toi \(le joueur/) as HTMLInputElement
}

/** Va de l'étape Nom à l'étape Fiche, puis crée. */
function creerLaFiche() {
  fireEvent.click(screen.getByRole('button', { name: /^Continuer$/ }))
  const bouton = screen.getByRole('button', { name: /^Créer la fiche$/ }) as HTMLButtonElement
  expect(bouton.disabled, 'la fiche devrait être prête').toBe(false)
  fireEvent.click(bouton)
}

/** L'unique fiche enregistrée. */
async function laFicheEnregistree(): Promise<Personnage> {
  await waitFor(async () => expect(await db.personnages.count()).toBe(1))
  return (await db.personnages.toArray())[0]
}

describe('D25 · G3 — wizard 12+', () => {
  it('la saisie, espaces autour compris, s’enregistre TRIMÉE', async () => {
    await semerBrouillonAdulte()
    afficheCreer()
    await screen.findByRole('heading', { name: 'Ton personnage' })

    fireEvent.change(champNomDuJoueur(), { target: { value: `  ${NOM_JOUEUR_FICTIF}  ` } })
    creerLaFiche()

    expect((await laFicheEnregistree()).nomDuJoueur).toBe(NOM_JOUEUR_FICTIF)
  })

  it('champ laissé vide → la CLÉ est absente, pas une chaîne vide', async () => {
    await semerBrouillonAdulte()
    afficheCreer()
    await screen.findByRole('heading', { name: 'Ton personnage' })

    expect(champNomDuJoueur().value, '⛔ jamais pré-rempli').toBe('')
    creerLaFiche()

    const fiche = await laFicheEnregistree()
    expect(fiche.nomDuJoueur).toBeUndefined()
    expect(Object.prototype.hasOwnProperty.call(fiche, 'nomDuJoueur')).toBe(false)
  })

  it('une saisie faite de blancs ne laisse rien non plus', async () => {
    await semerBrouillonAdulte()
    afficheCreer()
    await screen.findByRole('heading', { name: 'Ton personnage' })

    fireEvent.change(champNomDuJoueur(), { target: { value: '   ' } })
    creerLaFiche()

    const fiche = await laFicheEnregistree()
    expect(Object.prototype.hasOwnProperty.call(fiche, 'nomDuJoueur')).toBe(false)
  })

  it('⚠️ un seul domicile : le nom n’est pas recopié sous `creation`', async () => {
    // ÉCART RAPPORTÉ (voir la PR) : `creation` recopie la fiche du wizard
    // entière. Sans retrait, le nom y serait stocké une seconde fois — NON
    // trimé, et survivant à son propre effacement depuis la fiche.
    await semerBrouillonAdulte()
    afficheCreer()
    await screen.findByRole('heading', { name: 'Ton personnage' })

    fireEvent.change(champNomDuJoueur(), { target: { value: `  ${NOM_JOUEUR_FICTIF}  ` } })
    creerLaFiche()

    const fiche = await laFicheEnregistree()
    expect(fiche.nomDuJoueur).toBe(NOM_JOUEUR_FICTIF)
    expect(
      Object.prototype.hasOwnProperty.call(fiche.creation as object, 'nomDuJoueur'),
      'une seconde copie sous `creation` survivrait à l’effacement du nom.',
    ).toBe(false)
  })

  it('le champ est optionnel : il ne barre JAMAIS la route', async () => {
    await semerBrouillonAdulte()
    afficheCreer()
    await screen.findByRole('heading', { name: 'Ton personnage' })
    // Vide, « Continuer » reste actif : rien n'exige ce nom.
    expect((screen.getByRole('button', { name: /^Continuer$/ }) as HTMLButtonElement).disabled).toBe(
      false,
    )
  })

  it('la saisie ne peut pas dépasser la garde de longueur', async () => {
    await semerBrouillonAdulte()
    afficheCreer()
    await screen.findByRole('heading', { name: 'Ton personnage' })
    // Première garde du débordement de la case A4 (la seconde est l'ellipse CSS).
    expect(champNomDuJoueur().maxLength).toBe(40)
  })
})

describe('D25 · G3 — wizard ≤11', () => {
  it('la saisie, espaces autour compris, s’enregistre TRIMÉE', async () => {
    await semerBrouillonEnfant()
    afficheCreer()
    await screen.findByRole('heading', { name: 'Le nom de ton personnage' })

    fireEvent.change(champNomDuJoueur(), {
      target: { value: `  ${AUTRE_NOM_JOUEUR_FICTIF}  ` },
    })
    creerLaFiche()

    expect((await laFicheEnregistree()).nomDuJoueur).toBe(AUTRE_NOM_JOUEUR_FICTIF)
  })

  it('champ laissé vide → la CLÉ est absente, pas une chaîne vide', async () => {
    await semerBrouillonEnfant()
    afficheCreer()
    await screen.findByRole('heading', { name: 'Le nom de ton personnage' })

    expect(champNomDuJoueur().value, '⛔ jamais pré-rempli').toBe('')
    creerLaFiche()

    const fiche = await laFicheEnregistree()
    expect(fiche.nomDuJoueur).toBeUndefined()
    expect(Object.prototype.hasOwnProperty.call(fiche, 'nomDuJoueur')).toBe(false)
  })

  it('le nom du PERSONNAGE et celui du joueur ne se confondent pas', async () => {
    await semerBrouillonEnfant()
    afficheCreer()
    await screen.findByRole('heading', { name: 'Le nom de ton personnage' })

    fireEvent.change(champNomDuJoueur(), { target: { value: NOM_JOUEUR_FICTIF } })
    creerLaFiche()

    const fiche = await laFicheEnregistree()
    expect(fiche.nomPerso).toBe('Brume')
    expect(fiche.nomDuJoueur).toBe(NOM_JOUEUR_FICTIF)
    // Et il ne s'est PAS rangé sous les choix de la planche enfant.
    expect(fiche.creation?.enfant?.nom).toBe('Brume')
    // ⚠️ Un seul domicile ici aussi (écart rapporté).
    expect(Object.prototype.hasOwnProperty.call(fiche.creation as object, 'nomDuJoueur')).toBe(
      false,
    )
  })
})
