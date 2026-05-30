-- admin_marketing_spend — manual weekly marketing spend input for CAC dashboards
--
-- Solo operator records spend per channel per week here. Dashboard D divides
-- spend by attributed signups (joined via profiles.acquisition_source.utm_source)
-- to compute CAC. Without this table, CAC is computed-from-vibes — buyers see
-- through that immediately. Table is admin-only via service-role; no RLS policy
-- exposes it to users.

CREATE TABLE public.admin_marketing_spend (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start    date NOT NULL,
  channel       text NOT NULL,           -- matches profiles.acquisition_source.utm_source values
  usd_spent     numeric(10,2) NOT NULL CHECK (usd_spent >= 0),
  notes         text,
  recorded_by   uuid REFERENCES public.profiles(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (week_start, channel)
);

CREATE INDEX admin_marketing_spend_week_idx
  ON public.admin_marketing_spend (week_start DESC);

ALTER TABLE public.admin_marketing_spend ENABLE ROW LEVEL SECURITY;
-- service-role only
