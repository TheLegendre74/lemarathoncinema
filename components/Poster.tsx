'use client'

import Image from 'next/image'
import { useState } from 'react'

const FALLBACKS = ['🎬', '🎭', '🎪', '🎞️', '📽️']

interface PosterProps {
  film: { id: number; titre: string; poster?: string | null }
  fill?: boolean
  width?: number
  height?: number
  className?: string
  style?: React.CSSProperties
}

export default function Poster({ film, fill, width = 300, height = 450, className, style }: PosterProps) {
  const [err, setErr] = useState(false)
  const fb = FALLBACKS[film.id % FALLBACKS.length]

  if (err || !film.poster) {
    return (
      <div
        style={{
          ...style,
          width: fill ? '100%' : width,
          height: fill ? '100%' : height,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--bg3)', fontSize: '2.5rem', flexShrink: 0,
        }}
        className={className}
      >
        {fb}
      </div>
    )
  }

  if (fill) {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%', ...style }} className={className}>
        <Image
          src={film.poster}
          alt={film.titre}
          fill
          style={{ objectFit: 'cover' }}
          onError={() => setErr(true)}
          sizes="(max-width: 768px) 50vw, 200px"
        />
      </div>
    )
  }

  return (
    <Image
      src={film.poster}
      alt={film.titre}
      width={width}
      height={height}
      style={{ objectFit: 'cover', ...style }}
      className={className}
      onError={() => setErr(true)}
    />
  )
}
