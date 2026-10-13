import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { initialOffers, setDisplayCurrency, applyLiveRates, type Role, type Offer, type CurrencyCode, type OfferStatus } from '@/lib/socilet';

export type Profile = { legalName:string; country:string; phone:string; currency:CurrencyCode };
type NewOffer = { title:string; service:string; base:number; price:number };
type Ctx = {
 role:Role; setRole:(role:Role)=>void; offers:Offer[]; setOffers:React.Dispatch<React.SetStateAction<Offer[]>>;
 name:string; setName:(name:string)=>void; profile:Profile; setProfile:(p:Profile)=>Promise<void>;
 user:User|null; signedIn:boolean; ready:boolean; ratesLive:boolean;
 addOffer:(o:NewOffer)=>Promise<string|null>; decideOffer:(id:string, approve:boolean, reason?:string)=>Promise<string|null>; signOut:()=>Promise<void>;
};
// Keep one context instance across hot reloads so provider and consumers never mismatch.
const g = globalThis as unknown as { __sociletCtx?: React.Context<Ctx | null> };
const Context = g.__sociletCtx ?? (g.__sociletCtx = createContext<Ctx | null>(null));
const demoProfile:Profile = {legalName:'Rahul Sharma',country:'IN',phone:'9876543210',currency:'INR'};

type OfferRow = { id:string; code:string; title:string; service:string; base:number; price:number; status:string; reason:string|null; created_at:string };
const toOffer = (r:OfferRow):Offer => ({ id:r.code, dbId:r.id, title:r.title, service:r.service, base:Number(r.base), price:Number(r.price), status:r.status as OfferStatus, date:r.created_at, reason:r.reason ?? undefined });

export function SociletProvider({children}:{children:ReactNode}) {
 const [user,setUser] = useState<User|null>(null);
 const [ready,setReady] = useState(false);
 const [role,setRoleState] = useState<Role>('reseller');
 const [offers,setOffers] = useState<Offer[]>(initialOffers);
 const [name,setName] = useState('Rahul Sharma');
 const [profile,setProfileState] = useState<Profile>(demoProfile);
 const [ratesLive,setRatesLive] = useState(false);
 const [,force] = useState(0);
 setDisplayCurrency(profile.currency);

 const loadOffers = useCallback(async()=>{
  const { data } = await supabase.from('offers').select('*').order('created_at',{ascending:false});
  setOffers((data ?? []).map(r=>toOffer(r as OfferRow)));
 },[]);

 const load = useCallback(async(u:User|null)=>{
  setUser(u);
  if(!u){ setOffers(initialOffers); setProfileState(demoProfile); setName('Rahul Sharma'); setRoleState('reseller'); setReady(true); return; }
  const [{data:p},{data:roles}] = await Promise.all([
   supabase.from('profiles').select('*').eq('id',u.id).maybeSingle(),
   supabase.from('user_roles').select('role').eq('user_id',u.id),
  ]);
  const list = (roles ?? []).map(r=>r.role as Role);
  setRoleState(list.includes('admin') ? 'admin' : list[0] ?? 'customer');
  if(p){ setProfileState({legalName:p.legal_name,country:p.country,phone:p.phone,currency:p.currency as CurrencyCode}); setName(p.legal_name || u.email || 'Partner'); }
  await loadOffers();
  setReady(true);
 },[loadOffers]);

 useEffect(()=>{
  supabase.auth.getUser().then(({data})=>load(data.user));
  const { data:sub } = supabase.auth.onAuthStateChange((event,session)=>{
   if(event==='SIGNED_IN'||event==='SIGNED_OUT'||event==='USER_UPDATED') setTimeout(()=>load(session?.user ?? null),0);
  });
  applyLiveRates().then(ok=>{ setRatesLive(ok); force(n=>n+1); });
  return ()=>sub.subscription.unsubscribe();
 },[load]);

 const setRole = (r:Role)=>{ if(!user) setRoleState(r); };
 const setProfile = async(p:Profile)=>{
  setDisplayCurrency(p.currency); setProfileState(p);
  if(user){ await supabase.from('profiles').update({legal_name:p.legalName,country:p.country,phone:p.phone,currency:p.currency,updated_at:new Date().toISOString()}).eq('id',user.id); setName(p.legalName); }
 };
 const addOffer = async(o:NewOffer)=>{
  if(!user){ setOffers(prev=>[{id:`OFF-${1045+prev.length-4}`,...o,status:'Pending approval',date:new Date().toISOString()},...prev]); return null; }
  const { error } = await supabase.from('offers').insert({...o,user_id:user.id,status:'Pending approval'});
  if(error) return 'Could not save the offer. Only resellers can submit offers.';
  await loadOffers(); return null;
 };
 const decideOffer = async(id:string, approve:boolean, reason?:string)=>{
  const offer = offers.find(x=>x.id===id); if(!offer) return 'Offer not found.';
  const patch = {status:approve?'Active':'Rejected', reason:approve?null:(reason ?? null)};
  if(!user||!offer.dbId){ setOffers(prev=>prev.map(x=>x.id===id?{...x,status:patch.status as OfferStatus,reason:patch.reason ?? undefined}:x)); return null; }
  const { data, error } = await supabase.from('offers').update(patch).eq('id',offer.dbId).select('id');
  if(error||!data?.length) return 'Only admins can approve or reject offers.';
  await loadOffers(); return null;
 };
 const signOut = async()=>{ await supabase.auth.signOut(); };

 return <Context.Provider value={{role,setRole,offers,setOffers,name,setName,profile,setProfile,user,signedIn:!!user,ready,ratesLive,addOffer,decideOffer,signOut}}>{children}</Context.Provider>;
}
export function useSocilet() { const value=useContext(Context); if(!value) throw new Error('Socilet provider is required'); return value; }
