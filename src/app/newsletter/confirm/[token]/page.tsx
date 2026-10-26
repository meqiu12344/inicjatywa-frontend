import { redirect } from 'next/navigation';

export default async function LegacyNewsletterConfirmationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  redirect(`/newsletter/potwierdz/${encodeURIComponent(token)}`);
}
