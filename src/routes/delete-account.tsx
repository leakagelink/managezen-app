import { createFileRoute } from '@tanstack/react-router';
import { DeleteAccount } from '@/components/socilet/deleteAccount';
export const Route = createFileRoute('/delete-account')({
  head: () => ({ meta: [
    { title: 'Delete account — Socilet Affiliate' },
    { name: 'description', content: 'Permanently delete your Socilet Affiliate account and personal data, or request deletion if you cannot sign in.' },
    { property: 'og:title', content: 'Delete account — Socilet Affiliate' },
    { property: 'og:description', content: 'How to delete your Socilet Affiliate account and what data is removed or retained.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary' },
  ] }),
  component: DeleteAccount,
});
