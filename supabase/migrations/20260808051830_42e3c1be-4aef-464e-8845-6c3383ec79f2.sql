-- 1. checkin_sessions
CREATE TABLE public.checkin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  interval_minutes integer NOT NULL DEFAULT 15,
  grace_minutes integer NOT NULL DEFAULT 2,
  next_due_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  last_checkin_at timestamptz,
  escalated_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  share_id uuid REFERENCES public.location_shares(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkin_sessions TO authenticated;
GRANT ALL ON public.checkin_sessions TO service_role;
ALTER TABLE public.checkin_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own checkin sessions" ON public.checkin_sessions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_checkin_sessions_updated_at BEFORE UPDATE ON public.checkin_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_checkin_sessions_active ON public.checkin_sessions (is_active, next_due_at);

-- 2. location_history
CREATE TABLE public.location_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  accuracy double precision,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.location_history TO authenticated;
GRANT ALL ON public.location_history TO service_role;
ALTER TABLE public.location_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own location history" ON public.location_history
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_location_history_user_time ON public.location_history (user_id, recorded_at DESC);

-- 3. alert_deliveries
CREATE TABLE public.alert_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  alert_id uuid REFERENCES public.safety_alerts(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.trusted_contacts(id) ON DELETE SET NULL,
  contact_name text,
  phone text NOT NULL,
  channel text NOT NULL DEFAULT 'sms',
  status text NOT NULL DEFAULT 'pending',
  provider_message_id text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alert_deliveries TO authenticated;
GRANT ALL ON public.alert_deliveries TO service_role;
ALTER TABLE public.alert_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own deliveries" ON public.alert_deliveries
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_alert_deliveries_updated_at BEFORE UPDATE ON public.alert_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_alert_deliveries_alert ON public.alert_deliveries (alert_id);

-- 4. settings + share flags
ALTER TABLE public.safety_settings ADD COLUMN IF NOT EXISTS alert_sound boolean NOT NULL DEFAULT true;
ALTER TABLE public.safety_settings ADD COLUMN IF NOT EXISTS track_history boolean NOT NULL DEFAULT true;
ALTER TABLE public.location_shares ADD COLUMN IF NOT EXISTS alert_active boolean NOT NULL DEFAULT false;

-- 5. nightly purge of history older than 10 days
CREATE OR REPLACE FUNCTION public.purge_old_location_history()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.location_history WHERE recorded_at < now() - interval '10 days';
$$;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'purge-location-history',
  '30 2 * * *',
  $$ SELECT public.purge_old_location_history(); $$
);