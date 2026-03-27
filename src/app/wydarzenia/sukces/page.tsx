'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Calendar, Eye, Plus, Home, ArrowRight, Sparkles } from 'lucide-react';

function ThankYouContent() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event');
  const eventSlug = searchParams.get('slug');
  const isPending = searchParams.get('pending') === 'true';
  
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    // Trigger confetti animation
    setShowConfetti(true);
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 flex items-center justify-center py-12 px-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {showConfetti && (
          <>
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 2}s`,
                }}
              >
                <Sparkles 
                  className="w-6 h-6" 
                  style={{ 
                    color: ['#fbbf24', '#f59e0b', '#d97706', '#92400e', '#78350f'][Math.floor(Math.random() * 5)] 
                  }} 
                />
              </div>
            ))}
          </>
        )}
      </div>

      <div className="max-w-xl w-full text-center relative z-10">
        {/* Success Icon */}
        <div className="mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/30 animate-bounce-slow">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-3xl border border-gray-700/50 p-8 sm:p-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            {isPending ? 'Wydarzenie dodane!' : 'Gratulacje!'}
          </h1>
          
          <p className="text-lg text-gray-300 mb-8">
            {isPending 
              ? 'Twoje wydarzenie zostało pomyślnie dodane i oczekuje na weryfikację przez nasz zespół. Powiadomimy Cię o akceptacji.'
              : 'Twoje wydarzenie zostało pomyślnie utworzone i jest już widoczne dla użytkowników!'
            }
          </p>

          {/* Status Badge */}
          {isPending && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 border border-amber-500/30 rounded-full text-amber-400 text-sm font-medium mb-8">
              <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              Oczekuje na weryfikację
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {eventSlug && (
              <Link
                href={`/wydarzenia/${eventSlug}`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold rounded-xl shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all transform hover:scale-105"
              >
                <Eye className="w-5 h-5" />
                Zobacz wydarzenie
              </Link>
            )}
            
            <Link
              href="/moje-wydarzenia"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-colors"
            >
              <Calendar className="w-5 h-5" />
              Moje wydarzenia
            </Link>
          </div>

          {/* Divider */}
          <div className="my-8 border-t border-gray-700/50" />

          {/* Additional Actions */}
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">Co dalej?</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/wydarzenia/dodaj"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-amber-400 hover:text-amber-300 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Dodaj kolejne wydarzenie
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                <Home className="w-4 h-4" />
                Wróć na stronę główną
              </Link>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-8 bg-gray-800/30 rounded-2xl border border-gray-700/30 p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            Wskazówki
          </h3>
          <ul className="text-sm text-gray-400 space-y-2 text-left">
            <li className="flex items-start gap-2">
              <ArrowRight className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <span>Promuj swoje wydarzenie, aby dotrzeć do większej liczby osób</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <span>Śledź statystyki i zaangażowanie uczestników</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <span>Podziel się linkiem do wydarzenia w mediach społecznościowych</span>
            </li>
          </ul>
        </div>
      </div>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(-10vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950" />}>
      <ThankYouContent />
    </Suspense>
  );
}
