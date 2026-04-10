-- Mini-bio sur les profils joueurs
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text CHECK (char_length(bio) <= 200);
