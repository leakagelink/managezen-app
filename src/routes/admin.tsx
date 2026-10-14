import { createFileRoute } from '@tanstack/react-router';
import { Admin } from '@/components/socilet/admin';
export const Route = createFileRoute('/admin')({
 head:()=>({meta:[{title:'Admin workspace — Socilet Affiliate'},{name:'description',content:'Admin workspace in the Socilet React web UI sample prototype. Refer, resell and track digital services.'},{property:'og:title',content:'Admin workspace — Socilet Affiliate'},{property:'og:description',content:'Explore admin workspace with Socilet. Sample prototype, no live payments.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:Admin,
});
