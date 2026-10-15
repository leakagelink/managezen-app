/**
 * Trusted client IP for rate limiting.
 * The app runs on Cloudflare Workers; Cloudflare's edge always overwrites `cf-connecting-ip`.
 * `x-forwarded-for`, `x-real-ip` etc. are client-controllable and never read.
 * Invalid or missing value → shared 'untrusted' bucket (fails closed: stricter, not looser).
 */
export function isIPv4(s: string): boolean {
  const p = s.split('.');
  return p.length === 4 && p.every(o => /^(0|[1-9]\d{0,2})$/.test(o) && Number(o) <= 255);
}

export function isIPv6(s: string): boolean {
  if (s.length > 45 || !s.includes(':') || /:::/.test(s)) return false;
  let groups = s;
  let need = 8;
  const lastColon = s.lastIndexOf(':');
  const tail = s.slice(lastColon + 1);
  if (tail.includes('.')) { // embedded IPv4, e.g. ::ffff:192.0.2.1
    if (!isIPv4(tail)) return false;
    groups = s.slice(0, lastColon + 1) + '0:0';
  }
  const dbl = groups.split('::');
  if (dbl.length > 2) return false;
  const parts = (x: string) => (x === '' ? [] : x.split(':'));
  const head = parts(dbl[0]!), rest = dbl.length === 2 ? parts(dbl[1]!) : [];
  const all = [...head, ...rest];
  if (!all.every(g => /^[0-9a-fA-F]{1,4}$/.test(g))) return false;
  return dbl.length === 2 ? all.length < need : all.length === need;
}

export function trustedClientIp(get: (name: string) => string | undefined | null): string {
  const ip = (get('cf-connecting-ip') ?? '').trim();
  if (isIPv4(ip)) return ip;
  if (isIPv6(ip)) return ip.toLowerCase();
  return 'untrusted';
}
