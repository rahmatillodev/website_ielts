// Shared helpers for the listening-transcription pipeline.
//
// Secrets: this module reads GEMINI_API_KEY / Supabase creds from the process
// environment only. Run scripts with `node --env-file=.env.transcribe ...`.
// Never hardcode a key here and never print one.
//
// Note: `.env.transcribe` must target the project that actually holds the test
// content. Do not assume `.env.prod` points there - verify before running.

import { createClient } from '@supabase/supabase-js';

export function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Run with: node --env-file=.env.transcribe scripts/transcribe/<script>.mjs`
    );
  }
  return value;
}

export function supabase() {
  return createClient(
    requireEnv('SUPABASE_URL'),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
    { auth: { persistSession: false } }
  );
}

/** Fetch every listening test with its parts, ordered. */
export async function fetchListeningTests(db) {
  const { data: tests, error: testErr } = await db
    .from('test')
    .select('id, title, type, is_active, question_quantity, created_at')
    .eq('type', 'listening')
    .order('created_at', { ascending: true });
  if (testErr) throw new Error(`test query failed: ${testErr.message}`);

  const { data: parts, error: partErr } = await db
    .from('part')
    .select('id, test_id, part_number, title, listening_url, content')
    .in('test_id', tests.map((t) => t.id))
    .order('part_number', { ascending: true });
  if (partErr) throw new Error(`part query failed: ${partErr.message}`);

  const byTest = new Map(tests.map((t) => [t.id, { ...t, parts: [] }]));
  for (const p of parts) byTest.get(p.test_id)?.parts.push(p);
  return [...byTest.values()];
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function fmtDuration(seconds) {
  if (seconds == null || !Number.isFinite(seconds)) return '?';
  const s = Math.round(seconds);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}
