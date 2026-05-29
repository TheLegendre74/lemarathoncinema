-- Migration v28 : table week_film_bonus_claims (bonus 48h film de la semaine)

CREATE TABLE public.week_film_bonus_claims (
  user_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_film_id INTEGER REFERENCES public.week_films(id) ON DELETE CASCADE,
  claimed_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (user_id, week_film_id)
);

ALTER TABLE public.week_film_bonus_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bonus claims lisibles par tous connectés"
  ON public.week_film_bonus_claims FOR SELECT TO authenticated USING (true);

CREATE POLICY "Bonus claim ajouté par soi"
  ON public.week_film_bonus_claims FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
