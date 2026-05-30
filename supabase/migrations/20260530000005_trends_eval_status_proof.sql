-- Migration 0024 — DB-side proof for `trends.eval_status = 'passed'`
--
-- Red-team HIGH H5: `markTrendEval(id, 'passed')` only updated the column
-- via service-role. The existing `trends_eval_gate` CHECK constraint
-- only enforced that `is_active = true` implies `eval_status = 'passed'`,
-- but did not verify that any actual eval run with `admin_rating = 'pass'`
-- exists for the current `prompt_version`. An admin could mark a brand
-- new prompt as 'passed' on the trend row with zero generated outputs.
--
-- Fix: BEFORE UPDATE trigger that, on the eval_status untested|failed →
-- passed transition, requires at least one trend_eval_runs row matching
-- (trend_id, prompt_version = trends.version, admin_rating = 'pass').
-- Anything else raises and rolls back. Service-role bypasses RLS but
-- NOT triggers, so this gate fires regardless of caller.
--
-- We also pin search_path on the existing bump_trend_version function
-- (red-team LOW L1) for symmetry with the rest of the project's trigger
-- functions — same migration since both touch trend mutation hot paths.

create or replace function public.bump_trend_version()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.prompt_template is distinct from old.prompt_template
     or new.model         is distinct from old.model then
    new.version := old.version + 1;
    new.prompt_template_history := old.prompt_template_history
      || jsonb_build_object(
        'version', old.version,
        'prompt_template', old.prompt_template,
        'model', old.model,
        'replaced_at', now()
      );
    -- Force re-eval on substantive change
    new.eval_status := 'untested';
    new.is_active   := false;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.require_eval_proof_for_passed()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_pass_count int;
begin
  -- Only fire on the transition INTO 'passed'. Demoting (passed → failed,
  -- passed → untested) is always allowed.
  if new.eval_status is not distinct from old.eval_status then
    return new;
  end if;
  if new.eval_status <> 'passed' then
    return new;
  end if;

  -- The bump_trend_version trigger runs BEFORE this one alphabetically
  -- (postgres fires BEFORE triggers in name order). We check against
  -- new.version which is whatever bump_trend_version set — if the prompt
  -- was just edited, version was bumped and eval_status forced back to
  -- 'untested', so this trigger doesn't fire in that path either.
  select count(*) into v_pass_count
    from public.trend_eval_runs r
   where r.trend_id       = new.id
     and r.prompt_version = new.version
     and r.admin_rating   = 'pass';

  if v_pass_count = 0 then
    raise exception 'eval proof missing: trends.eval_status cannot be set to ''passed'' for trend % version % — no trend_eval_runs row with admin_rating=''pass'' exists',
      new.id, new.version
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists trends_require_eval_proof on public.trends;
-- Trigger name uses 'z_' prefix so it fires AFTER bump_trend_version
-- (postgres BEFORE triggers fire in alphabetical name order, and
-- bump_trend_version owns `new.version` mutation that this gate reads).
create trigger z_trends_require_eval_proof
  before update on public.trends
  for each row execute function public.require_eval_proof_for_passed();

comment on function public.require_eval_proof_for_passed is
  'Enforces non-negotiable #5: trends.eval_status cannot transition to ''passed'' without a matching trend_eval_runs row (admin_rating=''pass'') for the current prompt_version. Closes red-team H5 (markTrendEval bypass).';
