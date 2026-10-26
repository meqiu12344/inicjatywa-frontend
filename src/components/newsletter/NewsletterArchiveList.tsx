import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { NEWSLETTER_ARCHIVE_PATH, type NewsletterSummary } from '@/lib/api/newsletter';

const dateFormatter = new Intl.DateTimeFormat('pl-PL', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Warsaw',
});

export function NewsletterDate({ value }: { value: string | null }) {
  if (!value) return <span>Data wysyłki nieznana</span>;
  return <time dateTime={value}>{dateFormatter.format(new Date(value))}</time>;
}

export function NewsletterArchiveList({ newsletters }: { newsletters: NewsletterSummary[] }) {
  return (
    <ul className="divide-y divide-gray-200">
      {newsletters.map(newsletter => (
        <li key={newsletter.id}>
          <Link href={`${NEWSLETTER_ARCHIVE_PATH}/${newsletter.id}`} className="flex items-center justify-between gap-4 rounded-lg px-2 py-4 hover:bg-primary-50 focus-visible:outline-primary-600">
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 break-words">{newsletter.title}</h3>
              <p className="mt-1 text-sm text-gray-500"><NewsletterDate value={newsletter.sent_at} /></p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-primary-600" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
