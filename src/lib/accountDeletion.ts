import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

/** Service-role client; passed in so this module never imports server secrets itself. */
export type DeletionClient = SupabaseClient<Database>;

export function must<T extends { error: unknown }>(r: T, step: string): T {
  if (r.error) throw new Error(`step:${step}`);
  return r;
}

/* ---------------- Account deletion job ---------------- */

/**
 * Durable, idempotent deletion of one account. Each step is safe to repeat.
 * Login is blocked first; the login itself is deleted only after every data step succeeded.
 * Kept: completed referral commissions and approved payouts (client names removed) for tax/accounting.
 */
export async function runAccountDeletion(sb: DeletionClient, uid: string, email: string): Promise<'done' | 'busy'> {
  const { data: claimed } = await sb.rpc('claim_deletion_job', { _user: uid });
  if (!claimed) {
    const { data: job } = await sb.from('account_deletion_jobs').select('status').eq('user_id', uid).maybeSingle();
    return job?.status === 'Done' ? 'done' : 'busy';
  }
  const step = (s: string) => sb.from('account_deletion_jobs').update({ step: s, updated_at: new Date().toISOString() }).eq('user_id', uid);
  try {
    await step('block-login');
    must(await sb.auth.admin.updateUserById(uid, { ban_duration: '876000h' }), 'block-login');

    await step('files');
    const lower = email.toLowerCase();
    if (lower) {
      const reqs = must(await sb.from('project_requests').select('id,attachments').eq('client_email', lower), 'files').data ?? [];
      const files = reqs.flatMap(r => (Array.isArray(r.attachments) ? (r.attachments as string[]) : []));
      if (files.length) must(await sb.storage.from('project-files').remove(files), 'files');
    }
    await step('records');
    must(await sb.from('notifications').delete().eq('user_id', uid), 'notifications');
    must(await sb.from('offers').delete().eq('user_id', uid), 'offers');
    must(await sb.from('referrals').delete().eq('user_id', uid).in('status', ['Pending', 'Rejected', 'Approved']), 'referrals');
    must(await sb.from('referrals').update({ client_name: 'Deleted', client_contact: '' }).eq('user_id', uid), 'referrals-anon');
    must(await sb.from('payout_requests').delete().eq('user_id', uid).in('status', ['Pending', 'Rejected']), 'payouts');
    if (lower) {
      must(await sb.from('project_requests').update({ client_name: 'Deleted user', client_email: 'deleted@invalid', client_phone: '', requirements: '', attachments: [] }).eq('client_email', lower), 'requests');
      must(await sb.from('projects').update({ customer_email: '', customer_id: null }).eq('customer_email', lower), 'projects');
    }
    must(await sb.from('projects').update({ customer_id: null, customer_email: '' }).eq('customer_id', uid), 'projects');
    must(await sb.from('profiles').delete().eq('id', uid), 'profile');

    await step('login');
    const del = await sb.auth.admin.deleteUser(uid);
    if (del.error && !/not.?found/i.test(del.error.message)) throw new Error('step:login');
    must(await sb.from('account_deletion_jobs').update({ status: 'Done', step: 'done', updated_at: new Date().toISOString() }).eq('user_id', uid), 'finish');
    return 'done';
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'step:unknown';
    await sb.from('account_deletion_jobs').update({ status: 'Failed', last_error: msg.slice(0, 100), updated_at: new Date().toISOString() }).eq('user_id', uid);
    throw new Error('Deletion could not finish. Your login stays blocked; please retry or contact support.');
  }
}

