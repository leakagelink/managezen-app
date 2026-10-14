import { ShieldCheck } from 'lucide-react';
import { requiresAdvance, advanceThresholdLabel } from '@/lib/socilet';

/** Advance-payment and resources notice shown on every project. Country decides the threshold. */
export function AdvanceNotice({ totalInr, country = 'IN' }: { totalInr?: number; country?: string }) {
  const label = advanceThresholdLabel(country);
  const known = typeof totalInr === 'number' && totalInr > 0;
  const zero = known ? !requiresAdvance(totalInr, country) : undefined;
  return <section className="panel space-y-2 p-5 text-xs leading-relaxed">
    <h2 className="flex items-center gap-2 text-sm font-bold"><ShieldCheck className="size-4 text-primary"/>Payment & resources</h2>
    {zero === true && <p className="rounded-md bg-success-soft p-3 font-semibold text-success">Your project is under {label}, so it is eligible for the zero advance payment model — you pay only after the work is complete.</p>}
    {zero === false && <p className="rounded-md bg-muted p-3 font-medium">Projects of {label} or more need an advance payment. Socilet confirms the exact amount with you.</p>}
    {zero === undefined && <p>Projects under {label} are eligible for the zero advance payment model — pay only after the work is complete.</p>}
    <p className="text-muted-foreground">You only need to provide the resources: domain, hosting and APIs (if used). Not from a tech background or don’t know how? No problem — we can arrange these services for you; you only pay for those services.</p>
    <p className="font-semibold text-destructive">Pay only to official Socilet accounts. Never pay any individual directly.</p>
  </section>;
}
