'use client';

import Link from 'next/link';
import { Wallet } from 'lucide-react';

export default function OrganizerPayoutPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <Wallet className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-900">Panel wypłat</h1>
          </div>
          <p className="text-gray-700 mb-4">
            Panel wypłat organizatora jest w trakcie migracji.
          </p>
          <Link href="/moje-wydarzenia" className="text-indigo-600 hover:underline">
            ← Wróć do moich wydarzeń
          </Link>
        </div>
      </div>
    </div>
  );
}
