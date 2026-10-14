import { Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeading } from './shared';
import { SUPPORT_EMAIL, SITE_URL, APP_NAME } from '@/lib/socilet';

function Block({title, children}:{title:string; children:React.ReactNode}) {
  return <section className="panel p-5"><h2 className="text-sm font-bold">{title}</h2><div className="mt-3 space-y-2 text-xs leading-relaxed text-muted-foreground">{children}</div></section>;
}
function Contact() {
  return <Block title="Contact us"><p>For any question about these policies, your data, or your account, write to us at <a className="font-semibold text-primary" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> or visit <a className="font-semibold text-primary" href={SITE_URL} target="_blank" rel="noreferrer">{SITE_URL}</a>.</p></Block>;
}

export function PrivacyPolicy() {
  return <div className="screen-enter space-y-4">
    <Button asChild variant="ghost" size="sm" className="-ml-2"><Link to="/profile"><ArrowLeft/>Back</Link></Button>
    <PageHeading title="Privacy Policy" description={`${APP_NAME} · Last updated: 14 October 2026`}/>
    <Block title="Who we are"><p>{APP_NAME} ({SITE_URL}) is operated by Socilet, India. It lets partners refer, resell and track digital services such as websites, mobile apps and brand identity. This policy explains what information we collect, why, and the choices you have.</p></Block>
    <Block title="Information we collect">
      <p>• Account details you give us at signup: legal name, email address, mobile number, country and preferred earnings currency.</p>
      <p>• Content you create in the app: offers, referral details, project and payout information.</p>
      <p>• Basic technical data needed to run the service securely, such as login session information.</p>
      <p>We do not collect your precise location, contacts, photos, or files, and we do not show third-party advertising.</p>
    </Block>
    <Block title="How we use your information">
      <p>• To create and secure your account and show your earnings in your chosen currency.</p>
      <p>• To review offers, track projects, calculate commissions and process payout requests.</p>
      <p>• To send important service messages, such as offer approval updates.</p>
      <p>We never sell your personal information to anyone.</p>
    </Block>
    <Block title="Sharing of information"><p>Your information is shared only with the Socilet team members who operate the service, and with the infrastructure providers that host the app and its database, strictly to run the service. Public project tracking pages never show private customer details or financial information.</p></Block>
    <Block title="Data retention and security"><p>We keep your account information while your account is active. We use industry-standard safeguards, including encrypted connections and row-level access controls, so users can only see their own data.</p></Block>
    <Block title="Your rights and choices"><p>You can view and update your profile in the app at any time. You may ask us to correct or delete your account and personal data by emailing <a className="font-semibold text-primary" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. Account deletion removes your profile, offers and referral data, except records we must keep for legal or accounting reasons.</p></Block>
    <Block title="Children"><p>{APP_NAME} is a business tool intended for users aged 18 and above. We do not knowingly collect information from children.</p></Block>
    <Block title="Changes to this policy"><p>If we change this policy, we will update the date above and, for significant changes, notify you in the app or by email.</p></Block>
    <Contact/>
  </div>;
}

export function TermsOfService() {
  return <div className="screen-enter space-y-4">
    <Button asChild variant="ghost" size="sm" className="-ml-2"><Link to="/profile"><ArrowLeft/>Back</Link></Button>
    <PageHeading title="Terms of Service" description={`${APP_NAME} · Last updated: 14 October 2026`}/>
    <Block title="The service"><p>{APP_NAME} ({SITE_URL}) lets approved partners refer clients to Socilet digital services, resell services at their own price, and track project progress. By creating an account you agree to these terms.</p></Block>
    <Block title="Accounts and roles"><p>You must provide accurate signup details (legal name, country, mobile number, currency). Customer, referrer, reseller and admin views are role-specific. Admin access is granted by Socilet only and can never be selected at signup.</p></Block>
    <Block title="Referral commission"><p>Successful, eligible referrals earn 20% of the eligible Socilet service fee. A referral commission is paid only after the referred project is successfully completed and paid.</p></Block>
    <Block title="Reseller offers"><p>Resellers set a selling price above the approved Socilet base price and retain the difference. Every offer must be approved by Socilet admin before it becomes active. A reseller transaction cannot also earn a referral commission.</p></Block>
    <Block title="Payments and advances"><p>All customer project payments are made to Socilet directly. Projects below ₹50,000 (or below US$1,000 for tier-1 countries) qualify for zero advance payment; larger projects require an advance confirmed by Socilet. Payouts of partner earnings are processed after admin approval.</p></Block>
    <Block title="Service pricing and inclusions"><p>Published service prices include 3 months of free maintenance, with no hidden charges and no monthly charges. Hosting, domain and third-party API costs are never included and are paid by the customer when used.</p></Block>
    <Block title="Acceptable use"><p>You agree not to misuse the platform: no false offers, no misleading pricing to customers, no spamming referral links, and no attempt to access other users’ data. We may suspend accounts that break these rules.</p></Block>
    <Block title="Intellectual property"><p>The Socilet name, logo and app content belong to Socilet. Work delivered to customers is governed by the individual project agreement.</p></Block>
    <Block title="Liability"><p>The service is provided “as is”. To the extent permitted by law, Socilet is not liable for indirect losses such as lost profits. Nothing in these terms limits rights you have under applicable Indian consumer law.</p></Block>
    <Block title="Governing law"><p>These terms are governed by the laws of India. Disputes will be handled in the courts of India.</p></Block>
    <Contact/>
  </div>;
}
