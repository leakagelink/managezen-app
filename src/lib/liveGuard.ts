/** Decides whether database-writing tests may run. Production can never be targeted; there is no override. */
export const PROD_REF = 'xzuhikowfjopzdlibamd';

export function liveTestTarget(env: Record<string, string | undefined>):
  | { run: false; reason: string }
  | { run: true; url: string; pub: string; svc: string } {
  if (env['LIVE_DB_TESTS'] !== '1') return { run: false, reason: 'LIVE_DB_TESTS not set' };
  const url = env['TEST_SUPABASE_URL'] ?? '';
  const pub = env['TEST_SUPABASE_PUBLISHABLE_KEY'] ?? '';
  const svc = env['TEST_SUPABASE_SERVICE_ROLE_KEY'] ?? '';
  let host = '';
  try { host = new URL(url).hostname.toLowerCase(); } catch { /* invalid */ }
  if (!host) throw new Error('LIVE_DB_TESTS refused: TEST_SUPABASE_URL missing or invalid.');
  if (host.includes(PROD_REF) || [pub, svc].some(k => k.includes(PROD_REF))) {
    throw new Error('LIVE_DB_TESTS refused: production backend can never be targeted.');
  }
  if (!pub || !svc) throw new Error('LIVE_DB_TESTS refused: staging keys missing.');
  return { run: true, url, pub, svc };
}
