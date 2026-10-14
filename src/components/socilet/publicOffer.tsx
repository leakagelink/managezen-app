import { useEffect, useState, type FormEvent } from 'react';
import { Input } from '@/components/ui/input';
import { AdvanceNotice } from './advance';
import { Link, useParams } from '@tanstack/react-router';
import { ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useSocilet } from './context';
import { Status, Note, ServiceArt } from './shared';
import { money, services, servicePromises, serviceExclusions, countries } from '@/lib/socilet';

/** Public, shareable offer page. Shows only non-private offer fields — never customer or payout data. */
export function PublicOffer() {
  const { offerId } = useParams({ from: '/offer/$offerId' });
  const { offers } = useSocilet();
  const local = offers.find(o => o.id.toLowerCase() === offerId.toLowerCase());
  const [remote, setRemote] = useState<{ id: string; title: string; service: string; price: number; status: 'Active' } | null | 'loading'>('loading');
  useEffect(() => {
    let on = true;
    supabase.rpc('get_public_offer', { _code: offerId }).then(({ data }) => {
      if (!on) return;
      const row = Array.isArray(data) ? data[0] : data;
      setRemote(row ? { id: row.code, title: row.title, service: row.service, price: Number(row.price), status: 'Active' } : null);
    });
    return () => { on = false; };
  }, [offerId]);
  const offer = local ?? (remote === 'loading' ? undefined : remote);
  const service = offer ? services.find(s => s.name === offer.service) : undefined;

  if (offer === undefined) return <div className="screen-enter py-16 text-center text-xs text-muted-foreground">Loading offer…</div>;

  if (!offer) {
    return <div className="screen-enter py-16 text-center">
      <ShieldCheck className="mx-auto mb-4 text-primary" size={36}/>
      <h1 className="text-lg font-bold">Offer not found</h1>
      <p className="mx-auto mt-3 max-w-xs text-xs leading-relaxed text-muted-foreground">This offer link is invalid, expired, or the offer is no longer available. Please ask your Socilet partner for an updated link.</p>
      <Button asChild className="mt-6"><Link to="/services">Explore services <ArrowRight/></Link></Button>
    </div>;
  }

  return <div className="screen-enter space-y-4">
    <section className="panel overflow-hidden">
      {service && <ServiceArt type={service.type}/>}
      <div className="p-6">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{offer.id} · {offer.service}</span>
          <Status status={offer.status}/>
        </div>
        <h1 className="mt-3 text-xl font-extrabold leading-snug">{offer.title}</h1>
        <div className="mt-5 flex items-end justify-between border-t pt-4">
          <div><p className="text-[10px] text-muted-foreground">Offer price</p><p className="mt-1 text-3xl font-extrabold">{money(offer.price)}</p></div>
          {service && <span className="text-[10px] text-muted-foreground">{service.delivery}</span>}
        </div>
      </div>
    </section>

    {service && <section className="panel p-5">
      <h2 className="text-sm font-bold">What’s included</h2>
      <div className="mt-3 space-y-2.5">{service.features.map(f => <p key={f} className="flex gap-2 text-xs"><Check className="size-4 shrink-0 text-success"/>{f}</p>)}</div>
      <div className="mt-4 space-y-2 rounded-md bg-success-soft p-3">{servicePromises.map(p => <p key={p} className="flex gap-2 text-xs font-medium text-success"><Check className="size-3.5"/>{p}</p>)}</div>
      <div className="mt-3"><Note>{serviceExclusions[0]}</Note></div>
    </section>}

    <section className="panel p-5">
      <h2 className="text-sm font-bold">How it works</h2>
      <div className="mt-3 space-y-2 text-xs leading-relaxed text-muted-foreground">
        <p>• All project payments are made directly to Socilet — never to an individual partner.</p>
        <p>• You get a tracking ID to follow every milestone of your project.</p>
      </div>
    </section>

    {offer.status === 'Active'
      ? <RequestForm code={offer.id} price={offer.price}/>
      : <Note>This offer is not active yet. It becomes available after Socilet approval.</Note>}
    <p className="text-center text-[10px] text-muted-foreground">Shared via Socilet Affiliate · affiliate.socilet.in</p>
  </div>;
}

function RequestForm({ code, price }: { code: string; price: number }) {
  const [f, setF] = useState({ name: '', email: '', phone: '', country: 'IN', req: '' });
  const [files, setFiles] = useState<File[]>([]);
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [done, setDone] = useState('');
  function pickFiles(list: FileList | null) {
    if (!list) return;
    const next = [...files, ...Array.from(list)].slice(0, 5);
    if (next.some(x => x.size > 10 * 1024 * 1024)) return setErr('Each file must be under 10 MB.');
    setErr(''); setFiles(next);
  }
  async function submit(e: FormEvent) {
    e.preventDefault(); setErr('');
    if (f.name.trim().length < 2) return setErr('Please enter your name.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) return setErr('Please enter a valid email.');
    if (f.req.trim().length < 10) return setErr('Please describe your project requirements (at least 10 characters).');
    setBusy(true);
    const { data, error } = await supabase.rpc('submit_project_request', { _offer_code: code, _name: f.name.slice(0,100), _email: f.email.trim().slice(0,255), _phone: f.phone.slice(0,20), _country: f.country, _requirements: f.req.slice(0,2000) });
    if (error || !data) { setBusy(false); return setErr(code.startsWith('OFF-') ? 'Could not submit right now. Please try again.' : 'This is a sample offer — requests can be submitted only on live offers.'); }
    const tracking = String(data);
    if (files.length) {
      const paths: string[] = [];
      for (const file of files) {
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-60);
        const path = `${tracking}/${Date.now()}-${safe}`;
        const { error: upErr } = await supabase.storage.from('project-files').upload(path, file, { contentType: file.type || 'application/octet-stream' });
        if (!upErr) paths.push(path);
      }
      if (paths.length) await supabase.rpc('attach_request_files', { _tracking_code: tracking, _paths: paths });
    }
    setBusy(false);
    setDone(tracking);
  }
  if (done) return <section className="panel p-5 text-center">
    <Check className="mx-auto size-8 text-success"/>
    <h2 className="mt-2 text-base font-bold">Request submitted</h2>
    <p className="mt-2 text-xs text-muted-foreground">Save your tracking ID. Socilet will review your requirements and start your project.</p>
    <p className="mt-3 text-lg font-extrabold tracking-wide">{done}</p>
    <Button asChild className="mt-4 w-full"><a href={`/track?code=${encodeURIComponent(done)}`}>Track my project <ArrowRight/></a></Button>
    <div className="mt-4 text-left"><AdvanceNotice totalInr={price} country={f.country}/></div>
  </section>;
  return <form onSubmit={submit} className="panel space-y-2 p-5">
    <h2 className="text-sm font-bold">Start your project</h2>
    <p className="text-[11px] text-muted-foreground">Share your details and requirements. You’ll get a tracking ID instantly.</p>
    <Input aria-label="Your name" placeholder="Full name" maxLength={100} value={f.name} onChange={e=>setF({...f,name:e.target.value})}/>
    <Input aria-label="Email" type="email" placeholder="Email" maxLength={255} value={f.email} onChange={e=>setF({...f,email:e.target.value})}/>
    <Input aria-label="Mobile number" inputMode="tel" placeholder="Mobile number" maxLength={20} value={f.phone} onChange={e=>setF({...f,phone:e.target.value})}/>
    <select aria-label="Country" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={f.country} onChange={e=>setF({...f,country:e.target.value})}>{countries.map(c=><option key={c.code} value={c.code}>{c.name}</option>)}</select>
    <textarea aria-label="Project requirements" placeholder="What do you need? Pages, features, references, deadline…" maxLength={2000} rows={4} className="w-full rounded-md border bg-background p-3 text-sm" value={f.req} onChange={e=>setF({...f,req:e.target.value})}/>
    <div>
      <label htmlFor="req-files" className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed p-3 text-xs font-medium text-muted-foreground">
        <Paperclip className="size-4"/> Attach logo, images or files (optional, max 5 · 10 MB each)
      </label>
      <input id="req-files" type="file" multiple accept="image/*,.pdf,.doc,.docx,.zip" className="hidden" onChange={e=>{pickFiles(e.target.files); e.target.value='';}}/>
      {files.length > 0 && <ul className="mt-2 space-y-1">{files.map((file, i) => <li key={`${file.name}-${i}`} className="flex items-center justify-between rounded bg-muted px-2 py-1 text-[11px]"><span className="truncate">{file.name}</span><button type="button" aria-label={`Remove ${file.name}`} onClick={()=>setFiles(files.filter((_,j)=>j!==i))} className="ml-2 text-destructive"><X className="size-3.5"/></button></li>)}</ul>}
    </div>
    {err && <p role="alert" className="text-xs text-destructive">{err}</p>}
    <AdvanceNotice totalInr={price} country={f.country}/>
    <Button type="submit" disabled={busy} className="h-12 w-full">{busy ? 'Submitting…' : 'Submit requirements'} <ArrowRight/></Button>
  </form>;
}
