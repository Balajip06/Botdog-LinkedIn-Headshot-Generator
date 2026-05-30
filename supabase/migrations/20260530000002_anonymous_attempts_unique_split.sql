-- Migration 0021 — Split anonymous_attempts UNIQUE into per-field constraints
--
-- Red-team audit (2026-05-30) CRITICAL C3: the prior composite constraint
-- `unique (fingerprint_hash, ip_hash)` blocked only the exact same pair.
-- An attacker rotating *either* signal alone (new fingerprint OR new IP)
-- created a fresh row, defeating the "1 attempt per lifetime" rule from
-- non-negotiable #11. Cost: 1 free Gemini call per signal rotation, and
-- with the daily abuse budget set to $20/day default, that funds dozens
-- of free generations before the auto-disable kicks in.
--
-- Fix: drop the composite, add two independent UNIQUE constraints. Either
-- a fingerprint repeat or an IP repeat now collides → insert raises 23505,
-- which the route already maps to the 409 "already used" response.
--
-- Trade-off — NAT collateral: shared-IP networks (mobile carrier NAT, dorm
-- routers, corporate VPN exit nodes) now allow only the first visitor to
-- claim the trial. This is the intended security/UX trade. The anonymous
-- trial is a marketing on-ramp, not a substitute for signup; affected
-- users sign up and get the full 5/week free tier. The carrier-NAT risk
-- is also bounded by the 24h `expires_at` — same IP can attempt again
-- after expiry+purge.

-- Drop the existing composite. Use the auto-generated constraint name from
-- migration 0004; the explicit `if exists` keeps this idempotent across
-- environments that may have already been patched manually.
alter table public.anonymous_attempts
  drop constraint if exists anonymous_attempts_fingerprint_hash_ip_hash_key;

-- Per-field uniques. Either repeat (fingerprint OR ip) now collides.
alter table public.anonymous_attempts
  add constraint anonymous_attempts_fingerprint_hash_key unique (fingerprint_hash);

alter table public.anonymous_attempts
  add constraint anonymous_attempts_ip_hash_key unique (ip_hash);

comment on constraint anonymous_attempts_fingerprint_hash_key on public.anonymous_attempts is
  'Anonymous trial: 1 attempt per fingerprint lifetime. Paired with ip_hash unique to enforce non-negotiable #11.';
comment on constraint anonymous_attempts_ip_hash_key on public.anonymous_attempts is
  'Anonymous trial: 1 attempt per IP lifetime. Accepts NAT collateral as the security/UX trade.';
