/**
 * Atomic rate limit via the `consume_rate_limit` database function (advisory lock + count + insert in
 * one transaction). Any error or unexpected reply counts as "limited" — fails closed.
 */
export type RpcFn = (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>;

export async function isRateLimited(rpc: RpcFn, bucket: string, key: string, max: number, hours: number): Promise<boolean> {
  try {
    const { data, error } = await rpc('consume_rate_limit', { _bucket: bucket, _key: key, _max: max, _hours: hours });
    if (error || typeof data !== 'boolean') return true;
    return !data; // function returns true when the request is allowed
  } catch {
    return true;
  }
}
