-- Lien entre recommendation_films et films (pour gestion admin depuis la liste)
ALTER TABLE public.recommendation_films
  ADD COLUMN IF NOT EXISTS film_id integer REFERENCES public.films(id) ON DELETE CASCADE;

-- Un film ne peut être que dans une seule catégorie de rattrapage
CREATE UNIQUE INDEX IF NOT EXISTS recommendation_films_film_id_unique
  ON public.recommendation_films(film_id)
  WHERE film_id IS NOT NULL;
