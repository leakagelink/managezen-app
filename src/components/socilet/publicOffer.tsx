import { Link, useParams } from '@tanstack/react-router';
import { ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSocilet } from './context';
import { Status, Note, ServiceArt } from './shared';
import { money, services, servicePromises, serviceExclusions, SUPPORT_EMAIL, requiresAdvance, advanceThresholdLabel } from '@/lib/socilet';

/** Public, shareable offer page. Shows only non-private offer fields — never customer or payout data. */
export function PublicOffer() {
  const { offerId } = useParams({ from: '/offer/$offerId' });
  const { offers } = useSocilet();
  const offer = offers.find(o => o.id.toLowerCase() === offerId.toLowerCase());
  const service = offer ? services.find(s => s.name === offer.service) : undefined;

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
        <p>• {requiresAdvance(offer.price) ? `This project is ${advanceThresholdLabel()} or above, so an advance payment applies — the exact amount is confirmed by Socilet.` : `This project qualifies for zero advance payment (below ${advanceThresholdLabel()}).`}</p>
        <p>• All project payments are made directly to Socilet — never to an individual partner.</p>
        <p>• You get a tracking ID to follow every milestone of your project.</p>
      </div>
    </section>

    {offer.status === 'Active'
      ? <Button asChild className="h-12 w-full"><a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Interested in offer ${offer.id}: ${offer.title}`)}`}>Get started — contact Socilet <ArrowRight/></a></Button>
      : <Note>This offer is not active yet. It becomes available after Socilet approval.</Note>}
    <p className="text-center text-[10px] text-muted-foreground">Shared via Socilet Affiliate · affiliate.socilet.in</p>
  </div>;
}
