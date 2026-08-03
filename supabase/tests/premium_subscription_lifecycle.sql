-- Lifecycle test for premium expiry: purchase → active → expired → renewed.
--
-- Run it in the Supabase SQL editor (or `psql`) after applying
-- migrations/20260803090000_premium_subscription_expiry.sql.
--
-- The whole script runs inside a transaction that ends in ROLLBACK, so it
-- changes nothing: it borrows one real row, drives it through every stage,
-- asserts the result at each one, and puts everything back. Any failed
-- assertion aborts with a message naming the stage.
--
-- It needs table-owner rights (disabling a trigger, setting the role), which
-- the SQL editor and the service role have.

begin;

-- The row under test. Uses whichever user comes first; nothing is kept.
create temporary table _premium_test (user_id uuid) on commit drop;

insert into _premium_test (user_id) select id from public.users limit 1;

do $$
begin
  if not exists (select 1 from _premium_test) then
    raise exception 'no rows in public.users to test against';
  end if;
end;
$$;


-- ---------------------------------------------------------------------------
-- Stage 1 — purchase
-- ---------------------------------------------------------------------------

select public.grant_premium_subscription((select user_id from _premium_test), 30);

do $$
declare
  r public.users;
begin
  select u.* into r from public.users u where u.id = (select user_id from _premium_test);

  if r.subscription_status <> 'premium' then
    raise exception 'purchase: expected premium, got %', r.subscription_status;
  end if;
  if r.premium_started_at is null or r.premium_until is null then
    raise exception 'purchase: both premium dates must be populated';
  end if;
  if r.premium_until <= now() then
    raise exception 'purchase: premium_until must be in the future';
  end if;
  if abs(extract(epoch from (r.premium_until - r.premium_started_at)) - 30 * 86400) > 5 then
    raise exception 'purchase: expected a 30 day period, got %', r.premium_until - r.premium_started_at;
  end if;

  raise notice 'stage 1 purchase: ok (until %)', r.premium_until;
end;
$$;


-- ---------------------------------------------------------------------------
-- Stage 2 — active: unrelated writes must not disturb a running plan
-- ---------------------------------------------------------------------------

update public.users
   set subscription_status = subscription_status
 where id = (select user_id from _premium_test);

do $$
declare
  r public.users;
begin
  select u.* into r from public.users u where u.id = (select user_id from _premium_test);

  if r.subscription_status <> 'premium' or r.premium_until is null then
    raise exception 'active: a running plan was cleared by an unrelated update';
  end if;

  raise notice 'stage 2 active: ok';
end;
$$;


-- ---------------------------------------------------------------------------
-- Stage 3 — the trigger refuses to store an expired plan
-- ---------------------------------------------------------------------------

update public.users
   set premium_until = now() - interval '1 day'
 where id = (select user_id from _premium_test);

do $$
declare
  r public.users;
begin
  select u.* into r from public.users u where u.id = (select user_id from _premium_test);

  if r.subscription_status <> 'free'
     or r.premium_started_at is not null
     or r.premium_until is not null then
    raise exception 'trigger: an expired plan was stored as % / % / %',
      r.subscription_status, r.premium_started_at, r.premium_until;
  end if;

  raise notice 'stage 3 trigger: ok (expired plan rejected on write)';
end;
$$;


-- ---------------------------------------------------------------------------
-- Stage 4 — the sweep clears a row that lapsed while untouched
-- ---------------------------------------------------------------------------
-- The trigger cannot produce this state, so it is planted with the trigger off
-- — exactly the shape rows already in the table are in.

alter table public.users disable trigger users_enforce_premium_expiry;

update public.users
   set subscription_status = 'premium',
       premium_started_at  = now() - interval '31 days',
       premium_until       = now() - interval '1 day'
 where id = (select user_id from _premium_test);

alter table public.users enable trigger users_enforce_premium_expiry;

do $$
declare
  v_expired integer;
  r public.users;
begin
  v_expired := public.expire_premium_subscriptions();

  if v_expired < 1 then
    raise exception 'sweep: expected at least one row expired, got %', v_expired;
  end if;

  select u.* into r from public.users u where u.id = (select user_id from _premium_test);

  if r.subscription_status <> 'free'
     or r.premium_started_at is not null
     or r.premium_until is not null then
    raise exception 'sweep: row left as % / % / %',
      r.subscription_status, r.premium_started_at, r.premium_until;
  end if;

  raise notice 'stage 4 sweep: ok (% row(s) expired)', v_expired;
end;
$$;


-- ---------------------------------------------------------------------------
-- Stage 5 — the client RPC expires the caller's own row
-- ---------------------------------------------------------------------------

alter table public.users disable trigger users_enforce_premium_expiry;

update public.users
   set subscription_status = 'premium',
       premium_started_at  = now() - interval '31 days',
       premium_until       = now() - interval '1 hour'
 where id = (select user_id from _premium_test);

alter table public.users enable trigger users_enforce_premium_expiry;

-- Impersonate that user, the way an authenticated request arrives.
select set_config(
  'request.jwt.claims',
  json_build_object('sub', (select user_id from _premium_test), 'role', 'authenticated')::text,
  true
);
set local role authenticated;

select public.expire_own_premium_subscription();

reset role;

do $$
declare
  r public.users;
begin
  select u.* into r from public.users u where u.id = (select user_id from _premium_test);

  if r.subscription_status <> 'free'
     or r.premium_started_at is not null
     or r.premium_until is not null then
    raise exception 'rpc: row left as % / % / %',
      r.subscription_status, r.premium_started_at, r.premium_until;
  end if;

  raise notice 'stage 5 rpc: ok';
end;
$$;


-- ---------------------------------------------------------------------------
-- Stage 6 — the RPC cannot touch an active plan, or anyone else's row
-- ---------------------------------------------------------------------------

select public.grant_premium_subscription((select user_id from _premium_test), 30);

select set_config(
  'request.jwt.claims',
  json_build_object('sub', (select user_id from _premium_test), 'role', 'authenticated')::text,
  true
);
set local role authenticated;

select public.expire_own_premium_subscription();

reset role;

do $$
declare
  r public.users;
begin
  select u.* into r from public.users u where u.id = (select user_id from _premium_test);

  if r.subscription_status <> 'premium' or r.premium_until is null then
    raise exception 'rpc: an active plan was revoked';
  end if;

  raise notice 'stage 6 rpc on an active plan: ok (no-op)';
end;
$$;


-- ---------------------------------------------------------------------------
-- Stage 7 — renewal repopulates both dates
-- ---------------------------------------------------------------------------

do $$
declare
  before_until timestamptz;
  r public.users;
begin
  -- Lapse it first: a renewal after expiry starts a fresh period.
  alter table public.users disable trigger users_enforce_premium_expiry;
  update public.users
     set subscription_status = 'premium',
         premium_started_at  = now() - interval '31 days',
         premium_until       = now() - interval '2 days'
   where id = (select user_id from _premium_test);
  alter table public.users enable trigger users_enforce_premium_expiry;

  perform public.expire_premium_subscriptions();

  perform public.grant_premium_subscription((select user_id from _premium_test), 90);

  select u.* into r from public.users u where u.id = (select user_id from _premium_test);

  if r.subscription_status <> 'premium' then
    raise exception 'renewal: expected premium, got %', r.subscription_status;
  end if;
  if r.premium_started_at is null or r.premium_until is null then
    raise exception 'renewal: both premium dates must be repopulated';
  end if;
  if abs(extract(epoch from (r.premium_until - now())) - 90 * 86400) > 5 then
    raise exception 'renewal: expected 90 days from now, got %', r.premium_until;
  end if;

  before_until := r.premium_until;

  -- Renewing early with p_extend stacks onto the remaining time.
  perform public.grant_premium_subscription((select user_id from _premium_test), 30, true);
  select u.* into r from public.users u where u.id = (select user_id from _premium_test);

  if abs(extract(epoch from (r.premium_until - before_until)) - 30 * 86400) > 5 then
    raise exception 'renewal: p_extend should add 30 days, got % → %', before_until, r.premium_until;
  end if;

  raise notice 'stage 7 renewal: ok (until %)', r.premium_until;
end;
$$;


-- ---------------------------------------------------------------------------
-- Stage 8 — table-wide consistency
-- ---------------------------------------------------------------------------

do $$
declare
  v_stale integer;
  v_half integer;
begin
  select count(*) into v_stale
    from public.users
   where premium_until is not null and premium_until <= now();

  if v_stale > 0 then
    raise exception 'consistency: % row(s) still hold an expired premium_until', v_stale;
  end if;

  select count(*) into v_half
    from public.users
   where lower(coalesce(subscription_status, '')) not in ('premium', 'vip')
     and (premium_started_at is not null or premium_until is not null);

  if v_half > 0 then
    raise exception 'consistency: % non-premium row(s) still carry premium dates', v_half;
  end if;

  raise notice 'stage 8 consistency: ok (no expired or orphaned premium dates)';
end;
$$;

rollback;
