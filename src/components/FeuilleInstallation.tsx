/**
 * Feuille d'instructions « Comment faire » — les gestes d'installation,
 * navigateur par navigateur, quand le navigateur ne les offre pas lui-même.
 *
 * Trois onglets seulement : Chrome/Android, Samsung Internet, Safari
 * iPhone/iPad. Ce sont les trois navigateurs qu'on croisera vraiment chez 30
 * à 50 joueurs ; on n'en ajoute pas « au cas où ».
 *
 * Le paragraphe du bas répond à la seule question qui compte pour un
 * parent : « est-ce que c'est fait ? »
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'

type Onglet = 'android' | 'samsung' | 'ios'

/** Une touche à toucher dans le navigateur, citée telle qu'elle s'y lit. */
function Touche({ children }: { children: ReactNode }) {
  return (
    <span className="touche">{children}</span>
  )
}

const ONGLETS: { id: Onglet; libelle: string }[] = [
  { id: 'android', libelle: 'Android' },
  { id: 'samsung', libelle: 'Samsung' },
  { id: 'ios', libelle: 'iPhone / iPad' },
]

const PAS: Record<Onglet, ReactNode[]> = {
  android: [
    <>
      Touche les <Touche>⋮</Touche> trois points en haut à droite de Chrome.
    </>,
    <>
      Choisis <Touche>Ajouter à l’écran d’accueil</Touche>.
    </>,
    <>
      Confirme avec <Touche>Installer</Touche>.
    </>,
  ],
  samsung: [
    <>
      Touche les <Touche>☰</Touche> trois barres en bas à droite du navigateur Samsung.
    </>,
    <>
      Choisis <Touche>Ajouter la page à</Touche>, puis <Touche>Écran d’accueil</Touche>.
    </>,
    <>
      Confirme avec <Touche>Ajouter</Touche>.
    </>,
  ],
  ios: [
    <>
      Ouvre la page dans <Touche>Safari</Touche> — sur iPhone et iPad, seul Safari sait
      installer une app.
    </>,
    <>
      Touche le bouton <Touche>Partager</Touche> (le carré avec une flèche vers le haut), en
      bas de l’écran.
    </>,
    <>
      Fais défiler la liste et choisis <Touche>Sur l’écran d’accueil</Touche>.
    </>,
    <>
      Confirme avec <Touche>Ajouter</Touche>, en haut à droite.
    </>,
  ],
}

/**
 * L'onglet ouvert d'abord : celui du navigateur qu'on a sous la main. Une
 * supposition, jamais une porte fermée — les trois onglets restent
 * atteignables.
 */
export function ongletProbable(ua: string): Onglet {
  if (/SamsungBrowser/i.test(ua)) return 'samsung'
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  return 'android'
}

export default function FeuilleInstallation({ onFermer }: { onFermer: () => void }) {
  const [onglet, setOnglet] = useState<Onglet>(() =>
    ongletProbable(typeof navigator === 'undefined' ? '' : navigator.userAgent),
  )
  const feuille = useRef<HTMLDivElement>(null)

  // Échap referme : au clavier comme au doigt, on ne reste pas coincé.
  useEffect(() => {
    function surTouche(e: KeyboardEvent) {
      if (e.key === 'Escape') onFermer()
    }
    window.addEventListener('keydown', surTouche)
    feuille.current?.focus()
    return () => window.removeEventListener('keydown', surTouche)
  }, [onFermer])

  return (
    <div
      className="pas-a-imprimer fixed inset-0 z-[100] flex items-end justify-center bg-black/60"
      onClick={onFermer}
    >
      <div
        ref={feuille}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Garder Terra Mortis sur ton écran d’accueil"
        className="max-h-[88dvh] w-full max-w-[440px] overflow-y-auto rounded-t-xl border border-border/50 bg-popover px-4 pb-6 pt-4 outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div aria-hidden className="mx-auto mb-4 h-1 w-11 rounded-full bg-border" />

        <h2 className="m-0 font-titre text-xl font-bold text-gold">
          Garder Terra Mortis sur ton écran d’accueil
        </h2>
        <p className="m-0 mb-4 mt-1 text-[15px] text-muted-foreground">
          Une fois installée, elle s’ouvre en un tap et fonctionne sans réseau, sur le terrain.
        </p>

        <div role="tablist" aria-label="Choisis ton navigateur" className="mb-4 flex gap-2">
          {ONGLETS.map((o) => (
            <button
              key={o.id}
              type="button"
              role="tab"
              aria-selected={onglet === o.id}
              className={`min-h-11 flex-1 rounded-lg border px-2 py-2 font-titre text-[14px] ${
                onglet === o.id
                  ? 'border-primary bg-primary/15 text-gold'
                  : 'border-border/60 bg-muted/50 text-muted-foreground'
              }`}
              onClick={() => setOnglet(o.id)}
            >
              {o.libelle}
            </button>
          ))}
        </div>

        <ol className="m-0 flex list-decimal flex-col gap-2 pl-5 text-[16px] leading-snug">
          {PAS[onglet].map((pas, i) => (
            <li key={i}>{pas}</li>
          ))}
        </ol>

        <div className="mt-4 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2.5 text-[15px] leading-snug text-secondary-foreground">
          <b>Comment savoir que ça a marché :</b> l’icône Terra Mortis apparaît sur ton écran
          d’accueil, et quand tu l’ouvres, la barre d’adresse du navigateur a disparu.
        </div>

        <button type="button" className="btn-secondaire mt-4" onClick={onFermer}>
          Fermer
        </button>
      </div>
    </div>
  )
}
