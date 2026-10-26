import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { newsletterApi, NewsletterApiError, NEWSLETTER_ARCHIVE_PATH } from '@/lib/api/newsletter';
import { NewsletterArchiveList } from '@/components/newsletter/NewsletterArchiveList';

export const metadata = { title: 'Archiwum newsletterów — Inicjatywa Katolicka' };

export default async function NewsletterArchivePage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: rawPage = '1' } = await searchParams;
  const page = Number(rawPage);
  if (!/^\d+$/.test(rawPage) || !Number.isSafeInteger(page) || page < 1) notFound();
  const archive = await newsletterApi.archive(page).catch(error => {
    if (error instanceof NewsletterApiError && error.status === 404) notFound();
    throw error;
  });

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-3xl px-4">
        <Link href="/newsletter" className="mb-6 inline-flex items-center gap-2 text-primary-700 hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Newsletter</Link>
        <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
          <BookOpen className="mb-4 h-10 w-10 text-primary-600" aria-hidden="true" />
          <h1 className="text-3xl font-bold text-gray-900">Archiwum newsletterów</h1>
          <p className="mb-6 mt-3 text-gray-600">Przeczytaj poprzednie wydania. Archiwum jest dostępne dla wszystkich, bez logowania i subskrypcji.</p>
          {archive.newsletters.length > 0 ? <NewsletterArchiveList newsletters={archive.newsletters} /> : <p className="rounded-lg bg-gray-50 p-5 text-gray-600">Nie ma jeszcze wysłanych newsletterów. Pierwsze wydanie pojawi się tutaj po wysyłce.</p>}
          {archive.total_pages > 1 && (
            <nav aria-label="Strony archiwum" className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t pt-6 text-sm">
              {page > 1 ? <Link href={`${NEWSLETTER_ARCHIVE_PATH}?page=${page - 1}`} className="font-medium text-primary-700 hover:underline">Nowsze wydania</Link> : <span />}
              <span className="text-gray-600">Strona {page} z {archive.total_pages}</span>
              {page < archive.total_pages ? <Link href={`${NEWSLETTER_ARCHIVE_PATH}?page=${page + 1}`} className="font-medium text-primary-700 hover:underline">Starsze wydania</Link> : <span />}
            </nav>
          )}
        </div>
        <p className="mt-6 text-center text-gray-600">Chcesz otrzymywać nowe wydania? <Link href="/newsletter" className="font-medium text-primary-700 hover:underline">Zapisz się do newslettera</Link>.</p>
      </div>
    </div>
  );
}
