'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import type { CardData } from '@/components/clippy-pokemon/types'
import { loadCards, loadSaison1 } from '@/components/clippy-pokemon/cardsData'
import type { Saison1Entry } from '@/components/clippy-pokemon/cardsData'

const SimulationMode = dynamic(
  () => import('@/components/clippy-pokemon/SimulationMode'),
  { ssr: false }
)

export default function CinemonSimPage() {
  const [cards, setCards] = useState<CardData[] | null>(null)
  const [saison1, setSaison1] = useState<Map<number, Saison1Entry> | null>(null)

  useEffect(() => {
    Promise.all([loadCards(), loadSaison1()]).then(([db, s1]) => {
      setCards(Object.values(db))
      setSaison1(s1)
    })
  }, [])

  if (!cards || !saison1) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0f1525',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontFamily: 'monospace',
      }}>
        Chargement des 490 films + Climax…
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f1525' }}>
      <SimulationMode allCards={cards} saison1={saison1} />
    </div>
  )
}
