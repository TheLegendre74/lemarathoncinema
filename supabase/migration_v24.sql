-- Migration v24 : progression Clippy sauvegardée par joueur en DB
-- Permet de retrouver sa phase Clippy sur n'importe quel navigateur/appareil

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS clippy_defeats integer NOT NULL DEFAULT 0;
