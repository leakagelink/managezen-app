import { createFileRoute } from '@tanstack/react-router';
import { CreateOffer } from '@/components/socilet/commerce';
export const Route = createFileRoute('/create-offer')({
 validateSearch:(search:Record<string,unknown>):{service?:string}=>typeof search['service']==='string'?{service:search['service']}:{},
 head:()=>({meta:[{title:'Create an offer — Socilet Affiliate'},{name:'description',content:'Create an offer in the Socilet React web UI sample prototype. Refer, resell and track digital services.'},{property:'og:title',content:'Create an offer — Socilet Affiliate'},{property:'og:description',content:'Explore create an offer with Socilet. Sample prototype, no live payments.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component:Screen,
});
function Screen(){const {service}=Route.useSearch();return <CreateOffer selected={service}/>}
