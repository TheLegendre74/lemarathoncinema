import type { Metadata } from 'next'
import ClippyPunchOutTest from './ClippyPunchOutTest'

export const metadata: Metadata = {
  title: 'Clippy Punch-Out — Lab',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <ClippyPunchOutTest />
}
