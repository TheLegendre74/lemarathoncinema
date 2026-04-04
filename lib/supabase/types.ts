export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          pseudo: string
          exp: number
          is_admin: boolean
          saison: number
          created_at: string
          updated_at: string
          avatar_url: string | null
        }
        Insert: {
          id: string
          pseudo: string
          exp?: number
          is_admin?: boolean
          saison?: number
          avatar_url?: string | null
        }
        Update: {
          pseudo?: string
          exp?: number
          is_admin?: boolean
          saison?: number
          avatar_url?: string | null
        }
        Relationships: []
      }
      films: {
        Row: {
          id: number
          titre: string
          annee: number
          realisateur: string
          genre: string
          sousgenre: string | null
          poster: string | null
          saison: number
          added_by: string | null
          created_at: string
          tmdb_id: number | null
          flagged_18plus: boolean
          flagged_16plus: boolean
          flagged_18_pending: boolean
        }
        Insert: {
          titre: string
          annee: number
          realisateur: string
          genre: string
          sousgenre?: string | null
          poster?: string | null
          saison?: number
          added_by?: string | null
          tmdb_id?: number | null
          flagged_18plus?: boolean
          flagged_16plus?: boolean
          flagged_18_pending?: boolean
        }
        Update: {
          titre?: string
          annee?: number
          realisateur?: string
          genre?: string
          sousgenre?: string | null
          poster?: string | null
          saison?: number
          tmdb_id?: number | null
          flagged_18plus?: boolean
          flagged_16plus?: boolean
          flagged_18_pending?: boolean
        }
        Relationships: []
      }
      watched: {
        Row: {
          user_id: string
          film_id: number
          pre: boolean
          watched_at: string
        }
        Insert: {
          user_id: string
          film_id: number
          pre?: boolean
        }
        Update: Record<string, never>
        Relationships: []
      }
      ratings: {
        Row: {
          user_id: string
          film_id: number
          score: number
          rated_at: string
        }
        Insert: {
          user_id: string
          film_id: number
          score: number
        }
        Update: {
          score?: number
        }
        Relationships: []
      }
      duels: {
        Row: {
          id: number
          film1_id: number
          film2_id: number
          week_num: number
          winner_id: number | null
          closed: boolean
          created_at: string
        }
        Insert: {
          film1_id: number
          film2_id: number
          week_num: number
        }
        Update: {
          winner_id?: number | null
          closed?: boolean
        }
        Relationships: []
      }
      votes: {
        Row: {
          user_id: string
          duel_id: number
          film_choice: number
          voted_at: string
        }
        Insert: {
          user_id: string
          duel_id: number
          film_choice: number
        }
        Update: Record<string, never>
        Relationships: []
      }
      posts: {
        Row: {
          id: string
          topic: string
          user_id: string
          content: string
          created_at: string
        }
        Insert: {
          topic: string
          user_id: string
          content: string
        }
        Update: Record<string, never>
        Relationships: []
      }
      week_films: {
        Row: {
          id: number
          film_id: number
          session_time: string | null
          note: string | null
          active: boolean
          created_at: string
        }
        Insert: {
          film_id: number
          session_time?: string | null
          note?: string | null
          active?: boolean
        }
        Update: {
          active?: boolean
          session_time?: string | null
          note?: string | null
        }
        Relationships: []
      }
      discovered_eggs: {
        Row: {
          user_id: string
          egg_id: string
          found_at: string
        }
        Insert: {
          user_id: string
          egg_id: string
        }
        Update: Record<string, never>
        Relationships: []
      }
      reports: {
        Row: {
          id: string
          film_id: number
          user_id: string
          reason: string
          resolved: boolean
          resolved_by: string | null
          created_at: string
        }
        Insert: {
          film_id: number
          user_id: string
          reason: string
          resolved?: boolean
          resolved_by?: string | null
        }
        Update: {
          resolved?: boolean
          resolved_by?: string | null
        }
        Relationships: []
      }
      site_config: {
        Row: {
          key: string
          value: string
          updated_at: string
        }
        Insert: {
          key: string
          value: string
          updated_at?: string
        }
        Update: {
          value?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {}
    Functions: {
      increment_exp: {
        Args: { user_id: string; amount: number }
        Returns: void
      }
      decrement_exp: {
        Args: { user_id: string; amount: number }
        Returns: void
      }
      leaderboard: {
        Args: { limit_n: number }
        Returns: {
          id: string
          pseudo: string
          exp: number
          is_admin: boolean
          saison: number
          watch_count: number
          vote_count: number
        }[]
      }
    }
  }
}

// Convenient type aliases
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Film = Database['public']['Tables']['films']['Row']
export type Watched = Database['public']['Tables']['watched']['Row']
export type Rating = Database['public']['Tables']['ratings']['Row']
export type Duel = Database['public']['Tables']['duels']['Row']
export type Vote = Database['public']['Tables']['votes']['Row']
export type Post = Database['public']['Tables']['posts']['Row']
export type WeekFilm = Database['public']['Tables']['week_films']['Row']

// Extended types with joins
export type FilmWithStats = Film & {
  watchCount: number
  watchPct: number
  avgRating: number | null
  ratingCount: number
  isWatched?: boolean
  myRating?: number | null
  isMajority: boolean
}

export type DuelWithFilms = Duel & {
  film1: Film
  film2: Film
  votes1: number
  votes2: number
  myVote: number | null
}

export type ProfileWithStats = Profile & {
  watchCount: number
  voteCount: number
}
