import { describe, it, expect } from 'vitest';
import { checkFile, safeFileName } from './uploadRules';
import { canAccess } from './socilet';

// Live checks run against the real backend as an anonymous visitor (publishable key only).
const URL_ = 'https://xzuhikowfjopzdlibamd.supabase.co';
const KEY = 'sb_publishable_eiNGrrHZ2_IxHEqaa9qsJw_fEpaJinv';
const h = { apikey: KEY, 'Content-Type': 'application/json' };
const rpc = (fn: string, body: unknown) => fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: 'POST', headers: h, body: JSON.stringify(body) });

describe('upload rules', () => {
  it('rejects executable files', () => expect(checkFile('x.exe', 'application/octet-stream', 10)).not.toBeNull());
  it('rejects mismatched MIME', () => expect(checkFile('a.png', 'application/pdf', 10)).not.toBeNull());
  it('rejects files over 10 MB', () => expect(checkFile('a.pdf', 'application/pdf', 10 * 1024 * 1024 + 1)).not.toBeNull());
  it('accepts a PDF under 10 MB', () => expect(checkFile('a.pdf', 'application/pdf', 1000)).toBeNull());
  it('strips path traversal', () => expect(safeFileName('../../etc/passwd')).not.toContain('/'));
  it('delete-account page is public', () => expect(canAccess('customer', '/delete-account')).toBe(true));
});

describe('anonymous access is blocked', () => {
  it('cannot upload to project-files', async () => {
    const r = await fetch(`${URL_}/storage/v1/object/project-files/SOC-2026-AAAAA/x.txt`, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'text/plain' }, body: 'x' });
    expect(r.ok).toBe(false);
  });
  it('cannot call attach_request_files', async () => expect((await rpc('attach_request_files', { _tracking_code: 'SOC-2026-AAAAA', _paths: ['a'] })).ok).toBe(false));
  it('cannot read available_payout of any user', async () => expect((await rpc('available_payout', { _user: '00000000-0000-0000-0000-000000000000' })).ok).toBe(false));
  it('cannot read project requests', async () => {
    const r = await fetch(`${URL_}/rest/v1/project_requests?select=client_email`, { headers: h });
    expect(r.ok ? (await r.json()).length : 0).toBe(0);
  });
  it('cannot read deletion requests or audit log', async () => {
    for (const t of ['deletion_requests', 'audit_log']) {
      const r = await fetch(`${URL_}/rest/v1/${t}?select=id`, { headers: h });
      expect(r.ok ? (await r.json()).length : 0).toBe(0);
    }
  });
  it('cannot approve offers', async () => {
    const r = await fetch(`${URL_}/rest/v1/offers?status=eq.Pending%20approval`, { method: 'PATCH', headers: { ...h, Prefer: 'return=representation' }, body: JSON.stringify({ status: 'Active' }) });
    expect(r.ok ? (await r.json()).length : 0).toBe(0);
  });
  it('cannot assign roles', async () => {
    const r = await fetch(`${URL_}/rest/v1/user_roles`, { method: 'POST', headers: h, body: JSON.stringify({ user_id: '00000000-0000-0000-0000-000000000000', role: 'admin' }) });
    expect(r.ok).toBe(false);
  });
});
