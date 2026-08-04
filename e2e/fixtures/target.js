import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Minimal .env parser - we only ever read two keys and dotenv is not a dependency here. */
function readEnvFile(name) {
  const file = path.join(ROOT, name);
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs.readFileSync(file, 'utf8')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const i = line.indexOf('=');
        return [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^['"]|['"]$/g, '')];
      }),
  );
}

const projectRef = (url) => (url ? (url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/) || [])[1] : undefined);

const devEnv = readEnvFile('.env.dev');
const prodEnv = readEnvFile('.env.prod');

export const SUPABASE_URL = process.env.E2E_SUPABASE_URL || devEnv.VITE_SUPABASE_URL;
export const ANON_KEY = process.env.E2E_SUPABASE_ANON_KEY || devEnv.VITE_SUPABASE_ANON_KEY;
export const PROJECT_REF = projectRef(SUPABASE_URL);

/**
 * Refuse to run against production.
 *
 * The guard deliberately holds NO hardcoded project ref - this repo is public. It
 * asks a relative question instead: "is the target the same project `.env.prod`
 * points at?" That stays correct if the projects are ever renamed or rotated, and
 * it leaks nothing.
 *
 * These tests write real rows (they create a user and an attempt), so running them
 * against prod would put junk in the live database. Fail loudly rather than guess.
 */
export function assertNotProduction() {
  if (!SUPABASE_URL) {
    throw new Error(
      'e2e: no Supabase target. Expected platform/.env.dev to exist, or E2E_SUPABASE_URL to be set.',
    );
  }
  const prodRef = projectRef(prodEnv.VITE_SUPABASE_URL);
  if (prodRef && PROJECT_REF === prodRef) {
    throw new Error(
      `e2e: REFUSING TO RUN — the target project (${PROJECT_REF}) is the one .env.prod points at.\n` +
      'These tests create users and attempts. Point .env.dev at a development project first.',
    );
  }
  if (!ANON_KEY) {
    throw new Error('e2e: missing anon key. Expected VITE_SUPABASE_ANON_KEY in .env.dev.');
  }
}

/**
 * Service-role key, needed only to create and delete the throwaway fixture user.
 *
 * Never committed. Read from E2E_SERVICE_ROLE_KEY if set, otherwise borrowed from the
 * Supabase CLI's keychain entry via the Management API (macOS developer machines).
 */
let cachedServiceKey;
export async function serviceRoleKey() {
  if (cachedServiceKey) return cachedServiceKey;
  if (process.env.E2E_SERVICE_ROLE_KEY) {
    cachedServiceKey = process.env.E2E_SERVICE_ROLE_KEY;
    return cachedServiceKey;
  }
  const token = managementToken();
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/api-keys?reveal=true`, {
    headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'ieltscore-e2e' },
  });
  if (!res.ok) throw new Error(`e2e: could not read API keys (HTTP ${res.status})`);
  const keys = await res.json();
  const found = keys.find((k) => k.name === 'service_role');
  if (!found) throw new Error('e2e: no service_role key returned for this project');
  cachedServiceKey = found.api_key;
  return cachedServiceKey;
}

/**
 * Supabase Management API token. Set E2E_SUPABASE_ACCESS_TOKEN in CI; on a developer
 * machine it is taken from the Supabase CLI login already in the keychain.
 * go-keyring stores it base64-prefixed, which is easy to miss - hence the strip.
 */
export function managementToken() {
  if (process.env.E2E_SUPABASE_ACCESS_TOKEN) return process.env.E2E_SUPABASE_ACCESS_TOKEN;
  try {
    const raw = execFileSync('security',
      ['find-generic-password', '-s', 'Supabase CLI', '-a', 'supabase', '-w'],
      { encoding: 'utf8' }).trim();
    return raw.startsWith('go-keyring-base64:')
      ? Buffer.from(raw.slice('go-keyring-base64:'.length), 'base64').toString('utf8')
      : raw;
  } catch {
    throw new Error(
      'e2e: no Supabase access token. Run `supabase login`, or set E2E_SUPABASE_ACCESS_TOKEN.',
    );
  }
}
