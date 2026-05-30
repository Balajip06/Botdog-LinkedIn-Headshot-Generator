-- Migration 0011 — trends.share_caption_template
--
-- W2 of the sellable-asset plan: the generic "I tried the X trend —
-- check it out" share copy is killing the K-factor we're trying to
-- build. Each trend has a natural caption that lands better in-feed
-- ("POV: I'm a Studio Ghibli protagonist now ↓"), and the admin should
-- be able to A/B these without a code deploy.
--
-- Stored as a TEXT template with two substitution tokens consumed by
-- `app/(app)/result/[id]/ShareBurst.tsx`:
--   {trend_title}  → the human-readable trend title
--   {site_url}     → the public trend permalink
--
-- NULL means "use the generic fallback the component already ships".
-- Keeping it nullable lets the column ship ahead of the per-trend
-- copywriting pass without flipping every existing row to a placeholder.
--
-- No RLS change — `trends` is admin-managed and public-read; the
-- existing policies already cover the field.

alter table public.trends
  add column if not exists share_caption_template text;
