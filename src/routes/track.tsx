import { createFileRoute } from '@tanstack/react-router';
import { Tracking } from '@/components/socilet/activity';
export const Route = createFileRoute('/track')({
 head:()=>({meta:[{title:'Track a project — Socilet Partner'},{name:'description',content:'Track a project in the Socilet React web UI sample prototype. Refer, resell and track digital services.'},{property:'og:title',content:'Track a project — Socilet Partner'},{property:'og:description',content:'Explore track a project with Socilet. Sample prototype, no live payments.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:Tracking,
});
