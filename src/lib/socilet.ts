export type Role = 'reseller' | 'referrer' | 'customer' | 'admin';
export type OfferStatus = 'Pending approval' | 'Active' | 'Rejected' | 'Draft';
export type Offer = { id: string; title: string; service: string; base: number; price: number; status: OfferStatus; date: string; reason?: string | undefined };
export type CurrencyCode = 'INR' | 'USD' | 'GBP' | 'EUR' | 'CAD' | 'AUD' | 'AED' | 'SGD';
/** Sample conversion rates: 1 unit of currency = N rupees. Not live exchange rates. */
export const inrPerUnit: Record<CurrencyCode, number> = { INR:1, USD:83, GBP:105, EUR:90, CAD:61, AUD:55, AED:22.6, SGD:62 };
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
  if (['/','/services','/track','/profile','/welcome','/login'].includes(page)) return true;
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
export const services = [
 { id:'website', name:'Business website', category:'Web development', base:20000, tag:'MOST POPULAR', description:'A fast, beautifully crafted website that turns visitors into customers.', type:'web', delivery:'15–20 working days', features:['Up to 8 custom-designed pages','Mobile-first responsive design','Search engine optimisation','Contact forms & analytics','30 days of post-launch support'] },
 { id:'mobile', name:'Mobile app', category:'App development', base:60000, tag:'', description:'Bring your business to your customers’ fingertips with a custom mobile experience.', type:'mobile', delivery:'40–60 working days', features:['Custom Android & iOS experience','User flows & interface design','API integration','Quality assurance & testing','30 days of post-launch support'] },
 { id:'ecommerce', name:'E-commerce store', category:'Commerce', base:35000, tag:'', description:'A seamless online storefront, built to make every purchase feel effortless.', type:'shop', delivery:'20–30 working days', features:['Product catalogue setup','Cart & checkout experience','Inventory management','Mobile-friendly storefront','30 days of post-launch support'] },
 { id:'branding', name:'Brand identity', category:'Design & branding', base:10000, tag:'', description:'A distinctive identity that makes your business impossible to overlook.', type:'brand', delivery:'7–10 working days', features:['Logo design concepts','Brand colour & typography system','Social media templates','Brand guidelines document','Two rounds of refinement'] },
];
export const initialOffers: Offer[] = [
 {id:'OFF-1042',title:'Business website for Bloom Studio',service:'Business website',base:20000,price:30000,status:'Active',date:'2026-10-08'},
 {id:'OFF-1043',title:'Online store for Urban Roots',service:'E-commerce store',base:35000,price:48000,status:'Pending approval',date:'2026-10-10'},
 {id:'OFF-1044',title:'Brand identity for The Daily Brew',service:'Brand identity',base:10000,price:16000,status:'Draft',date:'2026-10-11'},
 {id:'OFF-1039',title:'Starter website package',service:'Business website',base:20000,price:20000,status:'Rejected',date:'2026-10-05',reason:'Selling price must be above the approved Socilet base price.'},
];
