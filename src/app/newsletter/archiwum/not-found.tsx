import Link from 'next/link';

export default function NewsletterArchiveNotFound() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-16">
      <div className="mx-auto max-w-lg rounded-2xl bg-white p-8 text-center shadow-sm">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">Nie znaleziono wydania newslettera</h1>
        <p className="mb-6 text-gray-600">To wydanie lub strona archiwum nie istnieje. W archiwum znajdziesz dostępne newslettery.</p>
        <Link href="/newsletter/archiwum" className="inline-block rounded-lg bg-primary-600 px-6 py-3 text-white hover:bg-primary-700">Przejdź do archiwum</Link>
      </div>
    </div>
  );
}
