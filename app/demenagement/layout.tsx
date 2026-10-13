import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: 'noindex',
}

export default function DemenagementLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
