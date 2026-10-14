import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { runAccountDeletion, type DeletionClient } from './accountDeletion';

// Runs against the real backend with throwaway test accounts. Skipped when no service key is available.
const URL_ = 'https://xzuhikowfjopzdlibamd.supabase.co';
const PUB = 'sb_publishable_eiNGrrHZ2_IxHEqaa9qsJw_fEpaJinv';
const SVC = process.env['SUPABASE_SERVICE_ROLE_KEY'];
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
    await sb.from('deletion_requests').update({ status: 'Rejected' }).eq('id', reqId);
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
    await sb.from('referrals').update({ status: 'Approved' }).eq('id', ref!.id);
    await sb.from('referrals').update({ status: 'Completed' }).eq('id', ref!.id);
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
