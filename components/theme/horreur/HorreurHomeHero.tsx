'use client'

import { useTheme } from '../ThemeProvider'

interface WeekFilm {
  id: number
  titre: string
  poster: string | null
}

interface Props {
  weekFilm: WeekFilm | null
  weekLabel: string | null
  playerRole: string | null
}

export default function HorreurHomeHero({ weekFilm, weekLabel, playerRole }: Props) {
  const { key } = useTheme()
  if (key !== 'horreur') return null

  return (
    <div className="horreur-porte">
      <div className="horreur-porte-header">
        {weekLabel ?? 'LA PORTE'}
      </div>

      {weekFilm ? (
        <div className="horreur-porte-titre">
          {weekFilm.titre}
        </div>
      ) : (
        <div className="horreur-porte-titre">
          Personne n’a frappé cette semaine.
        </div>
      )}

      <div className="horreur-porte-sous-titre">
        Ta prochaine victime. Et quelqu’un te suit.
      </div>

      {playerRole && (
        <div className="horreur-porte-role">
          {playerRole}
        </div>
      )}
    </div>
  )
}
