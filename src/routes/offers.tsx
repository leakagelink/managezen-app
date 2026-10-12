import { createFileRoute } from '@tanstack/react-router';
import { Offers } from '@/components/socilet/commerce';
export const Route = createFileRoute('/offers')({
 head:()=>({meta:[{title:'My offers — Socilet Partner'},{name:'description',content:'My offers in the Socilet React web UI sample prototype. Refer, resell and track digital services.'},{property:'og:title',content:'My offers — Socilet Partner'},{property:'og:description',content:'Explore my offers with Socilet. Sample prototype, no live payments.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:Offers,
});
