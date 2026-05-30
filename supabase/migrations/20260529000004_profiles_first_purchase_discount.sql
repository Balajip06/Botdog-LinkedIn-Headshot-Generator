-- Migration 0010 — profiles.first_purchase_discount_used_at
--
-- W2 of the sellable-asset plan: first-purchase 20%-off coupon is one of
-- the highest-leverage activation levers we can ship before payment
-- traffic hits the box. The mechanism is dead-simple:
--   1. `/api/stripe/checkout` checks this column.
--   2. If NULL AND the coupon feature-flag env (`STRIPE_FIRST_PURCHASE_-
--      COUPON_ID`) is set, the session is created with that coupon
--      attached.
--   3. The Stripe webhook stamps this column on `checkout.session.com-
--      pleted` so the second purchase doesn't get the discount.
--
-- Once-set + nullable is the idempotency guard: a re-run of the webhook
-- (we store every event in `webhook_events` for dedup) cannot resurrect
-- the discount eligibility.
--
-- No RLS change needed. The column is read by the user's session
-- (allowed by `profiles_self_read`) and written by the webhook via the
-- service-role client (RLS bypass).

alter table public.profiles
  add column if not exists first_purchase_discount_used_at timestamptz;
