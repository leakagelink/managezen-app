# Socilet Affiliate — staging-first release runbook

Status: nothing in this runbook has been run against staging or production yet.

## 1. Pending migration review (read-only checks against production schema, 15 Oct 2026)

| Check | Result |
|---|---|
| Postgres version | 17 — `hashtextextended`, `make_interval`, `pg_advisory_xact_lock` available |
| `public.rate_limits` columns used (`bucket`, `key_hash`, `created_at` default now()) | Match |
| Index `rate_limits_lookup (bucket, key_hash, created_at)` | Exists — covers the count query |
| `rate_limits` RLS on, no table grants to anon/authenticated | OK — only reachable via SECURITY DEFINER function (owner) |
| `consume_rate_limit(text,text,integer,integer)` | Not present yet; app calls it with `_bucket,_key,_max,_hours` (`src/lib/rateLimit.ts`) — match |
| `submit_project_request(text×6)`, `submit_project_request_v2(text×6)` | Exist; currently EXECUTE for PUBLIC/anon/authenticated |
| App caller of `submit_project_request_v2` | Only `src/lib/projectRequest.ts` (server, service role). No browser caller remains in current code |
| v2 calls v1 internally | Both SECURITY DEFINER; revoking v1 from anon does not break v2 |
| `purge_expired_records` clears `rate_limits` > 1 day | Compatible: longest window used is 24h |

Callers of `consume_rate_limit` in new code: deletion request form (`del-ip` 5/h, `del-email` 3/24h) and project request form (`req-ip` 10/h, `req-email` 5/24h).
Note: Supabase default privileges may grant EXECUTE on new functions to anon/authenticated; the migration's explicit REVOKE removes that — verify step 2.3 below.

## 2. Exact rollout order (per environment)

```text
A  apply consume_rate_limit.sql        (additive; old published code ignores it)
B  verify A
C  publish the new app code            (both forms now use server functions + limiter)
D  verify both forms on the published site
E  apply lock_public_project_request.sql (removes direct browser RPC)
F  verify direct anon RPC is refused and the form still works
```

Why: new code fails closed ("Too many requests") without A, so A must precede C. E before C would break the old published project form (it calls the RPC from the browser). Between C and E direct browser submission is still possible — keep that window to minutes.
Rollback: C → republish previous version only before E. After E, rolling back code requires re-granting EXECUTE to anon (`GRANT EXECUTE ON FUNCTION public.submit_project_request_v2(text,text,text,text,text,text) TO anon, authenticated;`).

## 3. Create a separate staging backend

Lovable Cloud gives each project exactly one backend; preview and published site share it. Staging must be a separate project:
1. In Lovable, **Remix** this project (creates a new project with its own Cloud database, storage, auth and secrets). Do not copy data.
2. In the staging project confirm the backend is a different instance (project settings → Cloud). Never paste production keys into it.
3. Re-apply all database migrations in order from this repo's `drizzle/migrations` (remix carries code; confirm schema in the staging Cloud view), then the two pending files (steps A and E).
4. Create the private storage bucket `project-files` (no public access) if not present.
5. Create test accounts only in staging: one admin (insert into `user_roles` manually), one reseller, one referrer. Use `@example.com` emails.
6. For live tests, from a local machine set (staging values only):
   `LIVE_DB_TESTS=1`, `TEST_SUPABASE_URL`, `TEST_SUPABASE_PUBLISHABLE_KEY`, `TEST_SUPABASE_SERVICE_ROLE_KEY`.
   `src/lib/liveGuard.ts` refuses the production project; there is no override. The staging service key is only available to the staging project's server runtime — if it cannot be exported, run verification through the staging app UI and read-only SQL in the staging Cloud view instead.

## 4. Staging verification steps

### 4.1 Migration A
1. `select has_function_privilege('anon','public.consume_rate_limit(text,text,integer,integer)','execute');` → **false**; same for `authenticated` → false; `service_role` → true.
2. As service role: `select public.consume_rate_limit('t','k',3,1)` ×4 → true,true,true,false.
3. `select public.consume_rate_limit('t','k',0,1)` → false; `(null,'k',1,1)` → false.

### 4.2 Deletion request form (`/delete-account`, signed out)
1. Submit with a test email → generic message; one `deletion_requests` row.
2. Submit same email 3 more times → 4th returns "Too many requests"; still one open row.
3. Submit 6 different emails from one connection within an hour → 6th refused.
4. Temporarily `REVOKE EXECUTE ON FUNCTION public.consume_rate_limit(...) FROM service_role` (staging only) → form shows "Too many requests" (fail closed), no row created, no database error text visible. Re-grant afterwards.

### 4.3 Project request form (`/offer/<code>` for an Active staging offer)
1. Submit normally → tracking ID shown; row in `project_requests`.
2. Submit 5 times with the same email → 6th shows the "Too many requests" message.
3. Submit 11 times from one connection (different emails) within an hour → 11th refused.
4. Inactive/unknown offer code → "This offer is not live yet".
5. Limiter unavailable (same revoke as 4.2.4) → friendly failure, no row.

### 4.4 Concurrency
From a shell with staging service key: fire 30 parallel `rpc('consume_rate_limit', {_bucket:'c',_key:'k',_max:10,_hours:1})` → exactly 10 `true`; `select count(*) from rate_limits where bucket='c'` → 10.
Then 30 parallel form submissions (script against staging site, one IP) → at most 10 new `project_requests`.

### 4.5 After migration E
1. With the staging publishable key (anon): `rpc('submit_project_request_v2', …)` → permission denied. Same for `submit_project_request`.
2. Form in 4.3.1 still succeeds.

### 4.6 File uploads
1. Submit with 2 valid images → both listed as attachments (admin view), files in private bucket.
2. Disallowed type (e.g. `.exe`) or >10 MB → rejected before upload.
3. Replay the same upload token after success → refused.
4. Simulate failure (revoke storage write in staging or use a 0-byte invalid file mid-batch) → request kept, "files could not be uploaded" message, no orphan objects; retry with the same token within limits succeeds (`upload_attempts` < 3).
5. Upload retries are not counted against the request rate limit.

### 4.7 Account deletion
1. Signed-in reseller with an offer, notification and request files → Delete account → login fails afterwards; profile/offers/notifications gone; files removed; completed referrals/approved payouts anonymised.
2. Failure path: make storage removal fail (staging) → job `Failed`, login still blocked, Auth user still exists; restore and retry → `Done`, user deleted.
3. Stale job: set job `status='Running', updated_at=now()-interval '11 minutes'` → retry reclaims and completes. With `updated_at=now()` → returns busy.
4. Public flow: request → admin creates verification link → open link → Verified → admin processes → Completed; `audit_log` shows requester for verification and the admin UUID for later steps.
5. Then run `LIVE_DB_TESTS=1 bunx vitest run src/lib/security.live.test.ts` with staging env vars.

## 5. Production rollout (only with explicit approval)
1. All of section 4 passed on staging, results recorded.
2. Apply A to production; run 4.1 checks read-only (privilege checks only — no test inserts).
3. Publish the new code.
4. One real-world smoke test of each form using a staff email; delete nothing else.
5. Apply E; verify 4.5.1 with the anon key (expect permission denied — writes nothing).
6. Monitor `rate_limits` growth and form error reports for 24h.
