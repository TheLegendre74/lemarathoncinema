import type { Metadata } from 'next'
import LifeGodGame from '@/components/life-god-game/LifeGodGame'

export const metadata: Metadata = {
  title: 'Life God Game Lab',
  robots: {
    index: false,
    follow: false,
  },
}

export default function LifeGodGameLabPage() {
  return <LifeGodGame />
}
