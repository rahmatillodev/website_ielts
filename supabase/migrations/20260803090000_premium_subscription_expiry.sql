-- Premium subscription expiry.
--
-- Until now expiry was a client-side illusion: authStore rewrote an elapsed
-- plan to free in memory while the row kept `subscription_status = 'premium'`
-- and both premium dates forever. Anything reading the table directly — RLS
-- policies, the payment bot, admin tooling, another client — still saw premium.
--
-- This makes the database the authority, with three layers:
--
--   1. a BEFORE trigger, so no write can leave an expired plan on a row;
--   2. a scheduled sweep, so rows that lapse while nobody touches them are
--      cleared within minutes;
--   3. a self-service RPC, so the client that first notices can write it
--      through immediately instead of waiting for the sweep.
--
-- Expiry means exactly: subscription_status → 'free', premium_started_at →
-- NULL, premium_until → NULL. `premium_until IS NULL` on a premium row still
-- means "no end date" and is left alone; only a date in the past expires.
--
-- Idempotent: safe to re-run.

-- Legacy label for the same plan, still present on old rows.
create or replace function public.premium_status_is_paid(p_status text)
returns boolean
language sql
immutable
as $$
  select lower(coalesce(p_status, '')) in ('premium', 'vip');
$$;

comment on function public.premium_status_is_paid(text) is
  'True for the paid subscription labels (premium and the legacy vip).';


-- ---------------------------------------------------------------------------
-- 1. Trigger: an expired plan can never be stored
-- ---------------------------------------------------------------------------

create or replace function public.enforce_premium_subscription_expiry()
returns trigger
language plpgsql
as $$
begin
  if new.premium_until is not null and new.premium_until <= now() then
    new.subscription_status := 'free';
    new.premium_started_at := null;
    new.premium_until := null;
  end if;

  -- A paid status with no dates at all is a manual/lifetime grant and is left
  -- as-is; clearing dates that are already null is a no-op either way.
  return new;
end;
$$;

comment on function public.enforce_premium_subscription_expiry() is
  'BEFORE INSERT/UPDATE guard on public.users: refuses to persist a premium plan whose premium_until has passed.';

drop trigger if exists users_enforce_premium_expiry on public.users;

create trigger users_enforce_premium_expiry
  before insert or update on public.users
  for each row
  execute function public.enforce_premium_subscription_expiry();


-- ---------------------------------------------------------------------------
-- 2. Sweep: clear rows that lapsed while untouched
-- ---------------------------------------------------------------------------

create or replace function public.expire_premium_subscriptions()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  with expired as (
    update public.users
       set subscription_status = 'free',
           premium_started_at  = null,
           premium_until       = null
     where premium_until is not null
       and premium_until <= now()
    returning 1
  )
  select count(*) into v_count from expired;

  return v_count;
end;
$$;

comment on function public.expire_premium_subscriptions() is
  'Clears every subscription whose premium_until has passed. Returns the number of rows expired. Run on a schedule.';

-- Housekeeping only: never expose it to end users.
revoke all on function public.expire_premium_subscriptions() from public, anon, authenticated;
grant execute on function public.expire_premium_subscriptions() to service_role;


-- ---------------------------------------------------------------------------
-- 3. Self-service RPC: the client writes its own expiry through
-- ---------------------------------------------------------------------------
--
-- Safe to expose. It ignores its caller's intent entirely: it only ever
-- downgrades, only the calling user's own row, and only when premium_until has
-- genuinely passed. There is no argument to abuse and nothing to escalate.

create or replace function public.expire_own_premium_subscription()
returns public.users
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.users;
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  update public.users
     set subscription_status = 'free',
         premium_started_at  = null,
         premium_until       = null
   where id = v_user_id
     and premium_until is not null
     and premium_until <= now()
  returning * into v_row;

  if not found then
    -- Nothing to expire; hand back the current row so the caller can settle on
    -- one source of truth either way.
    select * into v_row from public.users where id = v_user_id;
  end if;

  return v_row;
end;
$$;

comment on function public.expire_own_premium_subscription() is
  'Expires the calling user''s own premium plan if premium_until has passed, and returns their current users row.';

revoke all on function public.expire_own_premium_subscription() from public, anon;
grant execute on function public.expire_own_premium_subscription() to authenticated, service_role;


-- ---------------------------------------------------------------------------
-- 4. Purchase / renewal
-- ---------------------------------------------------------------------------
--
-- The counterpart to expiry, so a renewal populates the same three columns the
-- same way every time. Callers today set them by hand from the payment side;
-- point them here instead.
--
-- p_extend = false (default): the new period starts now, which is what a
-- purchase after a lapse wants. p_extend = true: stack the new days on top of
-- whatever is left, so renewing early does not burn the remainder.

create or replace function public.grant_premium_subscription(
  p_user_id uuid,
  p_days integer,
  p_extend boolean default false
)
returns public.users
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := now();
  v_base timestamptz;
  v_row public.users;
begin
  if p_days is null or p_days <= 0 then
    raise exception 'p_days must be a positive number of days' using errcode = '22023';
  end if;

  select case
           when p_extend
            and premium_until is not null
            and premium_until > v_now
           then premium_until
           else v_now
         end
    into v_base
    from public.users
   where id = p_user_id;

  if v_base is null then
    raise exception 'User % not found', p_user_id using errcode = 'P0002';
  end if;

  update public.users
     set subscription_status = 'premium',
         premium_started_at  = v_now,
         premium_until       = v_base + make_interval(days => p_days)
   where id = p_user_id
  returning * into v_row;

  return v_row;
end;
$$;

comment on function public.grant_premium_subscription(uuid, integer, boolean) is
  'Starts or renews a premium plan: sets subscription_status, premium_started_at and premium_until together. p_extend stacks onto any remaining time.';

-- Granting premium is a privileged action: server side only.
revoke all on function public.grant_premium_subscription(uuid, integer, boolean) from public, anon, authenticated;
grant execute on function public.grant_premium_subscription(uuid, integer, boolean) to service_role;


-- ---------------------------------------------------------------------------
-- 5. Backfill every row that is already stale
-- ---------------------------------------------------------------------------

select public.expire_premium_subscriptions();

-- Paid status left behind with no end date and no start date is the shape the
-- old client-side "expiry" produced when it half-cleared a row. Those are not
-- distinguishable from deliberate lifetime grants, so they are reported rather
-- than touched — review before deciding.
do $$
declare
  v_orphans integer;
begin
  select count(*) into v_orphans
    from public.users
   where public.premium_status_is_paid(subscription_status)
     and premium_until is null
     and premium_started_at is null;

  if v_orphans > 0 then
    raise notice 'premium rows with no dates at all (lifetime grants or leftovers): %', v_orphans;
  end if;
end;
$$;


-- ---------------------------------------------------------------------------
-- 6. Schedule the sweep
-- ---------------------------------------------------------------------------
--
-- pg_cron is available on Supabase but not enabled by default. Enable it in
-- Dashboard → Database → Extensions (or `create extension pg_cron;`) and this
-- block schedules the job; without it the trigger and the RPC still cover every
-- row that is read or written, and this can be run again later.

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('expire-premium-subscriptions')
      where exists (
        select 1 from cron.job where jobname = 'expire-premium-subscriptions'
      );

    perform cron.schedule(
      'expire-premium-subscriptions',
      '*/10 * * * *',
      $cron$select public.expire_premium_subscriptions();$cron$
    );

    raise notice 'scheduled expire-premium-subscriptions every 10 minutes';
  else
    raise notice 'pg_cron not installed - sweep not scheduled. Enable pg_cron and re-run this migration.';
  end if;
end;
$$;
