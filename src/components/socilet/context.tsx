import { createContext, useContext, useState, type ReactNode } from 'react';
import { initialOffers, type Role, type Offer } from '@/lib/socilet';
type DemoContext = { role:Role; setRole:(role:Role)=>void; offers:Offer[]; setOffers: React.Dispatch<React.SetStateAction<Offer[]>>; name:string; setName:(name:string)=>void };
const Context = createContext<DemoContext | null>(null);
export function SociletProvider({children}:{children:ReactNode}) {
 const [role,setRole] = useState<Role>('reseller');
 const [offers,setOffers] = useState(initialOffers);
 const [name,setName] = useState('Rahul Sharma');
 return <Context.Provider value={{role,setRole,offers,setOffers,name,setName}}>{children}</Context.Provider>;
}
export function useSocilet() { const value=useContext(Context); if(!value) throw new Error('Socilet provider is required'); return value; }
