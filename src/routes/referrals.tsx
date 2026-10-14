import { createFileRoute } from '@tanstack/react-router';
import { Referrals } from '@/components/socilet/activity';
import { LiveReferrals } from '@/components/socilet/live';
import { useSocilet } from '@/components/socilet/context';
export const Route = createFileRoute('/referrals')({
 head:()=>({meta:[{title:'My referrals — Socilet Affiliate'},{name:'description',content:'My referrals in the Socilet React web UI sample prototype. Refer, resell and track digital services.'},{property:'og:title',content:'My referrals — Socilet Affiliate'},{property:'og:description',content:'Explore my referrals with Socilet. Sample prototype, no live payments.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:Page,
});

function Page(){ const {signedIn}=useSocilet(); return signedIn ? <LiveReferrals/> : <Referrals/>; }
