import { createFileRoute } from '@tanstack/react-router';
import { Projects } from '@/components/socilet/activity';
import { LiveProjects } from '@/components/socilet/live';
import { useSocilet } from '@/components/socilet/context';
export const Route = createFileRoute('/projects')({
 head:()=>({meta:[{title:'Customer projects — Socilet Affiliate'},{name:'description',content:'Customer projects in the Socilet React web UI sample prototype. Refer, resell and track digital services.'},{property:'og:title',content:'Customer projects — Socilet Affiliate'},{property:'og:description',content:'Explore customer projects with Socilet. Sample prototype, no live payments.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:Page,
});

function Page(){ const {signedIn}=useSocilet(); return signedIn ? <LiveProjects/> : <Projects/>; }
