/**
 * Trusted client IP for rate limiting.
 * The app runs on Cloudflare Workers behind Cloudflare's edge, which always overwrites
 * `cf-connecting-ip` with the real connecting address. `x-forwarded-for`, `x-real-ip` etc.
 * are client-controllable there, so they are never used. Without a trusted header every
 * caller shares one 'untrusted' bucket (fails closed: stricter, not looser).
 */
export function trustedClientIp(get: (name: string) => string | undefined | null): string {
  const ip = (get('cf-connecting-ip') ?? '').trim();
  return /^[0-9a-fA-F:.]{3,45}$/.test(ip) ? ip : 'untrusted';
}
