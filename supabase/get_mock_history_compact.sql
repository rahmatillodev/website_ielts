-- Consolidated mock test history RPC to replace client-side fan-out queries.
-- Apply in Supabase SQL editor or as part of your migration workflow.

create index if not exists idx_mock_test_clients_user_status_created_at
  on public.mock_test_clients (user_id, status, created_at desc)
  where mock_test_id is not null;

create index if not exists idx_user_attempts_user_mock_completed_at
  on public.user_attempts (user_id, mock_id, completed_at desc);

create or replace function public.get_mock_history_compact(
  p_user_id uuid,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  client_id uuid,
  status text,
  total_score numeric,
  created_at timestamptz,
  full_name text,
  email text,
  mock_test_id uuid,
  listening_result jsonb,
  reading_result jsonb,
  writing_result jsonb,
  speaking_result jsonb
)
language sql
stable
as $$
with selected_clients as (
  select
    c.id,
    c.status,
    c.total_score,
    c.created_at,
    c.full_name,
    c.email,
    c.mock_test_id
  from public.mock_test_clients c
  where c.user_id = p_user_id
    and c.status in ('completed', 'checked', 'notified')
    and c.mock_test_id is not null
  order by c.created_at desc
  limit greatest(coalesce(p_limit, 50), 1)
  offset greatest(coalesce(p_offset, 0), 0)
),
base_attempts as (
  select
    sc.id as client_id,
    ua.id,
    ua.test_id,
    ua.writing_id,
    ua.score,
    ua.feedback,
    ua.correct_answers,
    ua.total_questions,
    ua.time_taken,
    ua.completed_at,
    ua.created_at,
    t.type as test_type,
    mt.listening_id,
    mt.reading_id,
    mt.writing_id as mock_writing_id
  from selected_clients sc
  join public.mock_test mt
    on mt.id = sc.mock_test_id
  left join public.user_attempts ua
    on ua.user_id = p_user_id
   and ua.mock_id = sc.mock_test_id
  left join public.test t
    on t.id = ua.test_id
),
ranked_attempts as (
  select
    ba.*,
    row_number() over (
      partition by ba.client_id,
      case
        when ba.writing_id is not null and ba.writing_id = ba.mock_writing_id then 'writing'
        when ba.test_id is not null and ba.test_id = ba.listening_id then 'listening'
        when ba.test_id is not null and ba.test_id = ba.reading_id then 'reading'
        when ba.test_type = 'speaking' then 'speaking'
        else 'other'
      end
      order by coalesce(ba.completed_at, ba.created_at) desc nulls last
    ) as rn
  from base_attempts ba
)
select
  sc.id as client_id,
  sc.status::text,
  sc.total_score,
  sc.created_at,
  sc.full_name,
  sc.email,
  sc.mock_test_id,
  max(
    case when ra.rn = 1 and ra.test_id = ra.listening_id then
      jsonb_build_object(
        'id', ra.id,
        'test_id', ra.test_id,
        'writing_id', ra.writing_id,
        'score', ra.score,
        'feedback', ra.feedback,
        'correct_answers', ra.correct_answers,
        'total_questions', ra.total_questions,
        'time_taken', ra.time_taken,
        'completed_at', ra.completed_at
      )
    end
  ) as listening_result,
  max(
    case when ra.rn = 1 and ra.test_id = ra.reading_id then
      jsonb_build_object(
        'id', ra.id,
        'test_id', ra.test_id,
        'writing_id', ra.writing_id,
        'score', ra.score,
        'feedback', ra.feedback,
        'correct_answers', ra.correct_answers,
        'total_questions', ra.total_questions,
        'time_taken', ra.time_taken,
        'completed_at', ra.completed_at
      )
    end
  ) as reading_result,
  max(
    case when ra.rn = 1 and ra.writing_id is not null and ra.writing_id = ra.mock_writing_id then
      jsonb_build_object(
        'id', ra.id,
        'test_id', ra.test_id,
        'writing_id', ra.writing_id,
        'score', ra.score,
        'feedback', ra.feedback,
        'correct_answers', ra.correct_answers,
        'total_questions', ra.total_questions,
        'time_taken', ra.time_taken,
        'completed_at', ra.completed_at
      )
    end
  ) as writing_result,
  max(
    case when ra.rn = 1 and ra.test_type = 'speaking' then
      jsonb_build_object(
        'id', ra.id,
        'test_id', ra.test_id,
        'writing_id', ra.writing_id,
        'score', ra.score,
        'feedback', ra.feedback,
        'correct_answers', ra.correct_answers,
        'total_questions', ra.total_questions,
        'time_taken', ra.time_taken,
        'completed_at', ra.completed_at
      )
    end
  ) as speaking_result
from selected_clients sc
left join ranked_attempts ra
  on ra.client_id = sc.id
group by
  sc.id,
  sc.status,
  sc.total_score,
  sc.created_at,
  sc.full_name,
  sc.email,
  sc.mock_test_id
order by sc.created_at desc;
$$;
