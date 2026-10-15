import { describe, it, expect } from 'vitest';
import { isIPv4, isIPv6, trustedClientIp } from './clientIp';
import { isRateLimited } from './rateLimit';
import { liveTestTarget, PROD_REF } from './liveGuard';
import { runAccountDeletion, type DeletionClient } from './accountDeletion';

describe('IP validation', () => {
  it.each(['203.0.113.7', '0.0.0.0', '255.255.255.255'])('accepts IPv4 %s', ip => expect(isIPv4(ip)).toBe(true));
  it.each(['256.1.1.1', '1.2.3', '01.2.3.4', '1.2.3.4.5', '1..2.3', 'a.b.c.d'])('rejects IPv4 %s', ip => expect(isIPv4(ip)).toBe(false));
  it.each(['2001:db8::1', '::1', '::', 'fe80::1:2:3:4', '2001:0db8:0000:0000:0000:ff00:0042:8329', '::ffff:192.0.2.1'])('accepts IPv6 %s', ip => expect(isIPv6(ip)).toBe(true));
  it.each(['2001:db8:::1', '1::2::3', '12345::1', '1:2:3:4:5:6:7:8:9', 'g::1', '::ffff:999.0.2.1', '1:2:3:4:5:6:7'])('rejects IPv6 %s', ip => expect(isIPv6(ip)).toBe(false));
  it('ignores x-forwarded-for even when valid', () => expect(trustedClientIp(n => (n === 'x-forwarded-for' ? '1.2.3.4' : undefined))).toBe('untrusted'));
  it('rejects malformed cf-connecting-ip', () => expect(trustedClientIp(() => '1.2.3.4.5')).toBe('untrusted'));
});

describe('atomic rate limit fails closed', () => {
  it('allowed when db returns true', async () => expect(await isRateLimited(async () => ({ data: true, error: null }), 'b', 'k', 5, 1)).toBe(false));
  it('limited when db returns false', async () => expect(await isRateLimited(async () => ({ data: false, error: null }), 'b', 'k', 5, 1)).toBe(true));
  it('limited on db error', async () => expect(await isRateLimited(async () => ({ data: null, error: { message: 'x' } }), 'b', 'k', 5, 1)).toBe(true));
  it('limited on thrown error', async () => expect(await isRateLimited(async () => { throw new Error('net'); }, 'b', 'k', 5, 1)).toBe(true));
  it('limited on unexpected reply', async () => expect(await isRateLimited(async () => ({ data: 'yes', error: null }), 'b', 'k', 5, 1)).toBe(true));
});

describe('live test guard', () => {
  const ok = { LIVE_DB_TESTS: '1', TEST_SUPABASE_URL: 'https://stagingref.supabase.co', TEST_SUPABASE_PUBLISHABLE_KEY: 'p', TEST_SUPABASE_SERVICE_ROLE_KEY: 's' };
  it('skips when not opted in', () => expect(liveTestTarget({}).run).toBe(false));
  it('refuses production URL', () => expect(() => liveTestTarget({ ...ok, TEST_SUPABASE_URL: `https://${PROD_REF}.supabase.co` })).toThrow(/production/));
  it('old override no longer works', () => expect(() => liveTestTarget({ ...ok, TEST_SUPABASE_URL: `https://${PROD_REF}.supabase.co`, ALLOW_PROD_DB_TESTS: 'yes-i-am-sure' })).toThrow(/production/));
  it('refuses missing URL', () => expect(() => liveTestTarget({ LIVE_DB_TESTS: '1' })).toThrow());
  it('refuses missing keys', () => expect(() => liveTestTarget({ ...ok, TEST_SUPABASE_SERVICE_ROLE_KEY: '' })).toThrow());
  it('allows a staging target', () => expect(liveTestTarget(ok).run).toBe(true));
});

type Opts = { failJob?: (p: any) => boolean; claim?: boolean; removeError?: boolean; files?: string[] };
function fake(o: Opts = {}) {
  const calls: string[] = [];
  const from = (table: string) => {
    let op = 'select'; let payload: any;
    const b: any = {
      select: () => b, eq: () => b, in: () => b, maybeSingle: () => b,
      update: (p: any) => { op = 'update'; payload = p; return b; },
      delete: () => { op = 'delete'; return b; },
      then: (r: any) => {
        calls.push(`${table}:${op}:${payload?.step ?? payload?.status ?? ''}`);
        const err = table === 'account_deletion_jobs' && op === 'update' && o.failJob?.(payload);
        const data = table === 'project_requests' && op === 'select' ? [{ id: '1', attachments: o.files ?? [] }] : table === 'account_deletion_jobs' && op === 'select' ? { status: 'Running' } : [];
        return Promise.resolve({ data, error: err ? { message: 'x' } : null }).then(r);
      },
    };
    return b;
  };
  const sb: any = {
    rpc: async () => ({ data: o.claim ?? true, error: null }), from,
    storage: { from: () => ({ remove: async () => { calls.push('remove'); return { error: o.removeError ? { message: 'partial' } : null }; } }) },
    auth: { admin: {
      updateUserById: async () => { calls.push('ban'); return { error: null }; },
      deleteUser: async () => { calls.push('deleteUser'); return { error: null }; },
    } },
  };
  return { sb: sb as DeletionClient, calls };
}

describe('account deletion failure paths', () => {
  it('progress-write failure mid-job stops before the login is deleted', async () => {
    const f = fake({ failJob: p => p?.step === 'records' });
    await expect(runAccountDeletion(f.sb, 'u', 'a@b.co')).rejects.toThrow(/retry/);
    expect(f.calls).not.toContain('deleteUser');
    expect(f.calls).not.toContain('profiles:delete:');
  });
  it('failure to record Failed status still throws and never deletes the login', async () => {
    const f = fake({ failJob: p => p?.step === 'files' || p?.status === 'Failed' });
    await expect(runAccountDeletion(f.sb, 'u', 'a@b.co')).rejects.toThrow(/retry/);
    expect(f.calls).toContain('account_deletion_jobs:update:Failed');
    expect(f.calls).not.toContain('deleteUser');
  });
  it('partial storage cleanup error keeps login and records Failed', async () => {
    const f = fake({ files: ['r/1.png', 'r/2.png'], removeError: true });
    await expect(runAccountDeletion(f.sb, 'u', 'a@b.co')).rejects.toThrow();
    expect(f.calls).toContain('remove');
    expect(f.calls).not.toContain('deleteUser');
    expect(f.calls).toContain('account_deletion_jobs:update:Failed');
  });
  it('retry after a storage failure completes and deletes login last', async () => {
    const f = fake({ files: ['r/1.png'] });
    expect(await runAccountDeletion(f.sb, 'u', 'a@b.co')).toBe('done');
    expect(f.calls.at(-2)).toBe('deleteUser');
  });
  it('job held by another worker (not stale) is not re-run', async () => {
    const f = fake({ claim: false });
    expect(await runAccountDeletion(f.sb, 'u', 'a@b.co')).toBe('busy');
    expect(f.calls).not.toContain('ban');
  });
});
