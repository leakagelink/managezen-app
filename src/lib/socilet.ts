export type Role = 'reseller' | 'referrer' | 'customer' | 'admin';
/** Roles a visitor can pick in sample mode. Admin is granted in the database, never selected here. */
export const demoRoles: Role[] = ['reseller','referrer','customer'];
export type OfferStatus = 'Pending approval' | 'Active' | 'Rejected' | 'Draft';
export type Offer = { id: string; title: string; service: string; base: number; price: number; status: OfferStatus; date: string; reason?: string | undefined; dbId?: string };
export type CurrencyCode = 'INR' | 'USD' | 'GBP' | 'EUR' | 'CAD' | 'AUD' | 'AED' | 'SGD';
/** Sample conversion rates: 1 unit of currency = N rupees. Not live exchange rates. */
export const inrPerUnit: Record<CurrencyCode, number> = { INR:1, USD:83, GBP:105, EUR:90, CAD:61, AUD:55, AED:22.6, SGD:62 };
/** Fetches live INR-based rates; keeps sample rates if the request fails. */
export async function applyLiveRates(): Promise<boolean> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/INR');
    if (!res.ok) return false;
    const json = await res.json() as { rates?: Record<string, number> };
    for (const c of Object.keys(inrPerUnit) as CurrencyCode[]) { const r = json.rates?.[c]; if (r && r > 0) inrPerUnit[c] = 1 / r; }
    return true;
  } catch { return false; }
}
export const currencies = Object.keys(inrPerUnit) as CurrencyCode[];
export type Country = { code:string; name:string; dial:string; currency:CurrencyCode; tier1:boolean };
export const countries: Country[] = [
 { code:'IN', name:'India', dial:'+91', currency:'INR', tier1:false },
 { code:'US', name:'United States', dial:'+1', currency:'USD', tier1:true },
 { code:'GB', name:'United Kingdom', dial:'+44', currency:'GBP', tier1:true },
 { code:'CA', name:'Canada', dial:'+1', currency:'CAD', tier1:true },
 { code:'AU', name:'Australia', dial:'+61', currency:'AUD', tier1:true },
 { code:'DE', name:'Germany', dial:'+49', currency:'EUR', tier1:true },
 { code:'FR', name:'France', dial:'+33', currency:'EUR', tier1:true },
 { code:'SG', name:'Singapore', dial:'+65', currency:'SGD', tier1:true },
 { code:'AE', name:'United Arab Emirates', dial:'+971', currency:'AED', tier1:false },
];
export const countryByCode = (code: string) => countries.find(c => c.code === code) ?? countries[0]!;
export const convertFromInr = (inr: number, currency: CurrencyCode) => inr / inrPerUnit[currency];
export const formatMoney = (inr: number, currency: CurrencyCode) => new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', { style:'currency', currency, maximumFractionDigits: currency === 'INR' ? 0 : 2 }).format(convertFromInr(inr, currency));
let displayCurrency: CurrencyCode = 'INR';
export const setDisplayCurrency = (c: CurrencyCode) => { displayCurrency = c; };
/** Amounts are stored in INR and shown in the partner's selected currency. */
export const money = (value: number) => formatMoney(value, displayCurrency);
export const validPhone = (phone: string) => /^\d{7,15}$/.test(phone.replace(/[\s-]/g, ''));
export const indianDate = (value: string) => new Date(value).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
export function resellerQuote(base: number, selling: number) {
  if (!Number.isFinite(base) || !Number.isFinite(selling) || base <= 0 || selling <= base) return { valid:false, profit:0, margin:0, commission:0 };
  return { valid:true, profit:selling-base, margin:(selling-base)/selling*100, commission:0 };
}
export function referralCommission(fee: number, eligible: boolean, successful: boolean, resellerTransaction = false) {
  return eligible && successful && !resellerTransaction && Number.isFinite(fee) && fee > 0 ? fee * .2 : 0;
}
/** India (and other non tier-1): zero advance below ₹50,000. Tier-1 countries: zero advance below $1,000. Amount in INR. */
export const requiresAdvance = (projectTotalInr: number, countryCode = 'IN') => countryByCode(countryCode).tier1 ? convertFromInr(projectTotalInr, 'USD') >= 1000 : projectTotalInr >= 50000;
export const advanceThresholdLabel = (countryCode = 'IN') => countryByCode(countryCode).tier1 ? '$1,000' : '₹50,000';
export const canAccess = (role: Role, page: string) => {
  if (['/','/services','/track','/profile','/welcome','/login','/notifications'].includes(page)) return true;
  if (page === '/admin') return role === 'admin';
  if (page === '/projects') return role === 'customer' || role === 'admin';
  if (['/offers','/create-offer'].includes(page)) return role === 'reseller' || role === 'admin';
  if (page === '/referrals') return role === 'referrer' || role === 'admin';
  return role !== 'customer';
};
export const publicProject = (id: string) => {
  if (id.trim().toUpperCase() !== 'SOC-2026-8X72K') return null;
  return { id:'SOC-2026-8X72K', service:'Business website development', stage:'Design in progress', progress:40, updated:'2026-10-10', steps:[{ title:'Project accepted', date:'6 Oct 2026', status:'done' },{ title:'Discovery completed',date:'7 Oct 2026',status:'done' },{ title:'Design in progress',date:'10 Oct 2026',status:'current' },{ title:'Development',date:'Upcoming',status:'pending' },{ title:'Testing & review',date:'Upcoming',status:'pending' },{ title:'Ready for delivery',date:'Upcoming',status:'pending' }] };
};
/** Shown on every service: honest pricing promises and what is never included. */
export const servicePromises = ['3 months of free maintenance','No hidden charges','No monthly charges'];
export const serviceExclusions = ['Hosting, domain and third-party API costs are not included and are paid by the customer when used.'];
export const services = [
 { id:'website', name:'Business website', category:'Web development', base:10000, tag:'MOST POPULAR', description:'A fast, beautifully crafted 5-page website that turns visitors into customers.', type:'web', delivery:'10–15 working days', features:['5 custom-designed pages','Mobile-first responsive design','Search engine optimisation','Contact forms & analytics','3 months of free maintenance','No hidden or monthly charges'] },
 { id:'mobile', name:'Mobile app', category:'App development', base:10000, tag:'', description:'Bring your business to your customers’ fingertips with a custom mobile experience.', type:'mobile', delivery:'30–45 working days', features:['Custom Android & iOS experience','User flows & interface design','Quality assurance & testing','3 months of free maintenance','No hidden or monthly charges'] },
 { id:'webapp', name:'Website + App combo', category:'Web development', base:20000, tag:'BEST VALUE', description:'Your business website and mobile app, built together as one seamless experience.', type:'web', delivery:'30–45 working days', features:['5-page business website','Custom Android & iOS app','Mobile-first responsive design','Search engine optimisation','3 months of free maintenance','No hidden or monthly charges'] },
 { id:'branding', name:'Brand identity', category:'Design & branding', base:10000, tag:'', description:'A distinctive identity that makes your business impossible to overlook.', type:'brand', delivery:'7–10 working days', features:['Logo design concepts','Brand colour & typography system','Social media templates','Brand guidelines document','Two rounds of refinement'] },
];
export const initialOffers: Offer[] = [
 {id:'OFF-1042',title:'Business website for Bloom Studio',service:'Business website',base:10000,price:15000,status:'Active',date:'2026-10-08'},
 {id:'OFF-1043',title:'Website + app for Urban Roots',service:'Website + App combo',base:20000,price:28000,status:'Pending approval',date:'2026-10-10'},
 {id:'OFF-1044',title:'Brand identity for The Daily Brew',service:'Brand identity',base:10000,price:16000,status:'Draft',date:'2026-10-11'},
 {id:'OFF-1039',title:'Starter website package',service:'Business website',base:10000,price:10000,status:'Rejected',date:'2026-10-05',reason:'Selling price must be above the approved Socilet base price.'},
];
