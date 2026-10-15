import { describe, it, expect } from 'vitest';
import { trustedClientIp } from './clientIp';
import { runAccountDeletion, type DeletionClient } from './accountDeletion';

describe('trusted client IP', () => {
  const h = (m: Record<string, string>) => (n: string) => m[n];
  it('uses cf-connecting-ip', () => expect(trustedClientIp(h({ 'cf-connecting-ip': '203.0.113.7' }))).toBe('203.0.113.7'));
  it('ignores spoofable x-forwarded-for', () => expect(trustedClientIp(h({ 'x-forwarded-for': '1.2.3.4' }))).toBe('untrusted'));
  it('rejects garbage header values', () => expect(trustedClientIp(h({ 'cf-connecting-ip': 'evil<script>' }))).toBe('untrusted'));
});

/** Minimal fake client: every query resolves to { error } chosen per table/op. */
function fake(failOn: (table: string, op: string, payload?: any) => boolean) {
  const calls: string[] = [];
  const q = (table: string) => {
    let op = 'select'; let payload: any;
    const b: any = {
      select: () => b, eq: () => b, in: () => b, maybeSingle: () => b,
      update: (p: any) => { op = 'update'; payload = p; return b; },
      delete: () => { op = 'delete'; return b; },
      then: (r: any) => { calls.push(`${table}:${op}:${payload?.step ?? payload?.status ?? ''}`); return Promise.resolve({ data: [], error: failOn(table, op, payload) ? { message: 'x' } : null }).then(r); },
    };
    return b;
  };
  const sb: any = {
    rpc: async () => ({ data: true, error: null }), from: q,
    storage: { from: () => ({ remove: async () => ({ error: null }) }) },
    auth: { admin: {
      updateUserById: async () => { calls.push('ban'); return { error: null }; },
      deleteUser: async () => { calls.push('deleteUser'); return { error: null }; },
    } },
  };
  return { sb: sb as DeletionClient, calls };
}

describe('account deletion progress writes', () => {
  it('stops before deleting the login when a progress update fails', async () => {
    const { sb, calls } = fake((t, op, p) => t === 'account_deletion_jobs' && op === 'update' && p?.step === 'login');
    await expect(runAccountDeletion(sb, 'u1', 'a@b.co')).rejects.toThrow();
    expect(calls).not.toContain('deleteUser');
    expect(calls).toContain('account_deletion_jobs:update:Failed');
  });
  it('stops before any work when the first progress write fails', async () => {
    const { sb, calls } = fake((t, op, p) => t === 'account_deletion_jobs' && p?.step === 'block-login');
    await expect(runAccountDeletion(sb, 'u1', 'a@b.co')).rejects.toThrow();
    expect(calls).not.toContain('ban');
  });
  it('deletes the login last when everything succeeds', async () => {
    const { sb, calls } = fake(() => false);
    expect(await runAccountDeletion(sb, 'u1', 'a@b.co')).toBe('done');
    expect(calls.indexOf('deleteUser')).toBeGreaterThan(calls.indexOf('profiles:delete:'));
  });
});
