-- Migration 0006 — credit grant function
-- Per amended plan Phase 5. SECURITY DEFINER so the webhook handler
-- (running with service role) can call it; locked down via grant.

create or replace function public.grant_credits(
  p_user_id     uuid,
  p_amount      int,
  p_source      text,
  p_source_ref  text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_amount <= 0 then
    raise exception 'grant_credits amount must be positive';
  end if;

  update public.profiles
     set credits_balance = credits_balance + p_amount
   where id = p_user_id
     and deleted_at is null;

  if not found then
    raise exception 'profile % not found or deleted', p_user_id;
  end if;

  insert into public.admin_audit_log (admin_id, action, target_table, target_id, after)
  values (
    null,                              -- system action (webhook)
    'credit_grant',
    'profiles',
    p_user_id::text,
    jsonb_build_object(
      'amount', p_amount,
      'source', p_source,              -- 'stripe' | 'manual' | 'referral' | 'support'
      'source_ref', p_source_ref       -- stripe event_id | manual reason | referral id
    )
  );
end;
$$;

revoke all on function public.grant_credits(uuid, int, text, text) from public;
grant execute on function public.grant_credits(uuid, int, text, text) to service_role;
