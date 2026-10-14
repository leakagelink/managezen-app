import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { SectionHeading, EmptyState } from './shared';
import { supabase } from '@/integrations/supabase/client';
import { startDeletionVerification, processDeletionRequest } from '@/lib/security.functions';
import { SUPPORT_EMAIL } from '@/lib/socilet';

type Row = { id: string; request_no: string | null; email: string; reason: string; status: string; created_at: string; verify_expires_at: string | null };
const STATUSES = ['All', 'Received', 'Verification Pending', 'Verified', 'Processing', 'Completed', 'Rejected'] as const;
const PAGE = 10;

/** Admin-only queue for deletion requests from people who cannot sign in. RLS limits reads to admins. */
export function DeletionRequestsAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('All');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    let q = supabase.from('deletion_requests').select('id,request_no,email,reason,status,created_at,verify_expires_at', { count: 'exact' })
      .order('created_at', { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1);
    if (status !== 'All') q = q.eq('status', status);
    const { data, error, count } = await q;
    if (error) setErr('Could not load deletion requests.'); else { setRows((data ?? []) as Row[]); setTotal(count ?? 0); }
    setLoading(false);
  }, [page, status]);
  useEffect(() => { void load(); }, [load]);

  async function act(id: string, fn: () => Promise<void>) {
    setBusyId(id); setErr(''); setMsg('');
    try { await fn(); } catch (e) { setErr(e instanceof Error ? e.message : 'Action failed.'); }
    setBusyId(''); void load();
  }
  const verify = (r: Row) => act(r.id, async () => {
    const v = await startDeletionVerification({ data: { id: r.id } });
    const body = encodeURIComponent(`Hello,\n\nWe received a request to delete the Socilet Affiliate account for this email (${v.requestNo}).\nIf you made this request, confirm it within 48 hours here:\n${v.link}\n\nIf you did not request this, ignore this email.\n\nSocilet`);
    window.open(`mailto:${v.email}?subject=${encodeURIComponent('Confirm account deletion ' + v.requestNo)}&body=${body}`, '_blank');
    setMsg(`Verification link created. Send the email from ${SUPPORT_EMAIL}. The status changes to Verified only after the requester opens the link.`);
  });
  const reject = (r: Row) => act(r.id, async () => {
    const { error } = await supabase.from('deletion_requests').update({ status: 'Rejected' }).eq('id', r.id);
    if (error) throw new Error('Could not reject this request.');
  });
  const process = (r: Row) => act(r.id, async () => {
    if (!window.confirm(`Permanently delete all data for ${r.email}? This cannot be undone.`)) return;
    await processDeletionRequest({ data: { id: r.id } });
    setMsg('Deletion completed.');
  });

  return <section className="panel mt-5 p-5">
    <SectionHeading title="Deletion requests"/>
    <div className="mb-3 flex flex-wrap gap-2">{STATUSES.map(s => <Button key={s} size="sm" variant={status === s ? 'default' : 'outline'} onClick={() => { setStatus(s); setPage(0); }}>{s}</Button>)}</div>
    {msg && <p role="status" className="mb-2 rounded-md bg-success-soft p-2 text-xs text-success">{msg}</p>}
    {err && <p role="alert" className="mb-2 text-xs text-destructive">{err}</p>}
    {loading ? <p className="py-6 text-center text-xs text-muted-foreground">Loading…</p>
      : !rows.length ? <EmptyState title="No deletion requests" description="Requests from the public delete-account page appear here."/>
      : rows.map(r => <div key={r.id} className="border-b py-3 text-xs last:border-0">
        <div className="flex justify-between gap-2"><p className="font-semibold">{r.request_no ?? r.id.slice(0, 8)} · {r.email}</p><span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold">{r.status}</span></div>
        <p className="mt-1 text-muted-foreground">{new Date(r.created_at).toLocaleString('en-IN')}{r.reason ? ` · ${r.reason}` : ''}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(r.status === 'Received' || r.status === 'Verification Pending') && <Button size="sm" variant="outline" disabled={busyId === r.id} onClick={() => verify(r)}>{r.status === 'Received' ? 'Send verification' : 'Resend link'}</Button>}
          {r.status === 'Verified' && <Button size="sm" variant="destructive" disabled={busyId === r.id} onClick={() => process(r)}>Delete account data</Button>}
          {['Received', 'Verification Pending', 'Verified'].includes(r.status) && <Button size="sm" variant="ghost" disabled={busyId === r.id} onClick={() => reject(r)}>Reject</Button>}
        </div>
      </div>)}
    {total > PAGE && <div className="mt-3 flex items-center justify-between text-xs"><Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button><span>Page {page + 1} of {Math.ceil(total / PAGE)}</span><Button size="sm" variant="outline" disabled={(page + 1) * PAGE >= total} onClick={() => setPage(page + 1)}>Next</Button></div>}
  </section>;
}
