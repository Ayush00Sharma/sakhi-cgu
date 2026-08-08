ALTER TABLE public.safety_settings
  ADD COLUMN IF NOT EXISTS tracking_paused_until timestamptz,
  ADD COLUMN IF NOT EXISTS confirm_share_on_sos boolean NOT NULL DEFAULT false;