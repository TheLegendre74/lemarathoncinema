import type { ImageLoaderProps } from 'next/image'

const TAILLES_TMDB = [92, 154, 185, 342, 500, 780] as const

export function estAfficheTmdb(src: string): boolean {
  return src.startsWith('https://image.tmdb.org/t/p/')
}

export function tmdbLoader({ src, width }: ImageLoaderProps): string {
  const taille = TAILLES_TMDB.find(t => t >= width) ?? 780
  return src.replace(/\/t\/p\/[^/]+\//, `/t/p/w${taille}/`)
}
