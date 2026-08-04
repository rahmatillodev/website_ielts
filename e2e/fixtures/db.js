import { PROJECT_REF, SUPABASE_URL, managementToken, serviceRoleKey } from './target.js';

/**
 * Run SQL against the target project through the Management API.
 *
 * Used for seeding and teardown only - never to assert what the UI should show.
 * A test that checks the database instead of the page is not an end-to-end test.
 */
/**
 * Transient statuses from the Management API. It sits behind a gateway that
 * occasionally returns 503 ("connection timeout") or rate-limits under load; those
 * are infrastructure hiccups, not product failures, and retrying is correct.
 * A 4xx other than 429 means the query itself is wrong, so it fails immediately.
 */
const RETRYABLE = new Set([429, 500, 502, 503, 504]);

export async function sql(query, { readOnly = false, attempts = 4 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let res;
    try {
      res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${managementToken()}`,
          'Content-Type': 'application/json',
          // Cloudflare 403s some default agents in front of this API.
          'User-Agent': 'ieltscore-e2e',
        },
        body: JSON.stringify({ query, read_only: readOnly }),
      });
    } catch (networkError) {
      lastError = networkError;
      if (attempt < attempts) { await sleep(attempt); continue; }
      throw new Error(`e2e sql failed (network): ${networkError.message}`);
    }

    const body = await res.json().catch(() => null);
    if (res.ok) return body;

    lastError = new Error(`e2e sql failed (HTTP ${res.status}): ${body?.message ?? 'unknown error'}`);
    if (!RETRYABLE.has(res.status) || attempt === attempts) throw lastError;
    await sleep(attempt);
  }
  throw lastError;
}

/** Exponential-ish backoff: 400ms, 800ms, 1.6s. */
const sleep = (attempt) =>
  new Promise((resolve) => setTimeout(resolve, 400 * 2 ** (attempt - 1)));

/** Auth admin API (create/delete the fixture user). */
export async function authAdmin(pathname, { method = 'GET', body } = {}) {
  const key = await serviceRoleKey();
  const res = await fetch(`${SUPABASE_URL}/auth/v1/${pathname}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const parsed = text ? JSON.parse(text) : null;
  return { status: res.status, body: parsed };
}

/** Single-quote escaping for the small literals we interpolate (uuids, emails). */
export const lit = (value) => `'${String(value).replace(/'/g, "''")}'`;
