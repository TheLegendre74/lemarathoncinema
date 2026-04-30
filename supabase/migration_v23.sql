-- Migration v23 : trigger handle_new_user lit saison depuis les métadonnées auth
-- Fix : utilisateurs inscrits après le lancement du marathon reçoivent saison=2

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, pseudo, saison)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'pseudo', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'saison')::integer, 1)
  );
  RETURN NEW;
END;
$$;
