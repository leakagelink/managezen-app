import { createFileRoute } from '@tanstack/react-router';
import { Admin } from '@/components/socilet/admin';
import { AdminLive } from '@/components/socilet/live';
import { DeletionRequestsAdmin } from '@/components/socilet/deletionAdmin';
import { useSocilet } from '@/components/socilet/context';
export const Route = createFileRoute('/admin')({
 head:()=>({meta:[{title:'Admin workspace — Socilet Affiliate'},{name:'description',content:'Socilet Affiliate admin workspace: offer approvals, users, projects and audit. Sample data shown when not signed in as admin.'},{property:'og:title',content:'Admin workspace — Socilet Affiliate'},{property:'og:description',content:'Socilet Affiliate admin workspace. Payments are not processed in the app.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:Page,
});

function Page(){ const {signedIn,role}=useSocilet(); return <>{<Admin/>}{signedIn&&role==='admin'&&<><AdminLive/><DeletionRequestsAdmin/></>}</>; }
