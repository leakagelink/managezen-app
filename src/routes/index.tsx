import { createFileRoute } from '@tanstack/react-router';
import { Home } from '@/components/socilet/home';
export const Route = createFileRoute('/')({
 head:()=>({meta:[{title:'Socilet Partner — Your growth workspace'},{name:'description',content:'Explore services, create reseller offers, and track your Socilet opportunities in a React web UI sample prototype.'},{property:'og:title',content:'Socilet Partner — Your growth workspace'},{property:'og:description',content:'Refer, resell and track digital services with Socilet.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),
 component: Home,
});
