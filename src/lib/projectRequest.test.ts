import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { submitProjectRequestCore, cleanProjectRequest, PROJECT_REQUEST_LIMITS } from './projectRequest';
import type { RpcFn } from './rateLimit';

/** Simulated DB: consume_rate_limit behaves atomically (counts per bucket:key); submit returns a row. */
function fakeDb(opts: { limiterError?: boolean; submitError?: string } = {}) {
  const counts = new Map<string, number>(); let submits = 0;
  const rpc: RpcFn = async (fn, a: any) => {
    if (fn === 'consume_rate_limit') {
      if (opts.limiterError) return { data: null, error: { message: 'relation does not exist' } };
      const k = a._bucket + ':' + a._key; const n = counts.get(k) ?? 0;
      if (n >= a._max) return { data: false, error: null };
      counts.set(k, n + 1); return { data: true, error: null };
    }
    if (opts.submitError) return { data: null, error: { message: opts.submitError } };
    submits++; return { data: [{ tracking_code: 'SOC-2026-T' + submits, upload_token: 'tok' + submits }], error: null };
  };
  return { rpc, submits: () => submits };
}
const input = cleanProjectRequest({ code: 'OFF-1', name: 'Asha', email: 'A@x.in', phone: '', country: 'in', requirements: 'Need a website please' });

describe('project request rate limit (simulated DB)', () => {
  it('allows a normal request and returns tracking + upload token', async () => {
    const db = fakeDb();
    expect(await submitProjectRequestCore(db.rpc, input, 'ip1', 'em1')).toEqual({ ok: true, tracking: 'SOC-2026-T1', uploadToken: 'tok1' });
  });
  it('blocks after the per-IP hourly limit', async () => {
    const db = fakeDb();
    for (let i = 0; i < PROJECT_REQUEST_LIMITS.ipPerHour; i++) expect((await submitProjectRequestCore(db.rpc, input, 'ip', 'e' + i)).ok).toBe(true);
    expect(await submitProjectRequestCore(db.rpc, input, 'ip', 'new')).toEqual({ ok: false, reason: 'limited' });
  });
  it('blocks after the per-email daily limit from different IPs', async () => {
    const db = fakeDb();
    for (let i = 0; i < PROJECT_REQUEST_LIMITS.emailPerDay; i++) await submitProjectRequestCore(db.rpc, input, 'ip' + i, 'em');
    expect(await submitProjectRequestCore(db.rpc, input, 'ipX', 'em')).toEqual({ ok: false, reason: 'limited' });
  });
  it('concurrent burst from one IP creates at most the limit', async () => {
    const db = fakeDb();
    const r = await Promise.all(Array.from({ length: 30 }, (_, i) => submitProjectRequestCore(db.rpc, input, 'ip', 'e' + i)));
    expect(r.filter(x => x.ok).length).toBe(PROJECT_REQUEST_LIMITS.ipPerHour);
    expect(db.submits()).toBe(PROJECT_REQUEST_LIMITS.ipPerHour);
  });
  it('limiter unavailable → fails closed, nothing submitted', async () => {
    const db = fakeDb({ limiterError: true });
    expect(await submitProjectRequestCore(db.rpc, input, 'ip', 'em')).toEqual({ ok: false, reason: 'limited' });
    expect(db.submits()).toBe(0);
  });
  it('database error is mapped, never leaked', async () => {
    const r = await submitProjectRequestCore(fakeDb({ submitError: 'duplicate key value violates constraint xyz' }).rpc, input, 'ip', 'em');
    expect(r).toEqual({ ok: false, reason: 'unavailable' });
  });
  it('inactive offer gives a friendly reason', async () => {
    expect(await submitProjectRequestCore(fakeDb({ submitError: 'Offer not available' }).rpc, input, 'ip', 'em')).toEqual({ ok: false, reason: 'offer' });
  });
  it('cleans and caps input', () => {
    const c = cleanProjectRequest({ name: ' x\u0000y ', email: ' A@B.CO ', country: 'india', requirements: 'r'.repeat(3000) });
    expect(c.email).toBe('a@b.co'); expect(c.country).toBe('IN'); expect(c.requirements.length).toBe(2000); expect(c.name).toBe('x y');
  });
});

describe('upload retries are not rate limited', () => {
  it('uploadRequestFiles does not use the request limiter', () => {
    const src = readFileSync('src/lib/security.functions.ts', 'utf8');
    const upload = src.slice(src.indexOf('export const uploadRequestFiles'), src.indexOf('export const deleteMyAccount'));
    expect(upload).not.toMatch(/limited\(|isRateLimited|consume_rate_limit/);
    expect(upload).toMatch(/claim_request_upload/);
  });
});
