import { isRateLimited, type RpcFn } from './rateLimit';

/** Limits for the public project-request form. Generous for real clients, tight for bots. */
export const PROJECT_REQUEST_LIMITS = { ipPerHour: 10, emailPerDay: 5 } as const;

export type ProjectRequestInput = { code: string; name: string; email: string; phone: string; country: string; requirements: string };
export type ProjectRequestResult =
  | { ok: true; tracking: string; uploadToken: string }
  | { ok: false; reason: 'limited' | 'offer' | 'name' | 'email' | 'input' | 'unavailable' };

export function cleanProjectRequest(d: Partial<Record<keyof ProjectRequestInput, unknown>>): ProjectRequestInput {
  const s = (v: unknown, n: number) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ' ').trim().slice(0, n);
  return { code: s(d.code, 40), name: s(d.name, 100), email: s(d.email, 255).toLowerCase(), phone: s(d.phone, 20), country: s(d.country, 2).toUpperCase(), requirements: s(d.requirements, 2000) };
}

/**
 * Rate-limits (atomic, fail-closed) then submits. Never returns raw database errors.
 * Uploads are unaffected: they use the one-time upload token from the result, not this limiter.
 */
export async function submitProjectRequestCore(rpc: RpcFn, input: ProjectRequestInput, ipHash: string, emailHash: string): Promise<ProjectRequestResult> {
  if (await isRateLimited(rpc, 'req-ip', ipHash, PROJECT_REQUEST_LIMITS.ipPerHour, 1)) return { ok: false, reason: 'limited' };
  if (await isRateLimited(rpc, 'req-email', emailHash, PROJECT_REQUEST_LIMITS.emailPerDay, 24)) return { ok: false, reason: 'limited' };
  try {
    const { data, error } = await rpc('submit_project_request_v2', {
      _offer_code: input.code, _name: input.name, _email: input.email, _phone: input.phone, _country: input.country, _requirements: input.requirements,
    });
    const row = Array.isArray(data) ? (data[0] as { tracking_code?: string; upload_token?: string } | undefined) : undefined;
    if (!error && row?.tracking_code && row.upload_token) return { ok: true, tracking: row.tracking_code, uploadToken: row.upload_token };
    const m = String((error as { message?: string } | null)?.message ?? '');
    if (m.includes('Offer not available')) return { ok: false, reason: 'offer' };
    if (m.includes('Invalid email')) return { ok: false, reason: 'email' };
    if (m.includes('Invalid name')) return { ok: false, reason: 'name' };
    if (m.includes('Invalid input')) return { ok: false, reason: 'input' };
    return { ok: false, reason: 'unavailable' };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}
