'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { XCircle } from 'lucide-react';

function TicketPurchaseCancelContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get('order_number');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4 flex items-center justify-center">
      <div className="max-w-lg mx-auto">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Zakup anulowany</h1>
          <p className="text-slate-300 mb-6">
            Płatność została anulowana. Możesz spróbować ponownie.
          </p>
          {orderNumber && (
            <div className="text-sm text-slate-400 mb-6 bg-slate-700/50 rounded-lg px-4 py-2 inline-block">
              Numer zamówienia: <span className="font-semibold text-white">{orderNumber}</span>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/" className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors">
              Przeglądaj wydarzenia
            </Link>
            <Link href="/moje-bilety" className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium rounded-xl transition-colors">
              Moje bilety
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TicketPurchaseCancelPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 py-12 px-4" />}>
      <TicketPurchaseCancelContent />
    </Suspense>
  );
}
