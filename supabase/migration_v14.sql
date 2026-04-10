-- Notifications email marathon
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notify_marathon     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marathon_reminder_sent boolean NOT NULL DEFAULT false;
