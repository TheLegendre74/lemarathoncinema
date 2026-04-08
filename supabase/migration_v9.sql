-- MIGRATION V9 — Notes négatives (table séparée)
CREATE TABLE IF NOT EXISTS public.negative_ratings (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  film_id integer NOT NULL REFERENCES public.films(id) ON DELETE CASCADE,
  score integer NOT NULL CHECK (score >= 1 AND score <= 10),
  rated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, film_id)
);

ALTER TABLE public.negative_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own negative ratings"
  ON public.negative_ratings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can read negative ratings"
  ON public.negative_ratings FOR SELECT
  USING (true);
