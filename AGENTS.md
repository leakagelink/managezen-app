<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Accounts, profiles, roles and offers live in Lovable Cloud with RLS; roles sit in a separate user_roles table (admin granted only manually) because client-side roles are forgeable. Signed-out visitors get a labelled sample mode with a demo role switcher.
- Keep business rules and sample records in browser-safe library modules, with reusable screen components shared by individual TanStack content routes.
- Payments, commissions and payouts stay simulated; never represent them as live transactions.
- Present all routes in a shared compact app viewport with bottom navigation and an accessible menu on every screen size, so desktop preview preserves the mobile experience.
- Signed-in users see live screens from src/components/socilet/live.tsx (referrals, earnings/payouts, projects, notifications, admin queues); signed-out visitors keep sample screens. Public tracking uses the track_project database function so only non-private fields leave the database.
- Client attachments upload only via the `uploadRequestFiles` server function (token + atomic claim with upload_state, verified objects, cleanup on failure); never re-open anonymous storage INSERT — open buckets get abused.
- Financial integrity (base price, locked amounts, status transitions, payout ≤ available) is enforced by database triggers plus an audit_log; UI checks are convenience only.
- Account deletion runs through `runAccountDeletion` (src/lib/accountDeletion.ts): single-flight job, login blocked first and deleted last, every step error-checked; keep its dependency plan in sync with the Privacy Policy and /delete-account text.
- Public deletion requests go through rate-limited server functions with a hashed, 48-hour email verification link; Verified/Processing/Completed can only be set by the server workflow.
- Every privileged status change must carry a verified admin identity (auth.uid() or the server-only svc_update_deletion_request RPC); triggers fail closed and write audit_log, so never bypass them with plain service-role updates.
- Database-writing tests run only with LIVE_DB_TESTS=1 and should target staging (see docs/staging-and-email.md).
