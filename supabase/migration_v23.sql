-- Migration v23 : inscriptions en cours de saison

-- Table des demandes d'inscription en cours de saison
CREATE TABLE IF NOT EXISTS season_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message text,
  status text NOT NULL DEFAULT 'pending',
  -- status : 'pending' | 'approved_current' | 'approved_next' | 'rejected'
  saison int NOT NULL DEFAULT 1,
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE season_join_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own join requests"
  ON season_join_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own join requests"
  ON season_join_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all join requests"
  ON season_join_requests FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins can update join requests"
  ON season_join_requests FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Fenetre de 24h pre-marathon pour les joueurs acceptes en cours de saison
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS pre_marathon_window_until timestamptz DEFAULT NULL;

-- Index pour accelerer la recherche par user_id + saison
CREATE INDEX IF NOT EXISTS idx_season_join_requests_user_saison
  ON season_join_requests(user_id, saison);
