'use client'

import { useTheme } from '../ThemeProvider'
import { westernTheme } from '@/lib/themes/western'

interface WeekFilm {
  id: number
  titre: string
  poster: string | null
}

interface Props {
  weekFilm: WeekFilm | null
  weekLabel: string | null
  playerRang: string | null
  prime: number | null
}

export default function WesternHomeHero({ weekFilm, weekLabel, playerRang, prime }: Props) {
  const { key } = useTheme()
  if (key !== 'western') return null

  return (
    <div className="western-contrat">
      <div className="western-contrat-header">
        {weekLabel ?? 'TERRITOIRE'}
      </div>

      {weekFilm ? (
        <>
          <div className="western-contrat-prime">
            {prime != null ? `$${prime}` : 'MORT OU VIF'}
          </div>
          <div className="western-contrat-titre">
            {weekFilm.titre}
          </div>
        </>
      ) : (
        <div className="western-contrat-titre">
          Pas de contrat cette semaine.
        </div>
      )}

      <div className="western-contrat-info">
        {westernTheme.repliques?.contratCitation}
      </div>

      {playerRang && (
        <div className="western-contrat-mention">
          {playerRang}
        </div>
      )}
    </div>
  )
}
