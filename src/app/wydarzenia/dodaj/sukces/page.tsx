'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  CheckCircle,
  Edit,
  Eye,
  Share2,
  ArrowRight,
  Sparkles,
  Clock,
  Mail,
  Star,
} from 'lucide-react';

function EventSuccessContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event');
  const eventSlug = searchParams.get('slug');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 flex items-center justify-center py-12 px-4 relative overflow-hidden">
      {/* Animated background particles */}
      {mounted && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-amber-400/30 rounded-full animate-float"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${3 + Math.random() * 4}s`,
              }}
            />
          ))}
        </div>
      )}

      <div className="max-w-2xl w-full relative z-10">
        {/* Main Card */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-3xl border border-gray-700/50 p-8 sm:p-12 text-center animate-fade-in-up">
          {/* Success Icon */}
          <div className="relative inline-flex mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/30 animate-scale-in">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
            <div className="absolute -top-2 -right-2">
              <Sparkles className="w-8 h-8 text-amber-400 animate-pulse" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Wydarzenie zostało dodane!
          </h1>
          
          {/* Description */}
          <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto">
            Dziękujemy za dodanie wydarzenia. Teraz przejdzie ono proces weryfikacji przez naszych moderatorów.
          </p>

          {/* Status Info */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 mb-8">
            <div className="flex items-start gap-4 text-left">
              <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-400 mb-1">Oczekuje na weryfikację</h3>
                <p className="text-gray-400 text-sm">
                  Twoje wydarzenie zostanie sprawdzone przez moderatorów w ciągu 24 godzin. 
                  Otrzymasz powiadomienie email o zmianie statusu.
                </p>
              </div>
            </div>
          </div>

          {/* Email notification info */}
          <div className="flex items-center justify-center gap-2 text-gray-500 text-sm mb-8">
            <Mail className="w-4 h-4" />
            <span>Powiadomienie email zostanie wysłane po akceptacji</span>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            {eventSlug ? (
              <Link
                href={`/wydarzenia/${eventSlug}`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-colors"
              >
                <Eye className="w-5 h-5" />
                Zobacz podgląd
              </Link>
            ) : eventId ? (
              <Link
                href={`/moje-wydarzenia/${eventId}/edytuj`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-colors"
              >
                <Edit className="w-5 h-5" />
                Edytuj wydarzenie
              </Link>
            ) : null}
            
            <Link
              href="/moje-wydarzenia"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold rounded-xl shadow-lg shadow-amber-500/25 transition-all"
            >
              Moje wydarzenia
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          {/* Additional links */}
          <div className="pt-6 border-t border-gray-700/50">
            <p className="text-gray-500 text-sm mb-4">Co dalej?</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/wydarzenia/dodaj"
                className="text-amber-400 hover:text-amber-300 text-sm font-medium transition-colors"
              >
                + Dodaj kolejne wydarzenie
              </Link>
              <span className="text-gray-700">•</span>
              <Link
                href="/"
                className="text-gray-400 hover:text-white text-sm font-medium transition-colors"
              >
                Wróć na stronę główną
              </Link>
            </div>
          </div>
        </div>

        {/* Tips Section */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <Star className="w-5 h-5 text-amber-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-white mb-1">Promuj wydarzenie</h4>
                <p className="text-gray-500 text-sm">
                  Po akceptacji możesz promować wydarzenie, aby dotrzeć do większej liczby osób.
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <Share2 className="w-5 h-5 text-blue-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-white mb-1">Udostępnij</h4>
                <p className="text-gray-500 text-sm">
                  Podziel się wydarzeniem w mediach społecznościowych i zwiększ jego zasięg.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.5);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
            opacity: 0.3;
          }
          50% {
            transform: translateY(-20px) rotate(180deg);
            opacity: 0.8;
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }
        .animate-scale-in {
          animation: scale-in 0.5s ease-out 0.2s forwards;
          opacity: 0;
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default function EventSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950" />}>
      <EventSuccessContent />
    </Suspense>
  );
}
