'use client'

import { useTheme } from '../ThemeProvider'

interface ComedieAfficheProps {
  saisonLabel: string
  ranked: Array<{
    pseudo: string
    exp: number
    is_admin: boolean
  }>
  userId: string | null
}

export default function ComedieAffiche({ saisonLabel, ranked, userId }: ComedieAfficheProps) {
  const { key } = useTheme()
  if (key !== 'comedie' || ranked.length === 0) return null

  const first = ranked[0]
  const second = ranked[1]
  const third = ranked[2]
  const top8 = ranked.slice(3, 8)
  const rest = ranked.slice(8)
  const admins = ranked.filter(u => u.is_admin)

  const myRank = ranked.findIndex(u => (u as any).id === userId)
  const gap = myRank > 0 ? ranked[0].exp - ranked[myRank].exp : 0

  return (
    <div className="comedie-affiche-poster">
      <div className="comedie-affiche-header">Le Cin{"é"} Marathon pr{"é"}sente</div>

      <div className="comedie-affiche-star">{first.pseudo}</div>
      <div className="comedie-affiche-dans">dans</div>
      <div className="comedie-affiche-saison">La saison {saisonLabel}</div>

      {second && (
        <div className="comedie-affiche-seconds">
          {second.pseudo}
          {third && <> et {third.pseudo}</>}
        </div>
      )}

      {top8.length > 0 && (
        <div className="comedie-affiche-supporting">
          {top8.map(u => u.pseudo).join(', ')}
        </div>
      )}

      {rest.length > 0 && (
        <div className="comedie-affiche-avec">
          Avec {rest.map(u => u.pseudo).join(', ')}
        </div>
      )}

      {admins.length > 0 && (
        <div className="comedie-affiche-regie">
          R{"é"}gie : {admins.map(u => u.pseudo).join(', ')}
        </div>
      )}

      <div className="comedie-affiche-ecart">
        {myRank === 0
          ? 'Ton nom est au-dessus du titre.'
          : myRank > 0
            ? `Encore ${gap} rappels et ton nom passe au-dessus du titre`
            : ''}
      </div>
    </div>
  )
}
