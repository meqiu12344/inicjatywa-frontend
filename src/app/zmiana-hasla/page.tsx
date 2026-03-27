'use client';

import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

export default function ChangePasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4 flex items-center justify-center">
      <div className="max-w-lg mx-auto">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Zmiana hasła</h1>

          <p className="text-slate-300 mb-6">
            Zmianę hasła możesz wykonać w ustawieniach profilu.
          </p>

          <Link href="/profil" className="inline-block px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors">
            Przejdź do profilu
          </Link>

          <div className="mt-6">
            <Link href="/" className="text-slate-400 hover:text-white transition-colors text-sm">
              ← Strona główna
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
