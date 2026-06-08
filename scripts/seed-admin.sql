-- Botdog — Seed initial admin
--
-- PREFERRED: use the TypeScript helper instead — it accepts the email as an arg
-- and does the lookup + upsert in one shot:
--
--   pnpm bootstrap:admin your@email.com
--
-- This SQL file remains as a fallback if you cannot run the script.
--
-- Run ONCE in the Supabase SQL editor after creating your first auth user
-- (sign up at /login with the email below first).
--
-- Replace the email before running. Idempotent (ON CONFLICT DO NOTHING).
--
-- Schema reference (supabase/migrations/20260527000004_ancillary.sql):
--   public.admin_users (
--     user_id    uuid primary key references auth.users(id) on delete cascade,
--     role       admin_role not null default 'editor',  -- enum: 'admin' | 'editor'
--     created_at timestamptz not null default now()
--   )

-- Step 1: confirm your user_id by email
--   SELECT id, email FROM auth.users WHERE email = 'REPLACE_WITH_YOUR_EMAIL@example.com';

-- Step 2: insert into admin_users with the highest role ('admin')
INSERT INTO public.admin_users (user_id, role)
SELECT id, 'admin'::public.admin_role
FROM auth.users
WHERE email = 'REPLACE_WITH_YOUR_EMAIL@example.com'
ON CONFLICT (user_id) DO NOTHING;

-- Step 3: verify
SELECT au.user_id, au.role, au.created_at, u.email
FROM public.admin_users au
JOIN auth.users u ON u.id = au.user_id;
