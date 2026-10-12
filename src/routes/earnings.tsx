import { createFileRoute } from '@tanstack/react-router';
import { Earnings } from '@/components/socilet/activity';
export const Route = createFileRoute('/earnings')({
 head:()=>({meta:[{title:'Earnings & payouts — Socilet Partner'},{name:'description',content:'Earnings & payouts in the Socilet React web UI sample prototype. Refer, resell and track digital services.'},{property:'og:title',content:'Earnings & payouts — Socilet Partner'},{property:'og:description',content:'Explore earnings & payouts with Socilet. Sample prototype, no live payments.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:Earnings,
});
