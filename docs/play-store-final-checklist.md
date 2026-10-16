# Play Store final checklist — status 15 Oct 2026 (read-only checks)

| Item | Status | Evidence / action |
|---|---|---|
| `consume_rate_limit` in production | PASS | Present, SECURITY DEFINER, search_path=public; anon/authenticated EXECUTE = false, service_role = true. Anonymous call returned "permission denied" |
| Lock migration (`lock_public_project_request.sql`) | BLOCKED | Not applied: anon/authenticated can still EXECUTE `submit_project_request` and `_v2`. Needs: publish new code, then your approval |
| Published site uses server-side form submission | NOT VERIFIED | Cannot confirm from the bundled site; check after publishing |
| Upload/deletion RPCs restricted to server | PASS | `attach_request_files`, `claim_request_upload`, `svc_update_deletion_request`: browser roles denied |
| Staging backend | BLOCKED | Does not exist. Create by remixing the project (see release-runbook §3) |
| Live DB tests | BLOCKED | 8 skipped; guard refuses production |
| Unit tests `bunx vitest run` | PASS | 85 passed, 8 skipped (mostly fake/mock DB; a few read-only checks against production as a signed-out caller) |
| Type check `bunx tsgo --noEmit` | PASS | exit 0 |
| Public URLs `/`, `/privacy`, `/terms`, `/delete-account` | PASS | HTTP 200 on affiliate.socilet.in |
| Android project identity | PASS | `in.socilet.affiliate`, minSdk 24, target/compile 36, AGP 8.13, Gradle 8.14.3, INTERNET only |
| Android backups | PASS (changed) | `allowBackup=false` so sign-in data isn't copied to cloud backups |
| Signing secrets kept out of git | PASS | `*.jks`, `*.keystore`, `keystore.properties` ignored; only the `.example` file is tracked |
| Signed AAB | BLOCKED | No Java/Android SDK here. Build on your PC |
| Launcher icon | PASS (changed) | Socilet logo icons generated for all densities + adaptive foreground, navy background |
| Real-device test | BLOCKED | Your PC/phone |
| Retention periods (8 y financial, 1 y deletion requests) | NOT VERIFIED | Need legal review |
| Verification emails | Manual | Admin sends the link by hand; reply within Play's stated deletion timeframe |

## On your Windows PC (PowerShell)
```powershell
npm install; npx cap sync android
keytool -genkey -v -keystore $HOME\keys\socilet-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias socilet
Copy-Item android\keystore.properties.example android\keystore.properties   # fill in privately
cd android; .\gradlew.bat bundleRelease
jarsigner -verify -verbose -certs app\build\outputs\bundle\release\app-release.aab
```
Back up the `.jks` and passwords offline (two places). Upload to **Internal testing**, install via the Play link on a real phone, and test: Google + email login, bottom navigation and back button, project form with file upload, tracking, WhatsApp share, delete account, airplane mode (offline page).

## Play Console
- Privacy: https://affiliate.socilet.in/privacy · Deletion: https://affiliate.socilet.in/delete-account
- App access: a dedicated reviewer reseller account (never admin)
- Data safety: name, email, phone, country, user IDs, payout details, uploaded files, IP (hashed, abuse prevention); encrypted in transit; deletion available; no selling, no ads
- Content rating, 18+, category Business; screenshots and 512px icon
- Check in your console whether closed testing (12 testers / 14 days) applies to your account type

## Needs your explicit approval (production)
1. Publish the current code. 2. Apply the lock migration, then confirm anonymous calls are denied and the form still works.
