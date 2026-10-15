-- APPLIED to production on 15 Oct 2026 (drizzle/migrations/0009_consume_rate_limit.sql) with owner approval.
-- Atomic rate limit: per-key advisory lock serialises concurrent callers, so count+insert cannot race.
CREATE OR REPLACE FUNCTION public.consume_rate_limit(_bucket text, _key text, _max integer, _hours integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n integer;
BEGIN
  IF _bucket IS NULL OR _key IS NULL OR _max < 1 OR _hours < 1 THEN RETURN false; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(_bucket || ':' || _key, 0));
  SELECT count(*) INTO n FROM public.rate_limits
   WHERE bucket = _bucket AND key_hash = _key AND created_at >= now() - make_interval(hours => _hours);
  IF n >= _max THEN RETURN false; END IF;
  INSERT INTO public.rate_limits(bucket, key_hash) VALUES (_bucket, _key);
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.consume_rate_limit(text, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, text, integer, integer) TO service_role;
