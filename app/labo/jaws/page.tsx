import type { Metadata } from 'next'
import JawsCinematicTest from '@/components/JawsCinematicTest'

export const metadata: Metadata = {
  title: 'Jaws Easter Egg Lab',
  robots: {
    index: false,
    follow: false,
  },
}

export default function JawsEasterEggLabPage() {
  return <JawsCinematicTest />
}
