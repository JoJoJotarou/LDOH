-- Migration: Add min_trust_level to system_notifications

ALTER TABLE public.system_notifications
  ADD COLUMN IF NOT EXISTS min_trust_level integer;
