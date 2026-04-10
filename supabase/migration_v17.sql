-- Migration v17: Private messaging between players

-- Table des messages privés
CREATE TABLE IF NOT EXISTS private_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) <= 1000),
  read_at timestamptz DEFAULT NULL,
  deleted_by_sender boolean DEFAULT false,
  deleted_by_recipient boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Index pour récupérer les conversations rapidement
CREATE INDEX IF NOT EXISTS pm_sender_idx ON private_messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pm_recipient_idx ON private_messages(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pm_conversation_idx ON private_messages(
  LEAST(sender_id, recipient_id),
  GREATEST(sender_id, recipient_id),
  created_at DESC
);

-- Table des utilisateurs bloqués
CREATE TABLE IF NOT EXISTS blocked_users (
  blocker_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (blocker_id, blocked_id)
);

-- RLS pour private_messages
ALTER TABLE private_messages ENABLE ROW LEVEL SECURITY;

-- On peut voir uniquement ses propres messages (envoyés ou reçus, non supprimés de son côté)
CREATE POLICY "pm_select" ON private_messages
  FOR SELECT USING (
    (sender_id = auth.uid() AND NOT deleted_by_sender)
    OR
    (recipient_id = auth.uid() AND NOT deleted_by_recipient)
  );

-- On peut envoyer des messages (insert)
CREATE POLICY "pm_insert" ON private_messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

-- On peut seulement mettre à jour ses propres flags (read_at, deleted)
CREATE POLICY "pm_update" ON private_messages
  FOR UPDATE USING (
    sender_id = auth.uid() OR recipient_id = auth.uid()
  );

-- RLS pour blocked_users
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "block_select" ON blocked_users
  FOR SELECT USING (blocker_id = auth.uid() OR blocked_id = auth.uid());

CREATE POLICY "block_insert" ON blocked_users
  FOR INSERT WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "block_delete" ON blocked_users
  FOR DELETE USING (blocker_id = auth.uid());
