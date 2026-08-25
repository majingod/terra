// Lot corpus 1.3.1 — symboles universels et armes (cc/distance) en ITEMS structurés
// pour l'encyclopédie D9-ter. Mêmes textes : chaque item est TRANCHÉ du verbatim 1.3.0,
// et la reconstruction (intro + noms + tranches) redonne l'original à l'espace près.
import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const RACINE = process.argv[2] ?? '.'
const rules = JSON.parse(readFileSync(`${RACINE}/src/data/rules.json`, 'utf8'))
if (rules.meta.version !== '1.3.0') throw new Error('base inattendue : ' + rules.meta.version)

const norme = (t) => t.replace(/\s+/g, ' ').trim()

/** Découpe séquentielle : chaque item court de son ancre à l'ancre suivante. */
function decoupe(texte, ancres, { avecPrefixe }) {
  const idx = ancres.map((a) => {
    const i = texte.indexOf(a.debut)
    if (i === -1) throw new Error('ancre introuvable : ' + a.debut)
    return { ...a, i }
  })
  for (let k = 1; k < idx.length; k += 1) if (idx[k].i <= idx[k - 1].i) throw new Error('ancres désordonnées')
  const avant = texte.slice(0, idx[0].i).trim()
  const items = idx.map((a, k) => {
    let morceau = texte.slice(a.i, k + 1 < idx.length ? idx[k + 1].i : texte.length).trim()
    if (avecPrefixe) {
      if (!morceau.startsWith(a.nom)) throw new Error('préfixe absent : ' + a.nom)
      morceau = morceau.slice(a.nom.length).trim()
    }
    return { nom: a.nom, verbatim: morceau }
  })
  const morceaux = [avant]
  for (const it of items) { if (avecPrefixe) morceaux.push(it.nom); morceaux.push(it.verbatim) }
  if (norme(morceaux.filter(Boolean).join(' ')) !== norme(texte)) throw new Error('découpe avec perte')
  return { avant, items }
}

const sections = Object.fromEntries(rules.regles_de_base.sections.map((s) => [s.id, s]))

/** Vérifie les ancres contre le verbatim (existence, ordre, préfixe, découpe sans perte),
 *  puis les pose en métadonnées de présentation. Le verbatim reste INTACT. */
function poserAncres(section, ancres, avecPrefixe) {
  const d = decoupe(section.verbatim, ancres, { avecPrefixe })
  if (!avecPrefixe && d.avant) throw new Error('reste avant le premier item : ' + section.id)
  section.presentation = { mode: 'items', avec_prefixe: avecPrefixe, ancres }
}

poserAncres(sections.symboles_universels, [
  { nom: 'Invisible', debut: 'Invisible Quelqu' },
  { nom: 'Immatériel ou Hors-Jeu', debut: 'Immatériel ou Hors-Jeu Si quelqu' },
  { nom: 'Invulnérable', debut: 'Invulnérable Lorsqu' },
  { nom: 'Vol', debut: 'Vol Quelqu' },
], true)
poserAncres(sections.armes_corps_a_corps, [
  { nom: 'Armes à 1 main', debut: 'Les Armes à 1 main' },
  { nom: 'Armes à 2 mains', debut: 'Les Armes tenues à 2 mains' },
  { nom: 'Armes d’hast', debut: 'Les Armes d’haste' },
  { nom: 'Armes massives', debut: 'Les Armes massives' },
  { nom: 'Armes rustiques', debut: 'Les Armes rustiques' },
  { nom: 'Maximums', debut: 'Maximum de 3 de dégâts' },
], false)
poserAncres(sections.armes_a_distance, [
  { nom: 'Armes de jet', debut: 'Les Armes de jet' },
  { nom: 'Arcs', debut: 'Les Arcs infligent' },
  { nom: 'Arbalètes', debut: 'Les Arbalètes infligent' },
  { nom: 'Sarbacanes', debut: 'Les Sarbacanes' },
], false)

rules.meta.version = '1.3.1'
rules.meta.lot_131 =
  'Ancres de présentation (D9-ter) sur symboles universels (4 états) et armes cc/distance ' +
  '(6 + 4 items) : les verbatims restent ENTIERS et sous gate, l’UI tranche à l’affichage ' +
  'par ces ancres — découpe vérifiée sans perte par ce script. 2026-08-24.'

const texte = JSON.stringify(rules, null, 1)
writeFileSync(`${RACINE}/src/data/rules.json`, texte)
console.log('octets :', Buffer.byteLength(texte, 'utf8'))
console.log('sha256 :', createHash('sha256').update(texte).digest('hex'))
