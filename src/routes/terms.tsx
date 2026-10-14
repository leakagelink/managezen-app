import { createFileRoute } from '@tanstack/react-router';
import { TermsOfService } from '@/components/socilet/policies';
export const Route = createFileRoute('/terms')({
 head:()=>({meta:[{title:'Terms of Service — Socilet Affiliate'},{name:'description',content:'Terms for referring, reselling and tracking digital services with Socilet Affiliate. Contact hello@socilet.in.'},{property:'og:title',content:'Terms of Service — Socilet Affiliate'},{property:'og:description',content:'Terms for referring, reselling and tracking digital services with Socilet Affiliate.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),
 component:TermsOfService,
});
