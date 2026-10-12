import { createFileRoute } from '@tanstack/react-router';
import { Profile } from '@/components/socilet/account';
export const Route = createFileRoute('/profile')({
 head:()=>({meta:[{title:'Profile & settings — Socilet Partner'},{name:'description',content:'Profile & settings in the Socilet React web UI sample prototype. Refer, resell and track digital services.'},{property:'og:title',content:'Profile & settings — Socilet Partner'},{property:'og:description',content:'Explore profile & settings with Socilet. Sample prototype, no live payments.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:Profile,
});
