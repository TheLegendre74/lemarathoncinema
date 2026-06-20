import type { Metadata } from 'next'
import ClippyPunchOutCanvasTest from './ClippyPunchOutCanvasTest'

export const metadata: Metadata = {
  title: 'Clippy Punch-Out (Canvas) — Lab',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <ClippyPunchOutCanvasTest />
}
