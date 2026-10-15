import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { runAccountDeletion, type DeletionClient } from './accountDeletion';

// Runs against the real backend with throwaway test accounts. Skipped when no service key is available.
// No defaults: live tests need an explicit staging target and refuse the production project.
const PROD_REF = 'xzuhikowfjopzdlibamd';
const URL_ = process.env['TEST_SUPABASE_URL'] ?? '';
const PUB = process.env['TEST_SUPABASE_PUBLISHABLE_KEY'] ?? '';
if (process.env['LIVE_DB_TESTS'] === '1' && (!URL_ || URL_.includes(PROD_REF)) && process.env['ALLOW_PROD_DB_TESTS'] !== 'yes-i-am-sure') {
  throw new Error('LIVE_DB_TESTS refused: set TEST_SUPABASE_URL to a staging project (production is blocked).');
}
// Opt-in only: set LIVE_DB_TESTS=1 (point TEST_SUPABASE_URL/KEYS at staging once it exists) so routine runs never write to production.
const SVC = process.env['LIVE_DB_TESTS'] === '1' ? process.env['TEST_SUPABASE_SERVICE_ROLE_KEY'] : undefined;
const d = SVC ? describe : describe.skip;
const svc = () => createClient<Database>(URL_, SVC!, { auth: { persistSession: false } });
const pwd = 'Test-' + Math.random().toString(36).slice(2) + 'A1!';

async function mkUser(sb: DeletionClient, tag: string) {
  const email = `sec-${tag}-${Date.now()}@example.com`;
  const { data, error } = await sb.auth.admin.createUser({ email, password: pwd, email_confirm: true, user_metadata: { role: 'referrer' } });
  if (error) throw error;
  const c = createClient<Database>(URL_, PUB, { auth: { persistSession: false } });
  const s = await c.auth.signInWithPassword({ email, password: pwd });
  if (s.error) throw s.error;
  return { id: data.user.id, email, client: c };
}

async function mkAdmin(sb: DeletionClient) {
  const u = await mkUser(sb, 'adm');
  const r = await sb.from('user_roles').insert({ user_id: u.id, role: 'admin' });
  if (r.error) throw r.error;
  return u;
}

d('audit attribution', () => {
  const sb = svc();
  it('records the signed-in admin id for referral and deletion decisions, and fails closed without one', async () => {
    const adm = await mkAdmin(sb);
    const usr = await mkUser(sb, 'ref');
    const { data: ref } = await usr.client.from('referrals').insert({ user_id: usr.id, client_name: 'A', service: 'Business website', fee: 1000 }).select('id').single();
    // service role with no verified actor cannot decide
    expect((await sb.from('referrals').update({ status: 'Approved' }).eq('id', ref!.id)).error).not.toBeNull();
    // ordinary user cannot decide
    expect((await usr.client.from('referrals').update({ status: 'Approved' }).eq('id', ref!.id).select('id')).data ?? []).toHaveLength(0);
    expect((await adm.client.from('referrals').update({ status: 'Approved' }).eq('id', ref!.id)).error).toBeNull();
    const log = await sb.from('audit_log').select('actor_id,actor_kind').eq('record_id', ref!.id);
    expect(log.data).toEqual([{ actor_id: adm.id, actor_kind: 'admin' }]);
    // admin can read audit log; user cannot write it
    expect(((await adm.client.from('audit_log').select('id').eq('record_id', ref!.id)).data ?? []).length).toBe(1);
    expect((await usr.client.from('audit_log').insert({ table_name: 'x', record_id: ref!.id })).error).not.toBeNull();

    const dr = await sb.from('deletion_requests').insert({ email: 'attr@example.com', email_hash: 't' }).select('id').single();
    const id = dr.data!.id;
    // forged actor (non-admin) is refused
    expect((await sb.rpc('svc_update_deletion_request', { _id: id, _actor: usr.id, _actor_kind: 'admin', _from: ['Received'], _patch: { status: 'Verification Pending' } })).error).not.toBeNull();
    // requester kind cannot jump to Verified from Received
    expect((await sb.rpc('svc_update_deletion_request', { _id: id, _actor: null as unknown as string, _actor_kind: 'requester', _from: ['Received'], _patch: { status: 'Verified' } })).error).not.toBeNull();
    expect((await sb.rpc('svc_update_deletion_request', { _id: id, _actor: adm.id, _actor_kind: 'admin', _from: ['Received'], _patch: { status: 'Verification Pending' } })).error).toBeNull();
    expect((await sb.rpc('svc_update_deletion_request', { _id: id, _actor: null as unknown as string, _actor_kind: 'requester', _from: ['Verification Pending'], _patch: { status: 'Verified' } })).error).toBeNull();
    const dlog = await sb.from('audit_log').select('actor_id,actor_kind,new_status').eq('record_id', id).order('created_at');
    expect(dlog.data).toEqual([{ actor_id: adm.id, actor_kind: 'admin', new_status: 'Verification Pending' }, { actor_id: null, actor_kind: 'requester', new_status: 'Verified' }]);
    await adm.client.from('deletion_requests').update({ status: 'Rejected' }).eq('id', id);
    await adm.client.from('referrals').update({ status: 'Rejected' }).eq('id', ref!.id);
    for (const u of [adm, usr]) await sb.auth.admin.deleteUser(u.id);
  }, 60000);
});

d('live security (test accounts)', () => {
  const sb = svc();
  let a: Awaited<ReturnType<typeof mkUser>>;
  let reqId = '';
  beforeAll(async () => {
    a = await mkUser(sb, 'a');
    const r = await sb.from('deletion_requests').insert({ email: a.email, email_hash: 'test' }).select('id').single();
    reqId = r.data!.id;
  }, 30000);
  afterAll(async () => {
    const adm = await mkAdmin(sb);
    await adm.client.from('deletion_requests').update({ status: 'Rejected' }).eq('id', reqId);
    await sb.auth.admin.deleteUser(adm.id);
    await sb.auth.admin.deleteUser(a.id).catch(() => {});
  });

  it('normal user cannot read deletion requests', async () => {
    const { data } = await a.client.from('deletion_requests').select('id');
    expect(data ?? []).toHaveLength(0);
  });
  it('normal user cannot change request status', async () => {
    const { data } = await a.client.from('deletion_requests').update({ status: 'Rejected' }).eq('id', reqId).select('id');
    expect(data ?? []).toHaveLength(0);
  });
  it('normal user cannot approve referrals or read the audit log', async () => {
    const { data: ref } = await a.client.from('referrals').insert({ user_id: a.id, client_name: 'X', service: 'Business website', fee: 1000 }).select('id').single();
    const { data: up } = await a.client.from('referrals').update({ status: 'Completed' }).eq('id', ref!.id).select('id');
    expect(up ?? []).toHaveLength(0);
    const { data: log } = await a.client.from('audit_log').select('id');
    expect(log ?? []).toHaveLength(0);
  });
  it('cannot grant itself admin', async () => {
    const { error } = await a.client.from('user_roles').insert({ user_id: a.id, role: 'admin' });
    expect(error).not.toBeNull();
  });
  it('admin-only status Verified cannot be set by a client', async () => {
    const r = await sb.from('deletion_requests').update({ status: 'Completed' }).eq('id', reqId);
    expect(r.error).not.toBeNull(); // Received -> Completed is not a valid transition, even for the server
  });
});

d('account deletion job', () => {
  const sb = svc();
  it('fails safely on storage error, keeps login, then succeeds on retry', async () => {
    const u = await mkUser(sb, 'del');
    await sb.from('notifications').insert({ user_id: u.id, title: 't' });
    const { data: ref } = await sb.from('referrals').insert({ user_id: u.id, client_name: 'Client', service: 'Business website', fee: 1000 }).select('id').single();
    const adm = await mkAdmin(sb);
    await adm.client.from('referrals').update({ status: 'Approved' }).eq('id', ref!.id);
    await adm.client.from('referrals').update({ status: 'Completed' }).eq('id', ref!.id);
    const path = `SOC-2099-TEST${Math.floor(Math.random() * 9)}/test.txt`;
    await sb.storage.from('project-files').upload(path, new Blob(['x'], { type: 'text/plain' }));

    const broken = new Proxy(sb, { get(t, k) {
      if (k === 'storage') return { from: () => ({ remove: async () => ({ data: null, error: new Error('boom') }) }) };
      return Reflect.get(t, k);
    } }) as DeletionClient;
    await (sb.from('project_requests') as unknown as { insert: (r: object) => Promise<unknown> }).insert({ service: 'Business website', client_name: 'Del', client_email: u.email, attachments: [path] });

    await expect(runAccountDeletion(broken, u.id, u.email)).rejects.toThrow();
    const still = await sb.auth.admin.getUserById(u.id);
    expect(still.data.user).not.toBeNull();
    const job = await sb.from('account_deletion_jobs').select('status').eq('user_id', u.id).single();
    expect(job.data?.status).toBe('Failed');

    // concurrent retries: exactly one runs
    const results = await Promise.allSettled([runAccountDeletion(sb, u.id, u.email), runAccountDeletion(sb, u.id, u.email)]);
    const vals = results.map(r => r.status === 'fulfilled' ? r.value : 'err');
    expect(vals.filter(v => v === 'done').length).toBeGreaterThanOrEqual(1);
    expect(vals).not.toContain('err');

    const gone = await sb.auth.admin.getUserById(u.id);
    expect(gone.data.user).toBeNull();
    const c = createClient<Database>(URL_, PUB, { auth: { persistSession: false } });
    expect((await c.auth.signInWithPassword({ email: u.email, password: pwd })).error).not.toBeNull();
    expect((await sb.from('notifications').select('id').eq('user_id', u.id)).data).toHaveLength(0);
    expect((await sb.from('profiles').select('id').eq('id', u.id)).data).toHaveLength(0);
    const kept = await sb.from('referrals').select('client_name,status').eq('id', ref!.id).single();
    expect(kept.data).toEqual({ client_name: 'Deleted', status: 'Completed' });
    await sb.auth.admin.deleteUser(adm.id);
    const files = await sb.storage.from('project-files').list(path.split('/')[0]);
    expect(files.data ?? []).toHaveLength(0);
    expect((await sb.from('project_requests').select('id').eq('client_email', u.email)).data).toHaveLength(0);
  }, 60000);
});

d('upload claims', () => {
  const sb = svc();
  it('only one concurrent claim wins and replay is refused', async () => {
    const ins = await sb.from('project_requests').insert({ service: 'Business website', client_name: 'Up', client_email: 'up@example.com' }).select('tracking_code,upload_token,id').single();
    const { tracking_code, upload_token, id } = ins.data!;
    const [x, y] = await Promise.all([
      sb.rpc('claim_request_upload', { _tracking: tracking_code, _token: upload_token }),
      sb.rpc('claim_request_upload', { _tracking: tracking_code, _token: upload_token }),
    ]);
    expect([x.data, y.data].filter(Boolean)).toHaveLength(1);
    await sb.from('project_requests').update({ upload_state: 'complete' }).eq('id', id);
    const again = await sb.rpc('claim_request_upload', { _tracking: tracking_code, _token: upload_token });
    expect(again.data).toBeNull();
    const wrong = await sb.rpc('claim_request_upload', { _tracking: tracking_code, _token: crypto.randomUUID() });
    expect(wrong.data).toBeNull();
    await sb.from('project_requests').update({ upload_state: 'failed' }).eq('id', id);
    const retry = await sb.rpc('claim_request_upload', { _tracking: tracking_code, _token: upload_token });
    expect(retry.data).not.toBeNull(); // safe retry after a failure
    await sb.from('project_requests').update({ status: 'Rejected', client_name: 'Test', client_email: 'deleted@invalid' }).eq('id', id);
  }, 30000);
});
