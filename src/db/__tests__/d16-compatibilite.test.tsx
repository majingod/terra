/**
 * D16 ⑨ — compatibilité : le code cesse d'EXIGER la voie, il n'efface rien.
 *
 * Le GN tourne depuis deux ans et les fiches vivent sur l'appareil du joueur,
 * hors réseau, sans sauvegarde serveur. Une fiche d'époque (avec
 * `creation.voie`, avec `sousBranche`) doit donc s'afficher sans planter et
 * un ancien export JSON doit s'importer tel quel.
 *
 * Ni renommage ni effacement : les champs d'époque restent stockés.
 */
// @vitest-environment jsdom
import 'fake-indexeddb/auto'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { branchesDe, classesAvecBranches } from '../../rules/branches'
import { classeSquelette } from '../../rules/stats'
import { importerPersonnageJSON } from '../../utils/exportImport'
import FicheAffichage from '../../pages/creation/FicheAffichage'
import type { FicheCreation } from '../../wizard/types'
import { db, nouvellePersonnageVierge, type Personnage } from '../index'

const CLASSE = classesAvecBranches()[0].classe_id
const VOIE = branchesDe(CLASSE)[0]

/** La fiche que l'ANCIEN wizard écrivait : une voie, aucun choix par niveau. */
const CREATION_EPOQUE: FicheCreation = {
  faction: classeSquelette(CLASSE)!.faction,
  classe: CLASSE,
  voie: VOIE.id,
  niveau: 3,
  nom: "Fiche d'époque",
}

/** Le personnage que l'ancien enregistrement écrivait, `sousBranche` comprise. */
function personnageEpoque(): Omit<Personnage, 'id'> {
  return {
    ...nouvellePersonnageVierge(),
    nomPerso: "Fiche d'époque",
    classe: classeSquelette(CLASSE)!.nom,
    sousBranche: VOIE.nom,
    capacites: VOIE.capacites.filter((c) => c.niveau <= 3).map((c) => c.id),
    niveau: 3,
    creation: CREATION_EPOQUE,
  }
}

afterEach(async () => {
  cleanup()
  await db.personnages.clear()
})

describe('D16 ⑨ — une fiche d’époque s’affiche sans planter', () => {
  it('personnage_avec_creation_voie_s_affiche', () => {
    expect(() => render(<FicheAffichage fiche={CREATION_EPOQUE} />)).not.toThrow()
    expect(screen.getAllByText(CREATION_EPOQUE.nom!).length).toBeGreaterThan(0)
  })

  it('elle ne porte plus de capacité de voie « d’office » — le concept a disparu', () => {
    render(<FicheAffichage fiche={CREATION_EPOQUE} />)
    // Le joueur refera l'étape : rien n'est inventé à sa place, rien ne casse.
    expect(screen.queryByText('Capacités')).toBeNull()
  })

  it('jumelle : la même fiche, ses choix D16 refaits, montre bien ses capacités', () => {
    const refaite: FicheCreation = {
      ...CREATION_EPOQUE,
      capNiveaux: Object.fromEntries(
        VOIE.capacites.filter((c) => c.niveau <= 3).map((c) => [String(c.niveau), c.id]),
      ),
    }
    render(<FicheAffichage fiche={refaite} />)
    expect(screen.getByText('Capacités')).toBeTruthy()
    expect(screen.getAllByText(VOIE.nom).length).toBe(3)
  })
})

describe('D16 ⑨ — un ancien export JSON s’importe, champs d’époque compris', () => {
  it('ancien_export_avec_sousBranche_et_creation_voie_s_importe', async () => {
    const ancien = { ...personnageEpoque(), id: 42 }
    const fichier = new File([JSON.stringify(ancien)], 'ancienne.json', {
      type: 'application/json',
    })
    await importerPersonnageJSON(fichier)
    const importe = (await db.personnages.toArray())[0]
    expect(importe.nomPerso).toBe(ancien.nomPerso)
    // Rien n'est renommé, rien n'est effacé : les champs d'époque survivent.
    expect(importe.sousBranche).toBe(VOIE.nom)
    expect(importe.creation?.voie).toBe(VOIE.id)
  })

  it('jumelle : un export SANS champ d’époque s’importe aussi, sans en fabriquer', async () => {
    const neuf = {
      ...nouvellePersonnageVierge(),
      nomPerso: 'Fiche neuve',
      creation: { classe: CLASSE, niveau: 1, capNiveaux: { '1': VOIE.capacites[0].id } },
    }
    expect('sousBranche' in neuf).toBe(false)
    const fichier = new File([JSON.stringify(neuf)], 'neuve.json', { type: 'application/json' })
    await importerPersonnageJSON(fichier)
    const importe = (await db.personnages.toArray())[0]
    expect(importe.sousBranche).toBeUndefined()
    expect(importe.creation?.capNiveaux).toEqual({ '1': VOIE.capacites[0].id })
  })
})

describe('D16 ⑨ — un brouillon d’époque rouvre sans planter', () => {
  it('brouillon_ancien_wizard_se_relit', async () => {
    await db.brouillons.put({
      id: 1,
      etape: 4,
      donnees: { fiche: CREATION_EPOQUE },
      updatedAt: 1,
    })
    const brouillon = await db.brouillons.get(1)
    expect(brouillon?.donnees.fiche?.voie).toBe(VOIE.id)
    expect(brouillon?.donnees.fiche?.capNiveaux).toBeUndefined()
    // Les champs d'époque s'ignorent : le joueur refait l'étape, rien ne casse.
    expect(() => render(<FicheAffichage fiche={brouillon!.donnees.fiche!} />)).not.toThrow()
    await db.brouillons.clear()
  })
})
