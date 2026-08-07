CREATE TABLE public.location_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  label text,
  reason text NOT NULL DEFAULT 'manual',
  is_active boolean NOT NULL DEFAULT true,
  latitude double precision,
  longitude double precision,
  accuracy double precision,
  last_ping_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '6 hours'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.location_shares TO authenticated;
GRANT SELECT ON public.location_shares TO anon;
GRANT ALL ON public.location_shares TO service_role;

ALTER TABLE public.location_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own shares" ON public.location_shares
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view active shares" ON public.location_shares
  FOR SELECT TO anon, authenticated USING (is_active AND expires_at > now());

CREATE TRIGGER update_location_shares_updated_at BEFORE UPDATE ON public.location_shares
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX location_shares_user_idx ON public.location_shares (user_id, created_at DESC);

CREATE TABLE public.safety_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  silent_mode boolean NOT NULL DEFAULT false,
  auto_record boolean NOT NULL DEFAULT true,
  auto_share_location boolean NOT NULL DEFAULT true,
  fake_caller_name text NOT NULL DEFAULT 'Mom',
  fake_caller_photo_url text,
  fake_call_delay_seconds integer NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.safety_settings TO authenticated;
GRANT ALL ON public.safety_settings TO service_role;

ALTER TABLE public.safety_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own settings" ON public.safety_settings
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_safety_settings_updated_at BEFORE UPDATE ON public.safety_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.incident_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  notes text,
  latitude double precision,
  longitude double precision,
  accuracy double precision,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.incident_reports TO authenticated;
GRANT SELECT ON public.incident_reports TO anon;
GRANT ALL ON public.incident_reports TO service_role;

ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read incident reports" ON public.incident_reports
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Signed in users can report" ON public.incident_reports
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE TRIGGER update_incident_reports_updated_at BEFORE UPDATE ON public.incident_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.safety_alerts
  ADD COLUMN share_id uuid REFERENCES public.location_shares(id) ON DELETE SET NULL,
  ADD COLUMN has_recording boolean NOT NULL DEFAULT false,
  ADD COLUMN recording_path text;

CREATE POLICY "Users upload own evidence" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'incident-evidence' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users read own evidence" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'incident-evidence' AND auth.uid()::text = (storage.foldername(name))[1]);