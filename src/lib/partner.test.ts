import { describe, it, expect } from 'vitest';
import { earningsSummary, availablePayout } from './partner';

describe('partner earnings', () => {
  it('pays 20% only on completed referrals', () => {
    const s = earningsSummary([{fee:20000,status:'Completed'},{fee:60000,status:'Approved'}], [], []);
    expect(s.referralEarned).toBe(4000);
  });
  it('counts reseller profit only from active offers', () => {
    const s = earningsSummary([], [{base:20000,price:30000,status:'Active'},{base:10000,price:16000,status:'Pending approval'}], []);
    expect(s.resellerProfit).toBe(10000);
  });
  it('subtracts pending and approved payouts but not rejected ones', () => {
    const s = earningsSummary([{fee:20000,status:'Completed'}], [], [{amount:1000,status:'Pending'},{amount:2000,status:'Rejected'}]);
    expect(availablePayout(s)).toBe(3000);
  });
});
