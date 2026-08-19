/**
 * L'entrée de l'encyclopédie se fait par la barre du bas EXISTANTE.
 * ⛔ Pas de menu burger — la jumelle le mesure au lieu de le supposer.
 */
// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import Layout from '../Layout'

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

afterEach(cleanup)

function afficherChrome() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<div>ACCUEIL-TEMOIN</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('Entrée de l’encyclopédie', () => {
  it('la barre du bas mène à /encyclopedie', () => {
    const { container } = afficherChrome()
    const barre = container.querySelector('nav')
    expect(barre).not.toBeNull()
    const lien = screen.getByRole('link', { name: /encyclop/i })
    expect(lien.getAttribute('href')).toBe('/encyclopedie')
    expect(barre!.contains(lien)).toBe(true)
  })

  it('jumelle : aucun menu burger dans le chrome de l’app', () => {
    const { container } = afficherChrome()
    expect(container.textContent).not.toMatch(/[☰≡]/)
    expect(container.querySelector('[aria-label*="menu" i]')).toBeNull()
    const source = readFileSync(join(RACINE, 'src', 'components', 'Layout.tsx'), 'utf8')
    expect(source).not.toMatch(/burger|hamburger|[☰≡]/i)
  })
})
