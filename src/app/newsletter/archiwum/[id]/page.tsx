import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { newsletterApi, NewsletterApiError, NEWSLETTER_ARCHIVE_PATH } from '@/lib/api/newsletter';
import { NewsletterDate } from '@/components/newsletter/NewsletterArchiveList';

export const metadata = { title: 'Newsletter — Archiwum Inicjatywy Katolickiej' };

export default async function ArchivedNewsletterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id) || Number(id) < 1 || !Number.isSafeInteger(Number(id))) notFound();
  const newsletter = await newsletterApi.detail(id).catch(error => {
    if (error instanceof NewsletterApiError && error.status === 404) notFound();
    throw error;
  });

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-3xl px-4">
        <Link href={NEWSLETTER_ARCHIVE_PATH} className="mb-6 inline-flex items-center gap-2 text-primary-700 hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Wróć do archiwum</Link>
        <article className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
          <header className="mb-8 border-b pb-6">
            <p className="mb-2 text-sm text-gray-500"><NewsletterDate value={newsletter.sent_at} /></p>
            <h1 className="text-3xl font-bold text-gray-900 break-words">{newsletter.title}</h1>
          </header>
          <div
            className="break-words text-gray-800 leading-relaxed [&_p]:my-4 [&_a]:text-primary-700 [&_a]:underline [&_img]:max-w-full [&_img]:h-auto [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-bold [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6 [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_table]:block [&_table]:overflow-x-auto [&_td]:p-2 [&_th]:p-2"
            dangerouslySetInnerHTML={{ __html: newsletter.content }}
          />
        </article>
        <p className="mt-6 text-center text-gray-600"><Link href="/newsletter" className="font-medium text-primary-700 hover:underline">Zapisz się do newslettera</Link>, aby otrzymywać kolejne wydania.</p>
      </div>
    </div>
  );
}
