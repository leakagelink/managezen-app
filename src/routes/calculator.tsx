import { createFileRoute } from '@tanstack/react-router';
import { Calculator } from '@/components/socilet/commerce';
export const Route = createFileRoute('/calculator')({
 head:()=>({meta:[{title:'Pricing calculator — Socilet Affiliate'},{name:'description',content:'Pricing calculator in the Socilet React web UI sample prototype. Refer, resell and track digital services.'},{property:'og:title',content:'Pricing calculator — Socilet Affiliate'},{property:'og:description',content:'Explore pricing calculator with Socilet. Sample prototype, no live payments.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:Calculator,
});
