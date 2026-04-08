export type TMDBSuggestion = {
  tmdb_id: number
  titre: string
  titreOriginal: string
  annee: number | null
  realisateur: string
  genre: string
  sousgenre: string | null
  poster: string | null
  overview: string
}

const TMDB_GENRES: Record<number, string> = {
  28:'Action', 12:'Aventure', 16:'Animation', 35:'Comédie', 80:'Crime',
  18:'Drame', 10751:'Famille', 14:'Fantaisie', 36:'Histoire', 27:'Horreur',
  9648:'Policier', 878:'SF', 53:'Thriller', 10752:'Guerre', 37:'Western',
}

export async function searchFilmTMDB(params: {
  titre?: string
  realisateur?: string
  annee?: string
  genre?: string
}): Promise<TMDBSuggestion[]> {
  const { titre = '', realisateur = '', annee = '', genre = '' } = params
  const key = process.env.TMDB_API_KEY
  if (!key) return []

  const titreQ = titre.trim()
  const realQ = realisateur.trim()
  const anneeN = annee ? parseInt(annee) : null

  if (titreQ.length < 2 && realQ.length < 2) return []

  try {
    const seenIds = new Set<number>()
    const allMovies: any[] = []

    // ── Recherche par titre (FR + EN) ──
    if (titreQ.length >= 2) {
      const [resFR, resEN] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/search/movie?api_key=${key}&query=${encodeURIComponent(titreQ)}&language=fr-FR&page=1`, { cache: 'no-store' }),
        fetch(`https://api.themoviedb.org/3/search/movie?api_key=${key}&query=${encodeURIComponent(titreQ)}&language=en-US&page=1`, { cache: 'no-store' }),
      ])
      const [dataFR, dataEN] = await Promise.all([resFR.json(), resEN.json()])
      const frResults: any[] = dataFR.results ?? []
      const enResults: any[] = dataEN.results ?? []
      const frIds = new Set(frResults.map((m: any) => m.id))
      ;[...frResults, ...enResults.filter((m: any) => !frIds.has(m.id))].forEach(m => {
        if (!seenIds.has(m.id)) { seenIds.add(m.id); allMovies.push(m) }
      })
    }

    // ── Recherche par réalisateur (parallèle si titre présent aussi) ──
    if (realQ.length >= 2) {
      const personRes = await fetch(
        `https://api.themoviedb.org/3/search/person?api_key=${key}&query=${encodeURIComponent(realQ)}&language=fr-FR`,
        { cache: 'no-store' }
      )
      const personData = await personRes.json()
      // Prendre les 3 premières personnes correspondantes pour éviter les faux positifs
      const persons: any[] = (personData.results ?? []).slice(0, 3)

      if (persons.length > 0) {
        const allCredits = await Promise.all(
          persons.map((p: any) =>
            fetch(`https://api.themoviedb.org/3/person/${p.id}/movie_credits?api_key=${key}&language=fr-FR`, { cache: 'no-store' })
              .then(r => r.json())
              .catch(() => ({ crew: [] }))
          )
        )

        const titleWords = titreQ.length >= 2
          ? titreQ.toLowerCase().split(/\s+/).filter(w => w.length > 1)
          : []

        allCredits.forEach((credits: any) => {
          const directed: any[] = (credits.crew ?? []).filter((m: any) => m.job === 'Director')
          const relevant = titleWords.length > 0
            ? directed.filter(m => {
                const t = (m.title ?? m.original_title ?? '').toLowerCase()
                return titleWords.some(w => t.includes(w))
              })
            : directed.sort((a: any, b: any) => (b.vote_count ?? 0) - (a.vote_count ?? 0)).slice(0, 10)

          relevant.forEach((m: any) => {
            if (!seenIds.has(m.id)) { seenIds.add(m.id); allMovies.push(m) }
          })
        })
      }
    }

    // ── Filtre par année (±2) ──
    let candidates = allMovies
    if (anneeN) {
      candidates = candidates.filter((m: any) => {
        const yr = parseInt((m.release_date ?? '').slice(0, 4))
        return !yr || Math.abs(yr - anneeN) <= 2
      })
    }

    candidates = candidates.slice(0, 12)
    if (!candidates.length) return []

    // ── Détails + crédits pour chaque candidat ──
    const details = await Promise.all(
      candidates.map((m: any) =>
        fetch(`https://api.themoviedb.org/3/movie/${m.id}?api_key=${key}&language=fr-FR&append_to_response=credits`, { cache: 'no-store' })
          .then(r => r.json())
          .catch(() => null)
      )
    )

    let suggestions: TMDBSuggestion[] = details
      .filter(Boolean)
      .map((d: any) => {
        const director = d.credits?.crew?.find((c: any) => c.job === 'Director')
        const genres: string[] = (d.genres ?? []).map((g: any) => TMDB_GENRES[g.id] ?? g.name)
        return {
          tmdb_id: d.id,
          titre: d.title ?? d.original_title ?? '',
          titreOriginal: d.original_title ?? '',
          annee: d.release_date ? parseInt(d.release_date.slice(0, 4)) : null,
          realisateur: director?.name ?? '',
          genre: genres[0] ?? 'Drame',
          sousgenre: genres[1] ?? null,
          poster: d.poster_path ? `https://image.tmdb.org/t/p/w92${d.poster_path}` : null,
          overview: (d.overview ?? '').slice(0, 100),
        }
      })
      .filter(s => s.titre)

    // ── Filtre par genre si sélectionné ──
    if (genre) {
      suggestions = suggestions.filter(s => s.genre === genre || s.sousgenre === genre)
    }

    return suggestions
  } catch {
    return []
  }
}
