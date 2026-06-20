'use client'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'

const ClippyPokemonBattle = dynamic(
  () => import('@/components/ClippyPokemonBattle'),
  { ssr: false }
)

export default function ClippyPokemonPage() {
  const router = useRouter()

  return (
    <ClippyPokemonBattle
      onVictory={() => {
        setTimeout(() => {
          if (confirm('Victoire ! Rejouer ?')) window.location.reload()
          else router.push('/labo')
        }, 1000)
      }}
      onDefeat={() => {
        setTimeout(() => {
          if (confirm('Défaite… Réessayer ?')) window.location.reload()
          else router.push('/labo')
        }, 1000)
      }}
    />
  )
}
