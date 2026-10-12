# Managezen App

Build a premium, original UI/UX prototype for the Socilet Partner mobile app, using the attached 13-screen UI mockup as visual inspiration, not as a design to copy pixel-for-pixel.

**Product:** Socilet — Refer, Resell & Track Digital Services.

**Design direction**
- Original, premium fintech-inspired visual language for a digital services business.
- Deep midnight navy, electric indigo, violet gradients, subtle cyan accents, clean white surfaces and restrained glass effects.
- Modern typography, generous whitespace, crisp icons, meaningful visual hierarchy, polished micro-interactions and accessible contrast.
- Create a recognizable Socilet brand identity rather than a generic dashboard template.
- Design mobile-first, with reusable components and responsive layouts.

**Create these screens:**
1. Splash and onboarding.
2. Login, signup and role selection.
3. Home dashboard.
4. Service catalogue and service details.
5. Create custom reseller offer.
6. Interactive pricing calculator with Reseller and Referral modes.
7. Referral dashboard and shareable referral links.
8. My offers and offer approval statuses.
9. Project tracking using a tracking ID.
10. Earnings, commissions and payout history.
11. Customer project dashboard.
12. User profile, payment details and support.
13. Admin dashboard with offer approvals, users, services, projects, payments, commissions and reports.

**Business rules**
- Successful eligible referrals earn 20% commission on the eligible Socilet service fee.
- Resellers set a selling price above the approved Socilet base price and retain the difference. Resellers cannot earn an additional referral commission on the same reseller transaction.
- Projects below ₹50,000 qualify for zero advance payment.
- Projects of ₹50,000 or more require an advance payment.
- All customer project payments go to Socilet.
- Offers require admin approval before becoming active.
- Customer, referrer, reseller and admin views must enforce role-specific access.
- Public tracking must never expose private customer information or financial details.

**Prototype requirements**
- Use realistic Indian rupee amounts and Indian date/number formatting.
- Make the calculator interactive with correct gross-margin and commission calculations.
- Show loading, empty, validation, success, rejection and error states.
- Build reusable cards, buttons, input fields, status badges, navigation and confirmation dialogs.
- Use realistic sample data but do not connect real payment processing or invent successful transactions.
- Keep business logic separate from presentation components.
- Do not claim the prototype is production-ready.
- First generate the design system and core screens, then refine the remaining screens for visual consistency.

If generating a web prototype, clearly identify it as React web UI. Do not pretend it is a React Native application or a production Android build.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5722773d-2009-4284-bbf2-0b030e96fe07).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
