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
    <PageHeading title="Privacy Policy" description={`${APP_NAME} · Last updated: 15 October 2026`}/>
    <Block title="Who we are"><p>{APP_NAME} ({SITE_URL}) is operated by Socilet, India. It lets partners refer, resell and track digital services such as websites, mobile apps and brand identity. This policy explains what information we collect, why, and the choices you have.</p></Block>
    <Block title="Information we collect">
      <p>• Account details you give us at signup: legal name, email address, mobile number, country and preferred earnings currency. If you use Google Sign-In, we receive your name and email from Google.</p>
      <p>• Content partners create in the app: offers and prices, referral details (client name, client contact and service), and payout requests (amount, payout method and the payout details you enter).</p>
      <p>• Project requests from clients who open an offer link: name, email, phone number (optional), country and project requirements.</p>
      <p>• Files clients choose to attach to a project request: logos, images and other supported files (images, PDF, DOC, ZIP, TXT; up to 5 files, 10 MB each).</p>
      <p>• Account deletion requests: email address and the optional reason you give.</p>
      <p>• Technical data needed to run the service securely, such as login session information. When someone submits a project request or deletion request, we turn their IP address into a one-way hash (we do not store the raw IP) and use it only to limit abuse; these entries are cleared automatically after about one day.</p>
      <p>We do not collect your precise location or contacts, and we do not show third-party advertising.</p>
    </Block>
    <Block title="How we use your information">
      <p>• To create and secure your account and show your earnings in your chosen currency.</p>
      <p>• To review offers, track projects, calculate commissions and review payout requests.</p>
      <p>• To understand and deliver client projects, including using attached files (for example a logo) as project material.</p>
      <p>• To send in-app service notifications, such as offer approval updates.</p>
      <p>• To prevent spam and abuse of public forms.</p>
      <p>We never sell your personal information to anyone.</p>
    </Block>
    <Block title="Sharing of information"><p>Your information is visible to the Socilet team members who operate the service and is processed by the infrastructure providers that host the app, its database and file storage, strictly to run the service. Attached project files are stored privately and can be opened only by Socilet administrators. Partners see only their own records. Public project tracking pages show only the tracking ID, service, stage, progress and last update — never customer contact details or financial information. If you use the WhatsApp share button, the message you choose to share is sent through WhatsApp under WhatsApp’s own terms.</p></Block>
    <Block title="Data retention and security"><p>We keep account information while your account is active. Project requests and attached files are kept while needed to deliver and support the project, until you ask us to delete them or delete your account; there is currently no fixed automatic deletion schedule for them. Notifications are kept until your account is deleted. Closed deletion requests are removed automatically after one year. Hashed abuse-prevention entries are removed after about one day. Data is sent over encrypted (HTTPS) connections, and database access rules ensure users can only see their own data.</p></Block>
    <Block title="Your rights and choices"><p>You can view and update your profile in the app at any time. You can delete your account at any time from <Link to="/delete-account" className="font-semibold text-primary">{SITE_URL.replace('https://','')}/delete-account</Link> (Profile → Support → Delete account). When signed in, deletion permanently removes your login, profile, offers, notifications, pending, approved or rejected referrals and pending or rejected payout requests, and anonymises project requests made with your email, including deleting uploaded files. Completed referral commissions and approved payout records are kept, with client names removed, for tax and accounting obligations (we intend to keep them for up to 8 years) and are visible only to Socilet administrators; they are not yet deleted automatically at the end of that period. If you cannot sign in, submit a request on the same page; we verify it by emailing a 48-hour link from {SUPPORT_EMAIL} to your email and complete it within 30 days of verification. Clients who sent a project request without an account can ask for deletion by writing to {SUPPORT_EMAIL}.</p></Block>
    <Block title="Services we use"><p>Accounts, data and files are stored with our cloud hosting provider. Google Sign-In is used if you choose it. Currency rates are fetched from a public exchange-rate service (no personal data is sent). Error reports from the app may include technical details such as the page and browser. We do not sell personal data or show ads.</p></Block>
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
