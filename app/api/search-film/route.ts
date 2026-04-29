import { searchFilmTMDB } from '@/lib/tmdb'

export const revalidate = 300

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const titre = searchParams.get('titre') ?? ''
  const realisateur = searchParams.get('realisateur') ?? ''
  const annee = searchParams.get('annee') ?? ''
  const genre = searchParams.get('genre') ?? ''

  const results = await searchFilmTMDB({ titre, realisateur, annee, genre })
  return Response.json(results)
}
