-- NOT APPLIED. Requires consume_rate_limit.sql first. Apply to staging, then production only with explicit approval,
-- and only after the app version that uses the submitProjectRequest server function is published
-- (older published code calls the RPC directly from the browser and would break).
-- Removes direct browser access so the server-side rate limit cannot be bypassed.
REVOKE EXECUTE ON FUNCTION public.submit_project_request(text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.submit_project_request_v2(text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_project_request_v2(text, text, text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.submit_project_request(text, text, text, text, text, text) TO service_role;
