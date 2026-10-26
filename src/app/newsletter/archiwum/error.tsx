'use client';

import Link from 'next/link';

export default function NewsletterArchiveError() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-16">
      <div className="mx-auto max-w-lg rounded-2xl bg-white p-8 text-center shadow-sm">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">Nie udało się otworzyć archiwum</h1>
        <p className="mb-6 text-gray-600">Archiwum jest chwilowo niedostępne. Spróbuj ponownie za chwilę.</p>
        <a href="/newsletter/archiwum" className="block rounded-lg bg-primary-600 px-6 py-3 text-white hover:bg-primary-700">Spróbuj ponownie</a>
        <Link href="/newsletter" className="mt-4 inline-block text-primary-700 hover:underline">Wróć do newslettera</Link>
      </div>
    </div>
  );
}
