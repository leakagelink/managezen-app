import { createServerFn } from '@tanstack/react-start';
import { getRequestHeader } from '@tanstack/react-start/server';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { MAX_FILES, checkFile, safeFileName } from './uploadRules';
import { SITE_URL } from './socilet';
import { runAccountDeletion, must, type DeletionClient } from './accountDeletion';

type Admin = typeof import('@/integrations/supabase/client.server')['supabaseAdmin'];
const admin = async (): Promise<Admin> => (await import('@/integrations/supabase/client.server')).supabaseAdmin;

async function sha256(s: string) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('');
}

/* ---------------- Uploads ---------------- */

/** Uploads client attachments after an atomic claim on the request's one-time upload token. */
export const uploadRequestFiles = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => {
    if (!(d instanceof FormData)) throw new Error('Invalid upload');
    const tracking = String(d.get('tracking') ?? '');
    const token = String(d.get('token') ?? '');
    if (!/^SOC-\d{4}-[A-Z0-9]{5}$/.test(tracking) || !/^[0-9a-f-]{36}$/i.test(token)) throw new Error('Invalid upload');
    const files = d.getAll('files').filter((f): f is File => f instanceof File);
    if (!files.length || files.length > MAX_FILES) throw new Error('Upload 1 to 5 files');
    for (const f of files) { const e = checkFile(f.name, f.type, f.size); if (e) throw new Error(e); }
    return { tracking, token, files };
  })
  .handler(async ({ data }) => {
    const sb = await admin();
    const { data: claim } = await sb.rpc('claim_request_upload', { _tracking: data.tracking, _token: data.token });
    if (!claim) throw new Error('Upload not allowed for this request');
    const prefix = `${data.tracking}/${String(claim).slice(0, 8)}`;
    const paths: string[] = [];
    let failed = false;
    for (const f of data.files) {
      const path = `${prefix}/${crypto.randomUUID().slice(0, 8)}-${safeFileName(f.name)}`;
      const { error } = await sb.storage.from('project-files').upload(path, f, { contentType: f.type, upsert: false });
      if (error) { failed = true; break; }
      paths.push(path);
    }
    // Verify every object really exists before associating it.
    if (!failed) {
      const { data: listed, error } = await sb.storage.from('project-files').list(prefix, { limit: 10 });
      const names = new Set((listed ?? []).map(o => `${prefix}/${o.name}`));
      failed = !!error || paths.some(p => !names.has(p));
    }
    if (!failed) {
      const { data: done, error } = await sb.from('project_requests')
        .update({ attachments: paths, upload_state: 'complete' })
        .eq('tracking_code', data.tracking).eq('upload_claim', claim).eq('upload_state', 'claimed').select('id');
      failed = !!error || !done?.length;
    }
    if (failed) {
      if (paths.length) await sb.storage.from('project-files').remove(paths);
      await sb.from('project_requests').update({ upload_state: 'failed' }).eq('tracking_code', data.tracking).eq('upload_claim', claim);
      throw new Error('Upload failed. You can retry.');
    }
    return { uploaded: paths.length };
  });

export const deleteMyAccount = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { confirm: string }) => {
    if (d?.confirm !== 'DELETE') throw new Error('Type DELETE to confirm');
    return d;
  })
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
    if (isAdmin) throw new Error('Admin accounts must be removed by Socilet directly.');
    const sb = await admin();
    const { data: u } = await sb.auth.admin.getUserById(context.userId);
    const r = await runAccountDeletion(sb, context.userId, u.user?.email ?? '');
    if (r === 'busy') throw new Error('A deletion is already in progress. Please wait a few minutes.');
    return { ok: true };
  });

/* ---------------- Public deletion requests ---------------- */

const GENERIC = 'If this email is registered, we will contact it to verify the request.';

async function limited(sb: Admin, bucket: string, key: string, max: number, hours: number) {
  const since = new Date(Date.now() - hours * 3600_000).toISOString();
  const { count } = await sb.from('rate_limits').select('id', { count: 'exact', head: true }).eq('bucket', bucket).eq('key_hash', key).gte('created_at', since);
  if ((count ?? 0) >= max) return true;
  await sb.from('rate_limits').insert({ bucket, key_hash: key });
  return false;
}

export const requestDeletion = createServerFn({ method: 'POST' })
  .inputValidator((d: { email: string; reason?: string }) => {
    const email = String(d?.email ?? '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 255) throw new Error('Enter a valid email address.');
    return { email, reason: String(d?.reason ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 500) };
  })
  .handler(async ({ data }) => {
    const sb = await admin();
    await sb.rpc('purge_expired_records');
    const ip = getRequestHeader('cf-connecting-ip') || getRequestHeader('x-forwarded-for')?.split(',')[0] || 'unknown';
    const ipHash = await sha256('ip:' + ip.trim());
    const emailHash = await sha256('em:' + data.email);
    if (await limited(sb, 'del-ip', ipHash, 5, 1) || await limited(sb, 'del-email', emailHash, 3, 24)) {
      throw new Error('Too many requests. Please try again later.');
    }
    const { data: open } = await sb.from('deletion_requests').select('request_no').eq('email_hash', emailHash).not('status', 'in', '(Completed,Rejected)').limit(1);
    if (!open?.length) {
      const ins = await sb.from('deletion_requests').insert({ email: data.email, email_hash: emailHash, reason: data.reason }).select('request_no').single();
      if (ins.error) throw new Error('Could not submit the request. Please try again.');
    }
    return { message: GENERIC };
  });

/** Public: the email owner opens the verification link that Socilet sent to them. */
export const verifyDeletion = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string; token: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(d?.id ?? '') || !/^[A-Za-z0-9_-]{32,64}$/.test(d?.token ?? '')) throw new Error('Invalid or expired link.');
    return d;
  })
  .handler(async ({ data }) => {
    const sb = await admin();
    const { data: r } = await sb.from('deletion_requests').select('id,status,verify_hash,verify_expires_at').eq('id', data.id).maybeSingle();
    const ok = r && r.status === 'Verification Pending' && r.verify_hash === await sha256(data.token)
      && r.verify_expires_at && new Date(r.verify_expires_at).getTime() > Date.now();
    if (!ok) throw new Error('Invalid or expired link.');
    const u = await updReq(sb, data.id, null, 'requester', ['Verification Pending'], { status: 'Verified', verified_at: new Date().toISOString(), verify_hash: null }).catch(() => []);
    if (!u.length) throw new Error('Could not verify. Please try again.');
    return { ok: true };
  });

/** Applies a deletion-request change in one DB transaction, attributed to a server-verified actor. */
async function updReq(sb: Admin, id: string, actor: string | null, kind: 'admin' | 'requester', from: string[], patch: Record<string, string | null>) {
  const { data, error } = await sb.rpc('svc_update_deletion_request', { _id: id, _actor: actor as string, _actor_kind: kind, _from: from, _patch: patch });
  if (error) throw new Error('step:update-request');
  return (data ?? []) as Array<{ email: string; request_no: string | null }>;
}

/* ---------------- Admin deletion workflow ---------------- */

async function requireAdmin(ctx: { supabase: { rpc: (fn: 'has_role', args: { _user_id: string; _role: 'admin' }) => PromiseLike<{ data: boolean | null }> }; userId: string }) {
  const { data } = await ctx.supabase.rpc('has_role', { _user_id: ctx.userId, _role: 'admin' });
  if (!data) throw new Error('Forbidden');
}

/** Admin: creates a 48-hour verification link to email to the requester from the support inbox. */
export const startDeletionVerification = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => { if (!/^[0-9a-f-]{36}$/i.test(d?.id ?? '')) throw new Error('Invalid'); return d; })
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const sb = await admin();
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const token = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const rows = await updReq(sb, data.id, context.userId, 'admin', ['Received', 'Verification Pending'],
      { status: 'Verification Pending', verify_hash: await sha256(token), verify_expires_at: new Date(Date.now() + 48 * 3600_000).toISOString() }).catch(() => []);
    const row = rows[0]; const error = !row;
    if (error || !row) throw new Error('This request cannot be verified in its current status.');
    return { email: row.email, requestNo: row.request_no, link: `${SITE_URL}/delete-account?r=${data.id}&t=${token}` };
  });

/** Admin: processes a Verified request. Completed only after the deletion job really finished. */
export const processDeletionRequest = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => { if (!/^[0-9a-f-]{36}$/i.test(d?.id ?? '')) throw new Error('Invalid'); return d; })
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const sb = await admin();
    const r = (await updReq(sb, data.id, context.userId, 'admin', ['Verified'], { status: 'Processing' }).catch(() => []))[0];
    if (!r) throw new Error('Only verified requests can be processed (or it is already processing).');
    try {
      const { data: uid } = await sb.rpc('find_user_id_by_email', { _email: r.email });
      if (uid) {
        const { data: isAdm } = await sb.from('user_roles').select('id').eq('user_id', String(uid)).eq('role', 'admin');
        if (isAdm?.length) throw new Error('Admin accounts cannot be deleted here.');
        const res = await runAccountDeletion(sb, String(uid), r.email);
        if (res !== 'done') throw new Error('Deletion already running. Retry shortly.');
      } else {
        // No account: still remove project data and files tied to the email.
        const reqs = must(await sb.from('project_requests').select('attachments').eq('client_email', r.email), 'files').data ?? [];
        const files = reqs.flatMap(x => (Array.isArray(x.attachments) ? (x.attachments as string[]) : []));
        if (files.length) must(await sb.storage.from('project-files').remove(files), 'files');
        must(await sb.from('project_requests').update({ client_name: 'Deleted user', client_email: 'deleted@invalid', client_phone: '', requirements: '', attachments: [] }).eq('client_email', r.email), 'requests');
        must(await sb.from('projects').update({ customer_email: '', customer_id: null }).eq('customer_email', r.email), 'projects');
      }
      if (!(await updReq(sb, data.id, context.userId, 'admin', ['Processing'], { status: 'Completed', completed_at: new Date().toISOString(), email: 'redacted@invalid', reason: '' })).length) throw new Error('step:complete');
      return { ok: true };
    } catch (e) {
      await updReq(sb, data.id, context.userId, 'admin', ['Processing'], { status: 'Verified' }).catch(() => []);
      throw new Error(e instanceof Error && !e.message.startsWith('step:') ? e.message : 'Deletion failed; the request is back to Verified so you can retry.');
    }
  });
