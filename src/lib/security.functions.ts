import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { MAX_FILES, checkFile, safeFileName } from './uploadRules';

/** Uploads client attachments after verifying the one-time upload token issued with the request. */
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
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: req } = await supabaseAdmin.from('project_requests')
      .select('id,upload_token,files_attached,created_at').eq('tracking_code', data.tracking).maybeSingle();
    const fresh = req && Date.now() - new Date(req.created_at).getTime() < 60 * 60 * 1000;
    if (!req || req.upload_token !== data.token || req.files_attached || !fresh) throw new Error('Upload not allowed for this request');
    // Mark first so a second call with the same token cannot attach more files.
    const { data: claimed } = await supabaseAdmin.from('project_requests')
      .update({ files_attached: true }).eq('id', req.id).eq('files_attached', false).select('id');
    if (!claimed?.length) throw new Error('Upload not allowed for this request');
    const paths: string[] = [];
    for (const f of data.files) {
      const path = `${data.tracking}/${crypto.randomUUID().slice(0, 8)}-${safeFileName(f.name)}`;
      const { error } = await supabaseAdmin.storage.from('project-files').upload(path, f, { contentType: f.type, upsert: false });
      if (!error) paths.push(path);
    }
    await supabaseAdmin.from('project_requests').update({ attachments: paths }).eq('id', req.id);
    return { uploaded: paths.length, failed: data.files.length - paths.length };
  });

/**
 * Deletes the signed-in user's own account. Dependency plan:
 * notifications, profile, offers, pending/rejected referrals and payouts are deleted;
 * completed referrals and approved payouts are kept with personal links removed (financial records);
 * projects/requests under the user's email are anonymised and their files removed; finally the login is deleted.
 */
export const deleteMyAccount = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { confirm: string }) => {
    if (d?.confirm !== 'DELETE') throw new Error('Type DELETE to confirm');
    return d;
  })
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const uid = context.userId;
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(uid);
    const email = u.user?.email?.toLowerCase() ?? '';
    const { data: isAdmin } = await supabaseAdmin.from('user_roles').select('id').eq('user_id', uid).eq('role', 'admin');
    if (isAdmin?.length) throw new Error('Admin accounts must be removed by Socilet directly.');

    const steps: Array<PromiseLike<{ error: unknown }>> = [
      supabaseAdmin.from('notifications').delete().eq('user_id', uid),
      supabaseAdmin.from('offers').delete().eq('user_id', uid).neq('status', 'Active'),
      supabaseAdmin.from('referrals').delete().eq('user_id', uid).in('status', ['Pending', 'Rejected', 'Approved']),
      supabaseAdmin.from('payout_requests').delete().eq('user_id', uid).in('status', ['Pending', 'Rejected']),
      supabaseAdmin.from('referrals').update({ client_name: 'Deleted', client_contact: '' }).eq('user_id', uid),
      supabaseAdmin.from('payout_requests').update({ details: '' } as never).eq('user_id', uid),
    ];
    for (const s of steps) await s;
    // Active offers are retired (status change is allowed by the server rules) then removed.
    await supabaseAdmin.from('offers').update({ status: 'Rejected', reason: 'Account deleted' }).eq('user_id', uid).eq('status', 'Active');
    await supabaseAdmin.from('offers').delete().eq('user_id', uid);

    if (email) {
      const { data: reqs } = await supabaseAdmin.from('project_requests').select('id,attachments').eq('client_email', email);
      const files = (reqs ?? []).flatMap(r => (Array.isArray(r.attachments) ? r.attachments as string[] : []));
      if (files.length) await supabaseAdmin.storage.from('project-files').remove(files);
      await supabaseAdmin.from('project_requests').update({ client_name: 'Deleted user', client_email: 'deleted@invalid', client_phone: '', requirements: '', attachments: [] }).eq('client_email', email);
      await supabaseAdmin.from('projects').update({ customer_email: '', customer_id: null }).eq('customer_email', email);
    }
    await supabaseAdmin.from('projects').update({ customer_id: null, customer_email: '' }).eq('customer_id', uid);
    await supabaseAdmin.from('profiles').delete().eq('id', uid);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(uid);
    if (error) throw new Error('Could not delete the login. Please contact support.');
    return { ok: true };
  });
