/**
 * D18 ④ — l'anti-doublon, dans les deux sens.
 *
 * ④ Un don non cumulable pris — à l'étape des dons OU dans un emplacement de
 *   capacité troqué — disparaît de tous les bassins ; un don `cumulable`
 *   reste offert. Jumelles dans les deux sens.
 * ② L'anti-doublon D16 des capacités est GLOBAL : une capacité prise à la
 *   place d'un don sort du bassin des niveaux et des achats XP, et
 *   réciproquement.
 *
 * D5 : ni classe, ni don, ni capacité n'est nommé ici — tous les témoins sont
 * retrouvés dans rules.json par critère (le champ `troc`, le champ
 * `cumulable`, l'arbre de la classe).
 */
import { describe, expect, it } from 'vitest'
import { capacitesDeClasse } from '../../rules/capacites'
import {
  coutDunDonTroque,
  depenseXp,
  effetAchat,
  listeAchats,
  xpRestant,
} from '../../rules/heritage'
import { getRules } from '../../rules/load'
import { gainsMontee } from '../../rules/montee'
import { niveauMax, niveauMin, niveauxPossibles, tableEvolution } from '../../rules/niveau'
import { listeDons } from '../../rules/talents'
import {
  TROC_CAPACITE_VERS_DON,
  TROC_DON_VERS_CAPACITE,
  echelonsDeDon,
} from '../../rules/troc'
import { bassinAchat, idsDejaPris, optionsDuNiveau, prisesAilleurs } from '../capacites'
import { donsDeLaFiche, donsPris, optionsDeTrocCapacite, optionsDeTrocDon } from '../troc'
import { miseAJourMontee } from '../montee'
import { problemesCapacites, problemesDestin, problemesTalents } from '../validation'
import type { FicheCreation } from '../types'
import { personnageDeLaFiche } from '../../pages/montee/__tests__/aide-montee'
import { ficheComplete } from './aide-fiche-complete'

const CLASSES = getRules().classes_squelette.liste
const GUERRIER = CLASSES.find((c) => c.troc === TROC_CAPACITE_VERS_DON)!.id
const MAGE = CLASSES.find((c) => c.troc === TROC_DON_VERS_CAPACITE)!.id

const CUMULABLE = listeDons().find((d) => d.cumulable)!
const SIMPLE = listeDons().find((d) => !d.cumulable)!

/** Une capacité de la classe, de niveau exactement `n`. */
function capaciteDeNiveau(classe: string, n: number) {
  return capacitesDeClasse(classe).find((c) => c.niveau === n)!
}

/** Un emplacement de capacité par niveau, panachés sur les voies. */
function capNiveaux(classe: string, niveau: number): Record<string, string> {
  const arbre = capacitesDeClasse(classe)
  const choix: Record<string, string> = {}
  niveauxPossibles()
    .filter((n) => n <= niveau)
    .forEach((n) => {
      const libre = arbre.find(
        (c) => c.niveau === n && !Object.values(choix).includes(c.id),
      )!
      choix[String(n)] = libre.id
    })
  return choix
}

describe('D18 ④ — un don non cumulable ne se prend qu’une fois, quelle que soit la porte', () => {
  it('témoin : le catalogue porte bien un don cumulable et un don qui ne l’est pas', () => {
    expect(CUMULABLE).toBeTruthy()
    expect(SIMPLE).toBeTruthy()
  })

  it('pris à l’étape des dons, il est éteint dans l’emplacement de capacité', () => {
    const fiche: FicheCreation = { classe: GUERRIER, niveau: 2, dons: { [SIMPLE.id]: 1 } }
    const options = optionsDeTrocDon(fiche, { niveau: 2 })
    const vu = options.find((o) => o.don.id === SIMPLE.id)!
    expect(vu.indisponible).toBe(true)
    expect(vu.raison, 'la raison doit être affichée').toBeTruthy()
  })

  it('jumelle : pris dans un emplacement de capacité, il est compté par refusDons', () => {
    const fiche: FicheCreation = {
      classe: GUERRIER,
      niveau: 2,
      donNiveaux: { 1: SIMPLE.id },
      dons: { [SIMPLE.id]: 1 },
    }
    expect(donsPris(fiche)[SIMPLE.id]).toBe(2)
    expect(problemesTalents(fiche).some((p) => p.includes(SIMPLE.nom))).toBe(true)
  })

  it('jumelle : pris dans DEUX emplacements de capacité, il est refusé aussi', () => {
    const fiche: FicheCreation = {
      classe: GUERRIER,
      niveau: 2,
      donNiveaux: { 1: SIMPLE.id, 2: SIMPLE.id },
    }
    const options = optionsDeTrocDon(fiche, { niveau: 2 })
    expect(options.find((o) => o.don.id === SIMPLE.id)!.indisponible).toBe(true)
    expect(problemesTalents(fiche).some((p) => p.includes(SIMPLE.nom))).toBe(true)
  })

  it('jumelle positive : un don `cumulable` reste offert dans les deux sens', () => {
    const fiche: FicheCreation = {
      classe: GUERRIER,
      niveau: 2,
      dons: { [CUMULABLE.id]: 1 },
      donNiveaux: { 1: CUMULABLE.id },
    }
    const options = optionsDeTrocDon(fiche, { niveau: 2 })
    expect(options.find((o) => o.don.id === CUMULABLE.id)!.indisponible).toBe(false)
    expect(donsPris(fiche)[CUMULABLE.id]).toBe(2)
    // refusDons ne s'y oppose pas : seul le compte de droits peut le faire.
    expect(problemesTalents(fiche).some((p) => p.includes(CUMULABLE.nom))).toBe(false)
  })

  it('l’emplacement laisse voir SON propre don — il s’y montre choisi, pas éteint', () => {
    const fiche: FicheCreation = { classe: GUERRIER, niveau: 2, donNiveaux: { 2: SIMPLE.id } }
    const vu = optionsDeTrocDon(fiche, { niveau: 2 }).find((o) => o.don.id === SIMPLE.id)!
    expect(vu.choisi).toBe(true)
    expect(vu.indisponible).toBe(false)
  })
})

describe('D18 ② — l’anti-doublon D16 des capacités traverse le troc', () => {
  const echelon = echelonsDeDon(niveauMax()).slice(-1)[0]

  it('une capacité prise à la place d’un don sort du bassin des niveaux', () => {
    const capacite = capaciteDeNiveau(MAGE, 1)
    const fiche: FicheCreation = {
      classe: MAGE,
      niveau: niveauMax(),
      capDons: { [String(echelon)]: capacite.id },
    }
    expect(idsDejaPris(fiche)).toContain(capacite.id)
    const option = optionsDuNiveau(fiche, niveauMax()).find((o) => o.capacite.id === capacite.id)!
    expect(option.dejaPrise).toBe(true)
  })

  it('…et du bassin des achats XP', () => {
    const capacite = capaciteDeNiveau(MAGE, 1)
    const fiche: FicheCreation = {
      classe: MAGE,
      niveau: niveauMax(),
      capDons: { [String(echelon)]: capacite.id },
    }
    expect(bassinAchat(fiche, 1).map((c) => c.id)).not.toContain(capacite.id)
  })

  it('jumelle : une capacité prise à un niveau est éteinte dans le troc du don', () => {
    const capacite = capaciteDeNiveau(MAGE, 1)
    const fiche: FicheCreation = {
      classe: MAGE,
      niveau: niveauMax(),
      capNiveaux: { 1: capacite.id },
    }
    const options = optionsDeTrocCapacite(
      fiche,
      echelon,
      prisesAilleurs(fiche, { echelonDon: echelon }),
    )
    expect(options.find((o) => o.capacite.id === capacite.id)!.dejaPrise).toBe(true)
  })

  it('une capacité au-dessus du niveau du don est éteinte, avec la raison', () => {
    const bas = echelonsDeDon(niveauMax())[0]
    const fiche: FicheCreation = { classe: MAGE, niveau: niveauMax() }
    const options = optionsDeTrocCapacite(fiche, bas)
    const trop = options.find((o) => o.capacite.niveau > bas)!
    expect(trop.dejaPrise).toBe(true)
    expect(trop.raison).toContain(String(bas))
    // …et elle reste VISIBLE : rien n'est escamoté.
    expect(options.some((o) => o.capacite.niveau > bas)).toBe(true)
  })

  it('le validateur refuse une capacité troquée trop haute, et accepte la bonne', () => {
    const niveau = niveauMax()
    const bas = echelonsDeDon(niveau)[0]
    const trop = capacitesDeClasse(MAGE).find((c) => c.niveau > bas)!
    const bonne = capaciteDeNiveau(MAGE, bas)
    const socle = ficheComplete(MAGE, niveau, capNiveaux(MAGE, niveau))
    const mauvaise = problemesCapacites({ ...socle, capDons: { [String(bas)]: trop.id } })
    expect(mauvaise.some((p) => p.includes(trop.nom))).toBe(true)
    const juste = problemesCapacites({
      ...socle,
      capNiveaux: Object.fromEntries(
        Object.entries(socle.capNiveaux ?? {}).filter(([, id]) => id !== bonne.id),
      ),
      capDons: { [String(bas)]: bonne.id },
    })
    expect(juste.some((p) => p.includes(bonne.nom))).toBe(false)
  })
})

describe('D18 ③ — jumelles négatives sur les validateurs', () => {
  const SANS = CLASSES.find((c) => c.troc === undefined)!.id

  it('une classe sans troc qui porte un don dans un emplacement est refusée', () => {
    const fiche: FicheCreation = { classe: SANS, niveau: 2, donNiveaux: { 1: SIMPLE.id } }
    expect(problemesCapacites(fiche).some((p) => p.includes('troque'))).toBe(true)
  })

  it('une classe sans troc qui porte une capacité à la place d’un don est refusée', () => {
    const capacite = capaciteDeNiveau(SANS, 1)
    const fiche: FicheCreation = { classe: SANS, niveau: 1, capDons: { 1: capacite.id } }
    expect(problemesCapacites(fiche).some((p) => p.includes('troque'))).toBe(true)
  })
})

describe('D18 ④ — la fiche range un don troqué comme un don', () => {
  it('il apparaît dans les dons de la fiche, sans distinction', () => {
    const fiche: FicheCreation = { classe: GUERRIER, niveau: 2, donNiveaux: { 1: SIMPLE.id } }
    expect(donsDeLaFiche(fiche).map((d) => d.don.id)).toEqual([SIMPLE.id])
  })

  it('un cumulable pris des deux côtés se compte ×2', () => {
    const fiche: FicheCreation = {
      classe: GUERRIER,
      niveau: 2,
      dons: { [CUMULABLE.id]: 1 },
      donNiveaux: { 1: CUMULABLE.id },
    }
    expect(donsDeLaFiche(fiche)).toEqual([{ don: CUMULABLE, n: 2 }])
  })
})


describe('D18 ③③ — l’achat XP de capacité peut devenir un don (guerrier)', () => {
  /** Le moins cher des achats « +1 Capacité de niveau N » du catalogue. */
  const ACHAT = listeAchats()
    .filter((a) => effetAchat(a.achat).type === 'capacite')
    .sort((a, b) => a.cout_xp - b.cout_xp)[0]
  const NIVEAU_ACHAT = (effetAchat(ACHAT.achat) as { type: 'capacite'; niveau: number }).niveau

  /** Un achat plus cher que le troc, s'il en existe un au catalogue. */
  const PLUS_CHER = listeAchats()
    .filter((a) => effetAchat(a.achat).type === 'capacite' && a.cout_xp > coutDunDonTroque())
    .sort((a, b) => a.cout_xp - b.cout_xp)[0]

  function ficheAchat(troque: boolean): FicheCreation {
    const niveau = niveauMax()
    const socle = ficheComplete(GUERRIER, niveau, capNiveaux(GUERRIER, niveau))
    const libre = capacitesDeClasse(GUERRIER).find(
      (c) => c.niveau === NIVEAU_ACHAT && !Object.values(socle.capNiveaux ?? {}).includes(c.id),
    )!
    return {
      ...socle,
      xpPerm: 99,
      achats: { [ACHAT.achat]: 1 },
      capChoix: troque ? {} : { [String(NIVEAU_ACHAT)]: [libre.id] },
      donChoix: troque ? { [String(NIVEAU_ACHAT)]: [SIMPLE.id] } : {},
    }
  }

  it('un don remplit l’emplacement acheté : l’étape Destin est satisfaite', () => {
    expect(problemesDestin(ficheAchat(true))).toEqual([])
    expect(problemesDestin(ficheAchat(false))).toEqual([])
  })

  it('l’emplacement acheté n’accepte pas les deux à la fois', () => {
    const fiche = ficheAchat(true)
    const enTrop = {
      ...fiche,
      capChoix: { [String(NIVEAU_ACHAT)]: [capaciteDeNiveau(GUERRIER, NIVEAU_ACHAT).id] },
    }
    expect(problemesDestin(enTrop).some((p) => p.includes('2/1'))).toBe(true)
  })

  it('le don troqué se paie au prix du troc, pas à celui de sa ligne', () => {
    const troque = { [String(NIVEAU_ACHAT)]: [SIMPLE.id] }
    expect(depenseXp({ [ACHAT.achat]: 1 }, troque)).toBe(coutDunDonTroque())
    if (PLUS_CHER) {
      const niveau = (effetAchat(PLUS_CHER.achat) as { niveau: number }).niveau
      expect(depenseXp({ [PLUS_CHER.achat]: 1 })).toBe(PLUS_CHER.cout_xp)
      expect(depenseXp({ [PLUS_CHER.achat]: 1 }, { [String(niveau)]: [SIMPLE.id] })).toBe(
        coutDunDonTroque(),
      )
    }
  })

  it('le budget XP suit : le reste tient compte du prix troqué', () => {
    const fiche: FicheCreation = {
      xpPerm: coutDunDonTroque(),
      achats: { [ACHAT.achat]: 1 },
      donChoix: { [String(NIVEAU_ACHAT)]: [SIMPLE.id] },
    }
    expect(xpRestant(fiche)).toBe(0)
  })

  it('jumelle négative : une classe sans troc ne peut pas troquer son achat', () => {
    const sans = CLASSES.find((c) => c.troc === undefined)!.id
    const fiche: FicheCreation = {
      classe: sans,
      niveau: niveauMax(),
      xpPerm: 99,
      achats: { [ACHAT.achat]: 1 },
      donChoix: { [String(NIVEAU_ACHAT)]: [SIMPLE.id] },
    }
    expect(problemesDestin(fiche).some((p) => p.includes('troque'))).toBe(true)
  })
})

describe('D18 ① — le troc du guerrier vaut aussi à la montée', () => {
  /** L'échelon de montée qui donne un don (le plus bas au-dessus du minimum). */
  const ATTEINT = tableEvolution()
    .filter((ligne) => ligne.niv > niveauMin() && ligne.dons > 0)
    .map((ligne) => ligne.niv)[0]
  const DEPART = ATTEINT - 1

  function guerrierQuiMonte() {
    const fiche = ficheComplete(GUERRIER, DEPART, capNiveaux(GUERRIER, DEPART))
    return { ...personnageDeLaFiche(fiche), id: 1 }
  }

  it('un don peut remplir l’emplacement de capacité de l’échelon atteint', () => {
    const perso = guerrierQuiMonte()
    const donDeLEchelon = listeDons().find(
      (d) => (perso.creation?.dons?.[d.id] ?? 0) === 0 || d.cumulable,
    )!
    const maj = miseAJourMontee(
      perso,
      ATTEINT,
      { donTroque: SIMPLE.id, don: donDeLEchelon.id },
      1,
    )
    // La capacité de l'échelon n'en est pas une : c'est un don.
    expect(maj.capacites).toEqual(perso.capacites)
    expect(maj.creation?.donNiveaux?.[String(ATTEINT)]).toBe(SIMPLE.id)
    expect(maj.dons).toContain(SIMPLE.id)
    expect(gainsMontee(ATTEINT).dons).toBeGreaterThan(0)
  })

  it('poser une capacité ET un don dans le même emplacement est refusé', () => {
    const perso = guerrierQuiMonte()
    const capacite = capaciteDeNiveau(GUERRIER, 1)
    expect(() =>
      miseAJourMontee(
        perso,
        ATTEINT,
        { capacite: capacite.id, donTroque: SIMPLE.id, don: CUMULABLE.id },
        1,
      ),
    ).toThrow()
  })
})
