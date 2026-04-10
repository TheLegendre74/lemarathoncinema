-- Migration v18 : limite quotidienne de films vus pendant le marathon

-- Ajout colonne dans profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS marathon_blocked_until timestamptz DEFAULT NULL;

-- Table des demandes de dépassement de limite
CREATE TABLE IF NOT EXISTS marathon_watch_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message text,
  day date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE marathon_watch_requests ENABLE ROW LEVEL SECURITY;

-- L'utilisateur peut voir ses propres requêtes
CREATE POLICY "Users can view own requests"
  ON marathon_watch_requests FOR SELECT
  USING (auth.uid() = user_id);

-- L'utilisateur peut créer une requête
CREATE POLICY "Users can insert own requests"
  ON marathon_watch_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- L'admin peut tout voir
CREATE POLICY "Admins can view all requests"
  ON marathon_watch_requests FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- L'admin peut mettre à jour le statut
CREATE POLICY "Admins can update requests"
  ON marathon_watch_requests FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
