import { createFileRoute } from '@tanstack/react-router';
import { PublicOffer } from '@/components/socilet/publicOffer';
export const Route = createFileRoute('/offer/$offerId')({
 head:()=>({meta:[{title:'Shared offer — Socilet Affiliate'},{name:'description',content:'A digital services offer shared by a Socilet Affiliate partner. Clear pricing, no hidden charges.'},{property:'og:title',content:'Shared offer — Socilet Affiliate'},{property:'og:description',content:'A digital services offer shared by a Socilet Affiliate partner.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),
 component:PublicOffer,
});
