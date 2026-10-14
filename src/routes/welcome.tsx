import { createFileRoute } from '@tanstack/react-router';
import { Welcome } from '@/components/socilet/account';
export const Route = createFileRoute('/welcome')({
 head:()=>({meta:[{title:'Welcome to Socilet — Socilet Affiliate'},{name:'description',content:'Welcome to Socilet in the Socilet React web UI sample prototype. Refer, resell and track digital services.'},{property:'og:title',content:'Welcome to Socilet — Socilet Affiliate'},{property:'og:description',content:'Explore welcome to socilet with Socilet. Sample prototype, no live payments.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:Welcome,
});
