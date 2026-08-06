import { randomUUID } from 'node:crypto';
import { sql, authAdmin, lit } from './db.js';

/**
 * Seeding helpers.
 *
 * Nothing here hardcodes an id. This repo is public, so test UUIDs and answer keys
 * must never land in it; every fixture is discovered by shape at run time ("a reading
 * test that has at least one explanation") rather than named. It also means the suite
 * keeps working after content changes.
 */

const FIXTURE_EMAIL_PREFIX = 'e2e-fixture';

/** Creates a confirmed auth user plus its public.users row. */
export async function createFixtureUser() {
  const email = `${FIXTURE_EMAIL_PREFIX}-${randomUUID().slice(0, 8)}@example.com`;
  const password = `E2e-${randomUUID().slice(0, 12)}!aA1`;

  const { status, body } = await authAdmin('admin/users', {
    method: 'POST',
    body: { email, password, email_confirm: true },
  });
  if (status !== 200 && status !== 201) {
    throw new Error(`e2e: could not create fixture user (HTTP ${status}): ${JSON.stringify(body)}`);
  }

  const id = body.id;
  // The app reads its profile from public.users, and feedbacks.user_id FKs to it.
  await sql(`insert into users (id, email, full_name)
             values (${lit(id)}, ${lit(email)}, 'E2E Fixture')
             on conflict (id) do update set full_name = excluded.full_name`);

  return { id, email, password };
}

export async function deleteFixtureUser(userId) {
  if (!userId) return;
  await sql(`delete from user_answers where attempt_id in
               (select id from user_attempts where user_id = ${lit(userId)})`);
  await sql(`delete from user_attempts where user_id = ${lit(userId)}`);
  await sql(`delete from feedbacks where user_id = ${lit(userId)}`);
  await sql(`delete from users where id = ${lit(userId)}`);
  await authAdmin(`admin/users/${userId}`, { method: 'DELETE' });
}

/**
 * Finds an active test of `type` carrying at least `minExplanations` stored explanations.
 * Returns null when the content has none, so a spec can skip rather than fail - Explain
 * coverage is thin and is expected to vary between environments.
 */
export async function findTestWithExplanations(type = 'reading', minExplanations = 1) {
  const rows = await sql(`
    select t.id::text as test_id,
           t.title,
           count(*) filter (where btrim(coalesce(q.explanation, '')) <> '') as explanation_count,
           count(*) as question_count
    from test t
    join questions q on q.test_id = t.id
    where t.type = ${lit(type)} and t.is_active
    group by t.id, t.title
    having count(*) filter (where btrim(coalesce(q.explanation, '')) <> '') >= ${Number(minExplanations)}
    order by explanation_count desc
    limit 1`, { readOnly: true });

  if (!rows?.length) return null;
  return {
    testId: rows[0].test_id,
    title: rows[0].title,
    explanationCount: Number(rows[0].explanation_count),
    questionCount: Number(rows[0].question_count),
  };
}

export async function findReadingTestWithExplanations(minExplanations = 1) {
  return findTestWithExplanations('reading', minExplanations);
}

export async function findListeningTestWithExplanations(minExplanations = 1) {
  return findTestWithExplanations('listening', minExplanations);
}

/**
 * Every question of a test with the part it belongs to and whether it has an
 * explanation stored. Specs use it to assert the exact opposite of a screenshot:
 * an Explain control appears for precisely the explained questions of the part on
 * screen, and for nothing else.
 */
export async function listQuestionExplanations(testId) {
  const rows = await sql(`
    select q.question_number,
           p.part_number,
           qg.type::text as type,
           (btrim(coalesce(q.explanation, '')) <> '') as has_explanation
    from questions q
    join part p on p.id = q.part_id
    join question qg on qg.id = q.question_id
    where q.test_id = ${lit(testId)} and q.question_number is not null
    order by q.question_number`, { readOnly: true });

  return (rows ?? []).map((row) => ({
    questionNumber: Number(row.question_number),
    partNumber: Number(row.part_number),
    type: row.type,
    hasExplanation: row.has_explanation === true || row.has_explanation === 't',
  }));
}

/**
 * Builds a completed attempt for `userId` on `testId`, answering every question.
 * Even-numbered questions are answered correctly and odd ones wrongly, so the review
 * table always renders both the correct and the incorrect state.
 */
export async function seedCompletedAttempt({ userId, testId, type = 'reading' }) {
  const attemptId = randomUUID();

  const [{ total }] = await sql(
    `select count(*)::int as total from questions where test_id = ${lit(testId)}`, { readOnly: true });

  await sql(`
    insert into user_attempts
      (id, user_id, test_id, score, total_questions, correct_answers,
       completed_at, created_at, time_taken, type, is_mock)
    values
      (${lit(attemptId)}, ${lit(userId)}, ${lit(testId)}, 6.5, ${total},
       (select count(*) from questions where test_id = ${lit(testId)} and question_number % 2 = 0),
       now(), now(), 300, ${lit(type)}, false)`);

  await sql(`
    insert into user_answers
      (id, attempt_id, question_id, user_answer, is_correct, correct_answer,
       created_at, question_type, question_number)
    select gen_random_uuid(),
           ${lit(attemptId)},
           q.id,
           case when q.question_number % 2 = 0
                then coalesce(q.correct_answer, 'TRUE')
                else 'E2E WRONG ANSWER' end,
           q.question_number % 2 = 0,
           coalesce(q.correct_answer, 'TRUE'),
           now(),
           coalesce(qg.type, 'true_false_not_given'),
           q.question_number
    from questions q
    left join question qg on qg.id = q.question_id
    where q.test_id = ${lit(testId)} and q.question_number is not null`);

  const [{ answers }] = await sql(
    `select count(*)::int as answers from user_answers where attempt_id = ${lit(attemptId)}`,
    { readOnly: true });

  return { attemptId, answerCount: Number(answers) };
}

/** Belt-and-braces sweep for fixtures a crashed run may have left behind. */
export async function purgeOrphanFixtures() {
  const rows = await sql(
    `select id::text from auth.users where email like ${lit(`${FIXTURE_EMAIL_PREFIX}-%@example.com`)}`,
    { readOnly: true });
  for (const row of rows ?? []) await deleteFixtureUser(row.id);
  return rows?.length ?? 0;
}
