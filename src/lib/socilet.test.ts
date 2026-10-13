import { describe, expect, it } from 'vitest';
import { resellerQuote, referralCommission, requiresAdvance, canAccess, publicProject } from './socilet';
describe('Socilet business rules',()=>{
 it('awards exactly 20% for eligible successful referrals',()=>expect(referralCommission(20000,true,true)).toBe(4000));
 it('does not award ineligible or unsuccessful commissions',()=>{expect(referralCommission(20000,false,true)).toBe(0);expect(referralCommission(20000,true,false)).toBe(0)});
 it('resellers retain difference and calculate gross margin on selling price',()=>{expect(resellerQuote(20000,30000)).toEqual({valid:true,profit:10000,margin:10000/30000*100,commission:0})});
 it('requires reseller selling price strictly above base',()=>{expect(resellerQuote(20000,20000).valid).toBe(false);expect(resellerQuote(20000,19000).valid).toBe(false)});
 it('never adds a referral commission to reseller transactions',()=>expect(referralCommission(30000,true,true,true)).toBe(0));
 it('requires zero advance below ₹50,000',()=>expect(requiresAdvance(49999)).toBe(false));
 it('requires advance at ₹50,000 and above',()=>{expect(requiresAdvance(50000)).toBe(true);expect(requiresAdvance(60000)).toBe(true)});
 it('limits role-specific demo views',()=>{expect(canAccess('customer','/admin')).toBe(false);expect(canAccess('reseller','/admin')).toBe(false);expect(canAccess('admin','/admin')).toBe(true);expect(canAccess('reseller','/referrals')).toBe(false);expect(canAccess('referrer','/offers')).toBe(false);expect(canAccess('customer','/projects')).toBe(true)});
 it('public tracking omits private customer and financial fields',()=>{const result=publicProject('SOC-2026-8X72K');expect(result).not.toBeNull();expect(Object.keys(result??{}).sort()).toEqual(['id','progress','service','stage','steps','updated']);expect(publicProject('unknown')).toBeNull()});
});
import { requiresAdvance as adv, formatMoney } from './socilet';
describe('Country advance and currency rules',()=>{
 it('India: zero advance below ₹50,000',()=>{expect(adv(49999,'IN')).toBe(false);expect(adv(50000,'IN')).toBe(true)});
 it('Tier-1: zero advance below $1,000',()=>{expect(adv(82999,'US')).toBe(false);expect(adv(83000,'US')).toBe(true)});
 it('shows earnings in selected currency',()=>expect(formatMoney(8300,'USD')).toBe('$100.00'));
});
