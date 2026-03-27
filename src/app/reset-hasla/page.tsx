'use client';

import Link from 'next/link';
import { KeyRound } from 'lucide-react';

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4 flex items-center justify-center">
      <div className="max-w-lg mx-auto">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <KeyRound className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Reset hasła</h1>

          <p className="text-slate-300 mb-6">
            Aby zresetować hasło, skontaktuj się z nami:
          </p>
          <a href="mailto:kontakt@wydarzeniakatolickie.pl" className="text-amber-400 hover:text-amber-300 font-medium">
            kontakt@wydarzeniakatolickie.pl
          </a>

          <div className="mt-8">
            <Link href="/logowanie" className="text-slate-400 hover:text-white transition-colors">
              ← Wróć do logowania
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
