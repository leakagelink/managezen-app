import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

/** Admin overview from real records. Role is checked server-side before any query; reads run under the caller's RLS. */
export const getAdminOverview = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const { data: isAdmin } = await sb.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
    if (!isAdmin) throw new Error('Forbidden');
    const [profiles, roles, projects, payouts, referrals, offers, audit] = await Promise.all([
      sb.from('profiles').select('id,legal_name,country,created_at').order('created_at', { ascending: false }).limit(200),
      sb.from('user_roles').select('user_id,role'),
      sb.from('projects').select('tracking_code,service,stage,progress,total,updated_at').order('updated_at', { ascending: false }).limit(50),
      sb.from('payout_requests').select('amount,status'),
      sb.from('referrals').select('fee,status'),
      sb.from('offers').select('status'),
      sb.from('audit_log').select('table_name,old_status,new_status,actor_id,actor_kind,created_at').order('created_at', { ascending: false }).limit(20),
    ]);
    const err = [profiles, roles, projects, payouts, referrals, offers, audit].find(r => r.error);
    if (err) throw new Error('Could not load admin data');
    const roleOf = new Map<string, string[]>();
    for (const r of roles.data ?? []) roleOf.set(r.user_id, [...(roleOf.get(r.user_id) ?? []), r.role]);
    const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
    const count = <T extends { status: string }>(xs: T[] | null, s: string) => (xs ?? []).filter(x => x.status === s).length;
    return {
      users: (profiles.data ?? []).map(p => ({ name: p.legal_name || 'Unnamed', country: p.country, roles: roleOf.get(p.id) ?? [], joined: p.created_at })),
      userCount: profiles.data?.length ?? 0,
      projects: projects.data ?? [],
      payouts: {
        pending: sum((payouts.data ?? []).filter(p => p.status === 'Pending').map(p => Number(p.amount))),
        approved: sum((payouts.data ?? []).filter(p => p.status === 'Approved').map(p => Number(p.amount))),
        count: payouts.data?.length ?? 0,
      },
      commissions: {
        completed: sum((referrals.data ?? []).filter(r => r.status === 'Completed').map(r => Math.round(Number(r.fee) * 0.2))),
        completedCount: count(referrals.data, 'Completed'),
        pendingCount: count(referrals.data, 'Pending') + count(referrals.data, 'Approved'),
      },
      offers: { active: count(offers.data, 'Active'), pending: count(offers.data, 'Pending approval'), rejected: count(offers.data, 'Rejected') },
      audit: (audit.data ?? []).map(a => ({ ...a, actor_id: a.actor_id ? a.actor_id.slice(0, 8) : null })),
    };
  });
