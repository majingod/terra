/**
 * D16 ⑤ — les achats « +1 Capacité de niveau N » (XP d'héritage).
 *
 * Plus aucun concept « d'office » : le bassin d'un achat, c'est TOUTES les
 * capacités de la classe de ce niveau, moins tout ce qui est déjà pris —
 * choix de niveaux ET autres achats confondus. Et aucun plancher de niveau
 * du personnage : un perso niveau 1 peut acheter une capacité de niveau 2.
 *
 * D5 : le libellé des achats, leur coût et les capacités témoins sont lus de
 * rules.json ; rien n'est recopié ici.
 */
import { describe, expect, it } from 'vitest'
import { branchesDe, classesAvecBranches } from '../../rules/branches'
import { capacitesDeClasse } from '../../rules/capacites'
import { effetAchat, listeAchats } from '../../rules/heritage'
import { niveauMin } from '../../rules/niveau'
import { bassinAchat, idsDejaPris } from '../capacites'
import { problemesDestin } from '../validation'
import type { FicheCreation } from '../types'

const CLASSE = classesAvecBranches()[0].classe_id
const VOIES = branchesDe(CLASSE)
const BAS = niveauMin()

/** Les achats de capacité que le fichier propose, par niveau acheté. */
const ACHATS_CAPACITE = listeAchats().flatMap((achat) => {
  const effet = effetAchat(achat.achat)
  return effet.type === 'capacite'
    ? [{ libelle: achat.achat, niveau: effet.niveau, coutXp: achat.cout_xp }]
    : []
})

describe('D16 ⑤ — bassin des achats de capacité', () => {
  it('témoin : le fichier propose bien des achats « +1 Capacité de niveau N »', () => {
    expect(ACHATS_CAPACITE.length).toBeGreaterThan(0)
  })

  it('un perso au niveau minimum peut acheter une capacité d’un niveau SUPÉRIEUR', () => {
    const auDessus = ACHATS_CAPACITE.filter((a) => a.niveau > BAS)
    expect(auDessus.length, 'un achat au-dessus du niveau min existe').toBeGreaterThan(0)
    for (const achat of auDessus) {
      const fiche: FicheCreation = { classe: CLASSE, niveau: BAS }
      const bassin = bassinAchat(fiche, achat.niveau)
      expect(bassin.length, achat.libelle).toBeGreaterThan(0)
      expect(bassin.every((c) => c.niveau === achat.niveau)).toBe(true)
      // Et la validation l'accepte : aucun plancher de niveau du personnage.
      const avecAchat: FicheCreation = {
        ...fiche,
        xpPerm: achat.coutXp, // l'XP du joueur paie l'achat : le budget tient.
        achats: { [achat.libelle]: 1 },
        capChoix: { [String(achat.niveau)]: [bassin[0].id] },
      }
      expect(problemesDestin(avecAchat), achat.libelle).toEqual([])
    }
  })

  it('le bassin exclut ce qui est déjà pris — choix de niveaux INCLUS', () => {
    const niveauAchat = ACHATS_CAPACITE[0].niveau
    const complet = bassinAchat({ classe: CLASSE, niveau: BAS }, niveauAchat)
    const prise = complet[0]
    const fiche: FicheCreation = {
      classe: CLASSE,
      niveau: BAS,
      capNiveaux: { [String(prise.niveau)]: prise.id },
    }
    const apres = bassinAchat(fiche, niveauAchat)
    expect(apres.map((c) => c.id)).not.toContain(prise.id)
    expect(apres).toHaveLength(complet.length - 1)
  })

  it('jumelle : un perso qui a pris 1 capacité de niveau 1 voit exactement 2 entrées', () => {
    // Le bassin « +1 Capacité de niveau 1 » : une capacité de niveau 1 par
    // voie (3), moins celle déjà prise au niveau 1 → 2.
    const parVoie = VOIES.map((v) => v.capacites.filter((c) => c.niveau === 1).length)
    expect(parVoie).toEqual(VOIES.map(() => 1))
    const prise = capacitesDeClasse(CLASSE).find((c) => c.niveau === 1)!
    const fiche: FicheCreation = { classe: CLASSE, niveau: BAS, capNiveaux: { '1': prise.id } }
    expect(bassinAchat(fiche, 1)).toHaveLength(2)
  })

  it('un achat déjà choisi reste dans SON bassin (il s’y montre coché)', () => {
    const niveauAchat = ACHATS_CAPACITE[0].niveau
    const complet = bassinAchat({ classe: CLASSE, niveau: BAS }, niveauAchat)
    const fiche: FicheCreation = {
      classe: CLASSE,
      niveau: BAS,
      capChoix: { [String(niveauAchat)]: [complet[0].id] },
    }
    expect(bassinAchat(fiche, niveauAchat).map((c) => c.id)).toContain(complet[0].id)
  })

  it('l’anti-doublon est GLOBAL : les deux sources comptent ensemble', () => {
    const capacites = capacitesDeClasse(CLASSE)
    const fiche: FicheCreation = {
      classe: CLASSE,
      niveau: BAS,
      capNiveaux: { '1': capacites.find((c) => c.niveau === 1)!.id },
      capChoix: { '2': [capacites.find((c) => c.niveau === 2)!.id] },
    }
    expect(idsDejaPris(fiche)).toHaveLength(2)
    expect(new Set(idsDejaPris(fiche)).size).toBe(2)
  })

  it('une capacité hors bassin est REFUSÉE par la validation du destin', () => {
    const niveauAchat = ACHATS_CAPACITE[0].niveau
    const libelle = ACHATS_CAPACITE[0].libelle
    const complet = bassinAchat({ classe: CLASSE, niveau: BAS }, niveauAchat)
    const fiche: FicheCreation = {
      classe: CLASSE,
      niveau: BAS,
      achats: { [libelle]: 1 },
      // Déjà prise au niveau : elle sort du bassin de l'achat.
      capNiveaux: { [String(complet[0].niveau)]: complet[0].id },
      capChoix: { [String(niveauAchat)]: [complet[0].id] },
    }
    expect(problemesDestin(fiche).some((p) => p.includes('hors bassin'))).toBe(true)
  })
})
