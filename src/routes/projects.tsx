import { createFileRoute } from '@tanstack/react-router';
import { Projects } from '@/components/socilet/activity';
export const Route = createFileRoute('/projects')({
 head:()=>({meta:[{title:'Customer projects — Socilet Partner'},{name:'description',content:'Customer projects in the Socilet React web UI sample prototype. Refer, resell and track digital services.'},{property:'og:title',content:'Customer projects — Socilet Partner'},{property:'og:description',content:'Explore customer projects with Socilet. Sample prototype, no live payments.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:Projects,
});
