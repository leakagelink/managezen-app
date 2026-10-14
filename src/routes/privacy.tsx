import { createFileRoute } from '@tanstack/react-router';
import { PrivacyPolicy } from '@/components/socilet/policies';
export const Route = createFileRoute('/privacy')({
 head:()=>({meta:[{title:'Privacy Policy — Socilet Affiliate'},{name:'description',content:'How Socilet Affiliate collects, uses and protects your information. Contact hello@socilet.in.'},{property:'og:title',content:'Privacy Policy — Socilet Affiliate'},{property:'og:description',content:'How Socilet Affiliate collects, uses and protects your information.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),
 component:PrivacyPolicy,
});
