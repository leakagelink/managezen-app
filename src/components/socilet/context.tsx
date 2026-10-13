import { createContext, useContext, useState, type ReactNode } from 'react';
import { initialOffers, setDisplayCurrency, type Role, type Offer, type CurrencyCode } from '@/lib/socilet';
export type Profile = { legalName:string; country:string; phone:string; currency:CurrencyCode };
type DemoContext = { role:Role; setRole:(role:Role)=>void; offers:Offer[]; setOffers: React.Dispatch<React.SetStateAction<Offer[]>>; name:string; setName:(name:string)=>void; profile:Profile; setProfile:(p:Profile)=>void };
const Context = createContext<DemoContext | null>(null);
export function SociletProvider({children}:{children:ReactNode}) {
 const [role,setRole] = useState<Role>('reseller');
 const [offers,setOffers] = useState(initialOffers);
 const [name,setName] = useState('Rahul Sharma');
 const [profile,setProfileState] = useState<Profile>({legalName:'Rahul Sharma',country:'IN',phone:'9876543210',currency:'INR'});
 setDisplayCurrency(profile.currency);
 const setProfile=(p:Profile)=>{setDisplayCurrency(p.currency);setProfileState(p)};
 return <Context.Provider value={{role,setRole,offers,setOffers,name,setName,profile,setProfile}}>{children}</Context.Provider>;
}
export function useSocilet() { const value=useContext(Context); if(!value) throw new Error('Socilet provider is required'); return value; }
