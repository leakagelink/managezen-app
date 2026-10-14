import { referralCommission, resellerQuote, type Offer } from './socilet';

export type ReferralRow = { id:string; user_id:string; client_name:string; client_contact:string; service:string; fee:number; status:string; created_at:string };
export type PayoutRow = { id:string; user_id:string; amount:number; method:string; details:string; status:string; created_at:string };

/** Earnings in INR: reseller profit from Active offers + 20% on Completed referrals. Rejected payouts don't count as requested. */
export function earningsSummary(referrals:Pick<ReferralRow,'fee'|'status'>[], offers:Pick<Offer,'base'|'price'|'status'>[], payouts:Pick<PayoutRow,'amount'|'status'>[]) {
  const referralEarned = referrals.reduce((t,r)=>t+referralCommission(Number(r.fee),true,r.status==='Completed'),0);
  const resellerProfit = offers.filter(o=>o.status==='Active').reduce((t,o)=>t+resellerQuote(o.base,o.price).profit,0);
  const requested = payouts.filter(p=>p.status!=='Rejected').reduce((t,p)=>t+Number(p.amount),0);
  return { referralEarned, resellerProfit, requested, total: referralEarned + resellerProfit };
}
export const availablePayout = (s:{total:number; requested:number}) => Math.max(0, s.total - s.requested);
export const whatsappShareUrl = (url:string) => `https://wa.me/?text=${encodeURIComponent(`Get your website, app or branding built by Socilet: ${url}`)}`;
