import { createFileRoute } from '@tanstack/react-router';
import { Login } from '@/components/socilet/account';
export const Route = createFileRoute('/login')({
 head:()=>({meta:[{title:'Login & signup preview — Socilet Partner'},{name:'description',content:'Login & signup preview in the Socilet React web UI sample prototype. Refer, resell and track digital services.'},{property:'og:title',content:'Login & signup preview — Socilet Partner'},{property:'og:description',content:'Explore login & signup preview with Socilet. Sample prototype, no live payments.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:Login,
});
