'use client'

import { usePathname } from 'next/navigation'
import Image from 'next/image'

export default function DiscordFab() {
  const pathname = usePathname()
  if (pathname?.startsWith('/auth')) return null

  return (
    <a
      href="https://discord.gg/nrGkqKgrtj"
      target="_blank"
      rel="noopener noreferrer"
      title="Rejoindre le Discord"
      className="discord-fab"
    >
      <Image src="/discord.png" alt="Discord" width={26} height={26} style={{ objectFit: 'contain' }} />
    </a>
  )
}
