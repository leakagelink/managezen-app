# Build the Play Store app bundle (Windows / PowerShell)

The Android project is in `android/` (Capacitor). It loads the live site `https://affiliate.socilet.in`,
so publish the latest web version first. Package: `in.socilet.affiliate`, targetSdk 36, minSdk 24, only INTERNET permission.

## One-time setup
1. Install Android Studio (includes JDK 17+ and Android SDK 36).
2. Get the project on your PC (GitHub sync from Lovable), then in PowerShell:
   ```powershell
   cd socilet-affiliate
   npm install
   npx cap sync android
   ```
3. Open `android` folder in Android Studio and let Gradle sync.
4. App icon: right-click `app/res` → New → Image Asset → choose the Socilet logo (512×512 PNG).

## Create the signing key (keep it safe — losing it blocks future updates)
```powershell
keytool -genkey -v -keystore socilet-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias socilet
```
Store `socilet-upload.jks` and passwords outside the project. Never commit them.

## Build the .aab
Android Studio → Build → Generate Signed App Bundle → Android App Bundle → select the keystore → release.
Output: `android\app\release\app-release.aab`. For each update raise `versionCode` in `android\app\build.gradle`.

## Play Console checklist
- Enrol in Play App Signing; upload the .aab to Internal testing first.
- New personal developer accounts: closed test with 12 testers for 14 days before production.
- Privacy policy URL: https://affiliate.socilet.in/privacy
- Account deletion URL: https://affiliate.socilet.in/delete-account
- Data safety: name, email, phone, country, user IDs; financial info (payout amounts/details entered by user); files & photos (project attachments); app interactions. Encrypted in transit: yes. Users can request deletion: yes. Data sold: no. Ads: no.
- App access: give reviewers a test reseller account (not the real admin).
- Content rating questionnaire; target audience 18+; no ads.
- Financial features declaration: no in-app payments, no loans; partner payouts are handled outside the app.
