# Staging, production and verification email

## 1. Separate staging from production
Today preview and the published app share ONE backend (production). To split them:

1. Create a second Lovable project ("Socilet Affiliate – Staging") by remixing this one, and enable Lovable Cloud there. It gets its own URL, keys, database and storage.
2. Migrations live in `drizzle/migrations/` and are applied in order. Applying them to staging recreates the schema; create the private `project-files` bucket (10 MB) there too.
3. Never copy production rows into staging. Create fake data only, with `@example.com` emails.
4. Make the first staging admin by hand (one row in user_roles), with a staging-only email address.
5. Run tests against staging only:
   ```
   LIVE_DB_TESTS=1 TEST_SUPABASE_URL=<staging url> TEST_SUPABASE_PUBLISHABLE_KEY=<staging key> TEST_SUPABASE_SERVICE_ROLE_KEY=<staging service key> bunx vitest run
   ```
   Without `LIVE_DB_TESTS=1` the database-writing tests are skipped. The anonymous checks in `security.test.ts` only attempt actions that must be refused.
6. Test fixtures: tests create `sec-*@example.com` users and delete them afterwards. If a run is interrupted, delete leftover `sec-*` users and any row they left (rows are anonymised or marked Rejected).
7. Release flow: make changes, run the tests on staging, then publish production.

## 2. Send verification emails automatically
The current manual flow (admin opens a ready-made email and sends it from hello@socilet.in) keeps working until this is tested.

1. Set up a sender domain (for example notify.socilet.in) in Cloud → Emails and add the DNS records it shows.
2. Add a transactional "Confirm account deletion" email template.
3. In `startDeletionVerification`, send the email from the server instead of returning the link to the browser. The token must never be returned to the browser, logged, or stored in plain text. Today only its SHA-256 hash is stored; it is single-use (cleared when verified) and expires after 48 hours.
4. Opening the link only marks the request **Verified**. Deletion still needs an admin to press "Delete account data", which runs the deletion job and marks the request Completed only after the job succeeds.
5. Remove the manual email button only after real emails have been delivered and verified end to end.

## Production guard (enforced in code)
- `src/lib/security.live.test.ts` has no default backend. With `LIVE_DB_TESTS=1` it refuses to run unless `TEST_SUPABASE_URL` points to a non-production project (production ref is blocked; override `ALLOW_PROD_DB_TESTS=yes-i-am-sure` exists only for an explicitly approved run).
- It only uses `TEST_SUPABASE_SERVICE_ROLE_KEY`, never the app's own `SUPABASE_SERVICE_ROLE_KEY`.
- Routine `vitest run` never writes to any database.

## Staging status (not yet created)
Lovable Cloud gives this project one backend that serves both preview and the published site, so the editor preview IS production data. A separate staging backend cannot be created from inside this project. Options:
1. Remix the project in Lovable (creates a new project with its own Cloud backend, storage and secrets), re-apply the migrations from `supabase/migrations/` there, and use it as staging.
2. Use Lovable drafts for schema changes; draft backends are isolated until accepted.
Then set `TEST_SUPABASE_URL`, `TEST_SUPABASE_PUBLISHABLE_KEY`, `TEST_SUPABASE_SERVICE_ROLE_KEY` to the staging values when running live tests.

## Client IP trust
The app runs on Cloudflare Workers; only `cf-connecting-ip` (set by Cloudflare's edge) is trusted for rate limiting. `x-forwarded-for` is ignored. Missing header → shared `untrusted` bucket (stricter).
