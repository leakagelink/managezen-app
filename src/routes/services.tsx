import { createFileRoute } from '@tanstack/react-router';
import { Catalogue } from '@/components/socilet/commerce';
export const Route = createFileRoute('/services')({
 validateSearch:(search:Record<string,unknown>):{service?:string}=>typeof search['service']==='string'?{service:search['service']}:{},
 head:()=>({meta:[{title:'Service catalogue — Socilet Partner'},{name:'description',content:'Service catalogue in the Socilet React web UI sample prototype. Refer, resell and track digital services.'},{property:'og:title',content:'Service catalogue — Socilet Partner'},{property:'og:description',content:'Explore service catalogue with Socilet. Sample prototype, no live payments.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:Screen,
});
function Screen(){const {service}=Route.useSearch();return <Catalogue selected={service}/>}
