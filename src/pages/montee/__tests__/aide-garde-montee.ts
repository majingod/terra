/**
 * D20 lot 2 · C4 — traverser la GARDE D'INTENTION de la montée, dans les
 * gates qui ouvraient l'écran de montée d'un seul clic.
 *
 * Q4 (t016, Fred 2026-08-26) a mis une porte de plus entre le bouton de la
 * fiche et l'écran de montée : une fenêtre qui nomme le personnage et le
 * niveau visé, gardée par le bouton à MAINTIEN de D23. Les gates d'avant
 * n'ont pas changé de SPEC — elles gardent exactement ce qu'elles gardaient
 * (une seule écriture, Annuler n'écrit rien, l'écran ≤11 ne propose aucun
 * choix) ; seul le CHEMIN pour arriver à l'écran a gagné un geste. Cette
 * fabrique tient ce geste, en un seul endroit.
 *
 * Le chrono du maintien est un `setInterval` : on ne fake QUE `setInterval` et
 * `clearInterval`, le temps du geste. Faker `setTimeout` casserait Dexie,
 * `fake-indexeddb` et l'attente de `@testing-library` — c'est la mécanique
 * déjà éprouvée par la gate D23 · G2.
 */
import { act, fireEvent, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { DUREE_MAINTIEN_MS } from '../../../components/BoutonMaintien'
import { LIBELLE_MAINTIEN_MONTEE } from '../FenetreIntentionMontee'

/** Le libellé du bouton de la fiche, celui de D17 — arbitré mot pour mot. */
export function libelleBoutonMonter(niveauAtteint: number): string {
  return `Monter au niveau ${niveauAtteint}`
}

/**
 * Le geste complet : toucher « Monter au niveau N », puis MAINTENIR le bouton
 * de la fenêtre d'intention jusqu'au bout. À la sortie, l'écran de montée est
 * ouvert — et pas avant.
 */
export async function ouvrirLaMonteeParLaGarde(niveauAtteint: number): Promise<void> {
  fireEvent.click(await screen.findByRole('button', { name: libelleBoutonMonter(niveauAtteint) }))
  await maintenirPourMonter()
}

/** Le seul maintien, quand la fenêtre d'intention est déjà ouverte. */
export async function maintenirPourMonter(duree = DUREE_MAINTIEN_MS): Promise<void> {
  // ⚠️ Nom accessible PARTIEL : la barre de progression du bouton porte son
  // propre `aria-label`, qui entre dans le nom calculé — même patron que la
  // gate D23 · G2.
  const bouton = await screen.findByRole('button', { name: new RegExp(LIBELLE_MAINTIEN_MONTEE, 'i') })
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
  fireEvent.pointerDown(bouton)
  act(() => {
    vi.advanceTimersByTime(duree)
  })
  fireEvent.pointerUp(bouton)
  vi.useRealTimers()
}
