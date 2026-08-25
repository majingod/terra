/**
 * GU4 — les ancres de présentation tranchent sans perte.
 *
 * Le lot corpus 1.3.1 a posé, sur trois sections du chapitre 1, des ancres
 * qui disent où couper le verbatim pour l'afficher en items. Ce test applique
 * à `decoupeParAncres` les MÊMES règles que le script du lot : toutes les
 * ancres trouvées, dans l'ordre, préfixe retiré quand il est annoncé, et
 * découpe sans perte.
 *
 * ⛔ Aucune ancre, aucun nom d'item n'est écrit ici : tout vient du corpus.
 */
import { describe, expect, it } from 'vitest'
import { getRules } from '../../rules/load'
import type { SectionDeRegle } from '../../rules/load'
import { auxBlancsPres, decoupeParAncres } from '../texte'

const AVEC_PRESENTATION: SectionDeRegle[] = getRules().regles_de_base.sections.filter(
  (section) => section.presentation !== undefined,
)

describe('GU4 — découpe par ancres', () => {
  it('dénominateur : trois sections portent une présentation en items', () => {
    expect(AVEC_PRESENTATION).toHaveLength(3)
    for (const section of AVEC_PRESENTATION) {
      expect(section.presentation!.mode).toBe('items')
      expect(section.presentation!.ancres.length).toBeGreaterThan(0)
    }
  })

  it('encyclopedie_ancres_sans_perte', () => {
    for (const section of AVEC_PRESENTATION) {
      const verbatim = section.verbatim!
      const decoupe = decoupeParAncres(verbatim, section.presentation!)
      expect(decoupe, `section ${section.id}`).not.toBeNull()

      // Toutes les ancres, dans l'ordre du verbatim.
      const positions = section.presentation!.ancres.map((a) => verbatim.indexOf(a.debut))
      expect(positions.every((i) => i >= 0), `section ${section.id}`).toBe(true)
      expect([...positions].sort((a, b) => a - b)).toEqual(positions)

      // Un item par ancre, nommé par elle.
      expect(decoupe!.items.map((item) => item.nom)).toEqual(
        section.presentation!.ancres.map((a) => a.nom),
      )

      // Découpe SANS PERTE : intro + (noms si préfixe) + tranches = verbatim.
      const morceaux = [decoupe!.avant]
      for (const item of decoupe!.items) {
        if (section.presentation!.avec_prefixe) morceaux.push(item.nom)
        morceaux.push(item.texte)
      }
      expect(auxBlancsPres(morceaux.filter(Boolean).join(' '))).toBe(auxBlancsPres(verbatim))

      // Sans préfixe, rien ne traîne avant le premier item (règle du lot 1.3.1).
      if (!section.presentation!.avec_prefixe) expect(decoupe!.avant).toBe('')
      // Avec préfixe, le nom a bien été retiré de la tranche.
      if (section.presentation!.avec_prefixe) {
        for (const item of decoupe!.items) {
          expect(item.texte.startsWith(item.nom)).toBe(false)
          expect(item.texte.length).toBeGreaterThan(0)
        }
      }
    }
  })

  it('jumelle : une ancre introuvable rend null, l’écran retombe sur l’aération', () => {
    const section = AVEC_PRESENTATION[0]
    const faussee = {
      ...section.presentation!,
      ancres: [{ nom: section.presentation!.ancres[0].nom, debut: 'ancre-qui-n-existe-pas' }],
    }
    expect(decoupeParAncres(section.verbatim!, faussee)).toBeNull()
  })

  it('jumelle : des ancres désordonnées rendent null', () => {
    const section = AVEC_PRESENTATION.find((s) => s.presentation!.ancres.length > 1)!
    const aLEnvers = {
      ...section.presentation!,
      ancres: [...section.presentation!.ancres].reverse(),
    }
    expect(decoupeParAncres(section.verbatim!, aLEnvers)).toBeNull()
  })
})
