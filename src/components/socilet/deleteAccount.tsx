import { useEffect, useState, type FormEvent } from 'react';
import { Link } from '@tanstack/react-router';
import { Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeading, Note } from './shared';
import { useSocilet } from './context';
import { supabase } from '@/integrations/supabase/client';
import { deleteMyAccount, requestDeletion, verifyDeletion } from '@/lib/security.functions';
import { SUPPORT_EMAIL } from '@/lib/socilet';

export function DeleteAccount() {
  const { signedIn, user } = useSocilet();
  const [confirm, setConfirm] = useState('');
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState('');

  useEffect(() => {
    const q = new URLSearchParams(window.location.search); const r = q.get('r'); const t = q.get('t');
    if (!r || !t) return;
    setBusy(true);
    verifyDeletion({ data: { id: r, token: t } })
      .then(() => setDone('Thank you — your email is verified. Socilet will now delete the account and confirm by email.'))
      .catch(e => setErr(e instanceof Error ? e.message : 'Invalid or expired link.'))
      .finally(() => setBusy(false));
  }, []);
  async function removeNow() {
    setErr(''); setBusy(true);
    try {
      await deleteMyAccount({ data: { confirm } });
      await supabase.auth.signOut();
      setDone('Your account and personal data have been deleted.');
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not delete your account. Please try again.'); }
    setBusy(false);
  }
  async function request(e: FormEvent) {
    e.preventDefault(); setErr('');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setErr('Enter the email you registered with.');
    setBusy(true);
    try {
      const r = await requestDeletion({ data: { email: email.trim(), reason } });
      setDone(`${r.message} The email will come from ${SUPPORT_EMAIL} with a verification link valid for 48 hours. Deletion is completed within 30 days of verification.`);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not submit the request. Please try again.'); }
    setBusy(false);
  }

  return <div className="screen-enter">
    <PageHeading title="Delete account" description="Permanently remove your Socilet Affiliate account and data."/>
    <section className="panel space-y-4 p-5 text-sm">
      {done ? <div role="status" className="text-center"><Check className="mx-auto size-8 text-success"/><p className="mt-3">{done}</p><Button asChild className="mt-4"><Link to="/">Back to home</Link></Button></div> : <>
        <div className="text-xs leading-relaxed text-muted-foreground">
          <p className="font-semibold text-foreground">What is deleted</p>
          <p>Login, profile, offers, notifications, pending or rejected referrals and payout requests. Project requests made with your email are anonymised and uploaded files are deleted.</p>
          <p className="mt-2 font-semibold text-foreground">What is kept</p>
          <p>Completed referral commissions and approved payout records (client names removed) for up to 8 years for tax and accounting obligations, visible only to Socilet admins. <Link to="/privacy" className="text-primary">Privacy Policy</Link></p>
        </div>
        {signedIn ? <div className="space-y-3">
          <Note>Signed in as {user?.email}. This cannot be undone.</Note>
          <label htmlFor="del-confirm" className="block text-xs font-semibold">Type DELETE to confirm</label>
          <Input id="del-confirm" value={confirm} onChange={e => setConfirm(e.target.value)} className="h-11"/>
          {err && <p role="alert" className="text-xs text-destructive">{err}</p>}
          <Button variant="destructive" className="w-full" disabled={busy || confirm !== 'DELETE'} onClick={removeNow}><Trash2/>{busy ? 'Deleting…' : 'Delete my account'}</Button>
        </div> : <form onSubmit={request} className="space-y-3">
          <p className="text-xs">The fastest way: <Link to="/login" className="font-semibold text-primary">sign in</Link> and delete instantly. Can't sign in? Send a request:</p>
          <label htmlFor="del-email" className="block text-xs font-semibold">Registered email</label>
          <Input id="del-email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="h-11"/>
          <label htmlFor="del-reason" className="block text-xs font-semibold">Reason (optional)</label>
          <textarea id="del-reason" rows={3} maxLength={500} className="w-full rounded-md border p-3 text-sm" value={reason} onChange={e => setReason(e.target.value)}/>
          {err && <p role="alert" className="text-xs text-destructive">{err}</p>}
          <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Sending…' : 'Request deletion'}</Button>
        </form>}
      </>}
    </section>
  </div>;
}
