import { createFileRoute } from '@tanstack/react-router';
import { Notifications } from '@/components/socilet/live';
export const Route = createFileRoute('/notifications')({
 head:()=>({meta:[{title:'Notifications — Socilet Affiliate'},{name:'description',content:'Notifications in the Socilet React web UI sample prototype. Refer, resell and track digital services.'},{property:'og:title',content:'Notifications — Socilet Affiliate'},{property:'og:description',content:'Explore notifications with Socilet. Sample prototype, no live payments.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:Notifications,
});
