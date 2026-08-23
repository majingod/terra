/**
 * t012 — les gates de la feuille imprimée, pour LES HUIT CLASSES.
 *
 * La géométrie ne se teste pas en jsdom : elle se teste à l'impression, et
 * c'est l'architecte du projet qui la valide sur les 8 aperçus
 * (`npm run apercus:feuilles`). Ce fichier garde ce qui SE teste sans
 * disposition : le contenu de la feuille, ses comptes, et ses interdits.
 *
 * Chaque assertion chiffrée ci-dessous rougit trivialement sur la version
 * d'avant : le composant n'existait pas.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { branchesDe, capacitesDeBase } from '../../../rules/branches'
import { listeAchats } from '../../../rules/heritage'
import { languesAcquises, listeLangues } from '../../../rules/langues'
import { getRules } from '../../../rules/load'
import { classesSquelette } from '../../../rules/stats'
import { listeDons } from '../../../rules/talents'
import { capacitesDeLaFiche } from '../../../wizard/capacites'
import { donsPris } from '../../../wizard/troc'
import type { FicheCreation } from '../../../wizard/types'
import FeuilleImpression from '../FeuilleImpression'
import { ficheDeCreation, ficheExemple } from '../exemples'

const CLASSES = classesSquelette()
const REGLES = getRules()

/**
 * Ce que montrent les feuilles PAPIER : une classe ouverte à toutes les
 * factions imprime les 6 races, une classe de la Légion 4 rangées, une classe
 * du Sanctum 3. Les chiffres sont ceux de la recette du lot, pas une copie de
 * ce que le composant calcule — la jumelle du test les rattache au corpus.
 */
const RANGEES_DE_RACE: Record<string, number> = { toute: 6, legion: 4, sanctum: 3 }

function rendu(fiche: FicheCreation): string {
  return renderToStaticMarkup(<FeuilleImpression fiche={fiche} />)
}

/** Le texte que le joueur LIT : balises retirées, entités de React décodées. */
function texteBrut(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
}

/** Les valeurs d'un attribut `data-…`, doublons retirés. */
function marques(html: string, attribut: string): string[] {
  return [...new Set([...html.matchAll(new RegExp(`${attribut}="([^"]*)"`, 'g'))].map((m) => m[1]))]
}

/**
 * L'en-tête attendu d'une voie. Écrit ici À PART du composant, en repartant
 * de la règle de grammaire elle-même : « de l’ » devant une voyelle, « du »
 * devant une consonne. Si le composant cesse d'élider, ou élide de travers,
 * les deux ne concordent plus.
 */
function enTeteAttendu(nom: string): string {
  const sansAccent = nom.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return /^[aeiouy]/i.test(sansAccent) ? `Choix de l’${nom}` : `Choix du ${nom}`
}

/** Le nombre d'éléments qui portent la classe « acquis » — le Surligné. */
function compteAcquis(html: string): number {
  return [...html.matchAll(/class="([^"]*)"/g)].filter((m) =>
    m[1].split(/\s+/).includes('acquis'),
  ).length
}

/** Les acquis QUE PORTE la fiche, comptés par les fonctions du métier. */
function acquisDeLaFiche(fiche: FicheCreation): number {
  const langues = new Set([
    ...languesAcquises(fiche.race, fiche.classe),
    ...(fiche.langChoix ?? []),
  ])
  return (
    (fiche.race ? 1 : 0) +
    capacitesDeBase(fiche.classe ?? '').length +
    capacitesDeLaFiche(fiche).length +
    Object.values(donsPris(fiche)).reduce((somme, n) => somme + n, 0) +
    langues.size +
    (fiche.comps ?? []).length +
    Object.values(fiche.achats ?? {}).filter((n) => n > 0).length
  )
}

describe('t012 — la feuille imprimée, pour les 8 classes', () => {
  it('dénominateur : le corpus porte bien 8 classes', () => {
    expect(CLASSES).toHaveLength(8)
    expect(REGLES.branches_de_classes.classes).toHaveLength(8)
  })

  describe.each(CLASSES.map((c) => [c.id, c] as const))('%s', (classeId, classe) => {
    const fiche = ficheExemple(classeId)
    const html = rendu(fiche)
    const texte = texteBrut(html)

    it('① les 3 en-têtes de voies et les 15 capacités sont là', () => {
      const voies = branchesDe(classeId)
      expect(voies).toHaveLength(3)
      expect(marques(html, 'data-voie')).toHaveLength(3)
      for (const voie of voies) expect(texte).toContain(enTeteAttendu(voie.nom))
      // Aucun en-tête ne colle « du » devant une voyelle, ni « de l’ » devant
      // une consonne : la règle vaut dans les deux sens.
      expect(texte).not.toMatch(/Choix du [AEIOUYÀÂÉÈÊÎÔÛÙ]/)
      expect(texte).not.toMatch(/Choix de l’[^AEIOUYÀÂÉÈÊÎÔÛÙ]/)

      const capacites = voies.flatMap((v) => v.capacites)
      expect(capacites).toHaveLength(15)
      expect(marques(html, 'data-capacite')).toHaveLength(15)
      for (const capacite of capacites) expect(texte).toContain(capacite.nom)
    })

    it('② capacités de base, focus, troc, code et ressource : présents SI le champ existe', () => {
      const base = capacitesDeBase(classeId)
      expect(marques(html, 'data-base')).toHaveLength(base.length)
      for (const capacite of base) expect(texte).toContain(capacite.nom)

      expect(html.includes('data-focus')).toBe(Boolean(classe.focus_requis))
      expect(html.includes('data-troc')).toBe(Boolean(classe.echange))
      expect(html.includes('data-code')).toBe(Boolean(classe.code))
      expect(html.includes('data-ressource=')).toBe(Boolean(classe.ressource_speciale))
    })

    it('③ la table Race compte 6, 4 ou 3 rangées selon la faction', () => {
      expect(marques(html, 'data-race')).toHaveLength(RANGEES_DE_RACE[classe.faction])
      // Jumelle : le corpus justifie encore ces trois chiffres.
      const duCorpus = REGLES.races.liste.filter(
        (r) => classe.faction === 'toute' || r.faction === classe.faction || r.faction === 'toute',
      )
      expect(duCorpus).toHaveLength(RANGEES_DE_RACE[classe.faction])
      expect(marques(html, 'data-race')).toEqual(duCorpus.map((r) => r.id))
    })

    it('④ 13 dons, 8 langues, 8 compétences, 11 achats d’héritage', () => {
      expect(marques(html, 'data-don')).toHaveLength(13)
      expect(marques(html, 'data-langue')).toHaveLength(8)
      expect(marques(html, 'data-competence')).toHaveLength(8)
      expect(marques(html, 'data-achat')).toHaveLength(11)
      // Jumelles : les comptes sont ceux du corpus, pas des nombres écrits ici.
      expect(listeDons()).toHaveLength(13)
      expect(listeLangues()).toHaveLength(8)
      expect(REGLES.competences.simples.length + REGLES.competences.artisanats.liste.length).toBe(8)
      expect(listeAchats()).toHaveLength(11)
    })

    it('⑤ le Surligné compte exactement les acquis de la fiche', () => {
      expect(compteAcquis(html)).toBe(acquisDeLaFiche(fiche))
    })

    it('⑤ jumelle : une fiche qui sort de la création n’a que ses acquis de création', () => {
      const neuve = ficheDeCreation(classeId)
      expect(neuve.capNiveaux).toBeUndefined()
      expect(neuve.dons).toBeUndefined()
      expect(neuve.comps).toBeUndefined()
      const htmlNeuf = rendu(neuve)
      expect(compteAcquis(htmlNeuf)).toBe(acquisDeLaFiche(neuve))
      expect(compteAcquis(htmlNeuf)).toBeLessThan(compteAcquis(html))
    })

    it('⑥ aucun bouton dans la vue imprimée', () => {
      expect(html).not.toContain('<button')
    })

    it('⑦ le mot du métier de la mine n’apparaît que comme nom de compétence', () => {
      // Reconstruit : le marqueur d'époque n'existe littéralement nulle part
      // dans src/ (T11 / D10), pas même dans un test.
      const metier = ['m', 'i', 'n', 'e', 'u', 'r'].join('')
      const occurrences = texte.match(new RegExp(metier, 'gi')) ?? []
      expect(occurrences).toHaveLength(1)
      const competence = REGLES.competences.simples.find((c) => c.id === metier)
      expect(competence).toBeDefined()
      expect(occurrences[0]!.toLowerCase()).toBe(competence!.nom.toLowerCase())
    })
  })

  it('les en-têtes de voies élident : la règle est exercée dans les deux sens', () => {
    const voies = CLASSES.flatMap((c) => branchesDe(c.id))
    const parVoyelle = voies.filter((v) => enTeteAttendu(v.nom).startsWith('Choix de l’'))
    const parConsonne = voies.filter((v) => enTeteAttendu(v.nom).startsWith('Choix du '))
    // Dénominateur : 24 voies, et le corpus en porte des deux sortes — sans
    // ça, la gate ① passerait sans jamais éprouver l'élision.
    expect(parVoyelle.length + parConsonne.length).toBe(voies.length)
    expect(parVoyelle.length).toBeGreaterThan(0)
    expect(parConsonne.length).toBeGreaterThan(0)

    // Témoins tirés du corpus au moment du test, rendus pour de vrai.
    const tousLesRendus = CLASSES.map((c) => texteBrut(rendu(ficheExemple(c.id)))).join(' ')
    for (const voie of parVoyelle) expect(tousLesRendus).toContain(`Choix de l’${voie.nom}`)
    for (const voie of parConsonne) expect(tousLesRendus).toContain(`Choix du ${voie.nom}`)
  })

  it('⑧ D14 : aucun texte de règle n’est rendu hors de la couche d’affichage', () => {
    const ici = dirname(fileURLToPath(import.meta.url))
    const source = readFileSync(join(ici, '..', 'FeuilleImpression.tsx'), 'utf8')
    // Les mêmes champs que la gate D13 : les rendre en direct court-circuite
    // la correction `affichage` (D14). Tout doit passer par <Texte source=…>.
    const champs = ['verbatim', 'base', 'avance', 'intro', 'echange', 'code', 'focus_requis']
    const sansProp = source.replace(/source=\{\{[^}]*\}\}/g, '').replace(/source=\{[^}]*\}/g, '')
    expect(sansProp.match(new RegExp(`\\.(${champs.join('|')})\\s*\\}`, 'g'))).toBeNull()
    expect(source.split('<Texte').length - 1).toBeGreaterThanOrEqual(5)
  })
})
