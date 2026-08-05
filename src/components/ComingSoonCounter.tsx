'use client';

import { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import Image from 'next/image';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function ComingSoonCounter() {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const calculateTimeLeft = () => {
      // Target: Friday, August 7, 2026, 12:00 PM (noon)
      const targetDate = new Date('2026-08-07T12:00:00').getTime();
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, []);

  if (!mounted || !timeLeft) {
    return null;
  }

  return (
    <div className="relative h-[100dvh] w-full bg-gradient-to-br from-slate-50 via-primary-50 to-slate-50 flex items-center justify-center px-3 sm:px-4 py-2 sm:py-4 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Animated gradient orbs - Responsive sizes */}
        <div className="absolute -top-32 -right-20 w-56 h-56 sm:w-72 sm:h-72 md:w-80 md:h-80 bg-primary-300 rounded-full blur-3xl opacity-15 sm:opacity-20 animate-pulse" />
        <div className="absolute -bottom-40 -left-32 w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 bg-sky-300 rounded-full blur-3xl opacity-10 sm:opacity-20 animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/3 w-40 h-40 sm:w-64 sm:h-64 md:w-72 md:h-72 bg-primary-200 rounded-full blur-3xl opacity-10 sm:opacity-15 animate-pulse" style={{ animationDelay: '4s' }} />
        
        {/* Floating particles - Hidden on mobile */}
        <div className="hidden sm:block absolute top-1/4 right-1/4 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary-600 rounded-full opacity-40 sm:opacity-60 animate-ping" style={{ animationDuration: '3s' }} />
        <div className="hidden sm:block absolute top-1/3 right-1/3 w-1 h-1 bg-sky-600 rounded-full opacity-30 sm:opacity-50 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '1s' }} />
        <div className="hidden md:block absolute bottom-1/3 left-1/4 w-1.5 h-1.5 bg-primary-600 rounded-full opacity-40 animate-ping" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }} />
        <div className="hidden lg:block absolute top-2/3 right-1/2 w-1 h-1 bg-sky-600 rounded-full opacity-50 animate-ping" style={{ animationDuration: '2s', animationDelay: '2s' }} />
        
        {/* Animated lines */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0284c7" />
                <stop offset="100%" stopColor="#0ea5e9" />
              </linearGradient>
            </defs>
            <line x1="0" y1="0" x2="100%" y2="100%" stroke="url(#grad1)" strokeWidth="2" opacity="0.3" />
            <line x1="100%" y1="0" x2="0" y2="100%" stroke="url(#grad1)" strokeWidth="2" opacity="0.2" />
          </svg>
        </div>
      </div>

      <div className="w-full max-w-[min(52rem,calc(100vw-1rem))] sm:max-w-2xl relative z-10">
        {/* Main Card */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg sm:shadow-2xl overflow-hidden border border-slate-100 backdrop-blur-sm bg-white/95 max-h-[calc(100dvh-1rem)] flex flex-col">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-primary-600 via-primary-500 to-sky-500 px-4 sm:px-6 md:px-8 py-4 sm:py-6 md:py-8 text-center relative overflow-hidden">
            {/* Animated gradient overlay */}
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.1) 75%, transparent 75%, transparent)',
              backgroundSize: '40px 40px',
              animation: 'slide 20s linear infinite'
            }} />
            <style>{`
              @keyframes slide {
                0% { background-position: 0 0; }
                100% { background-position: 40px 40px; }
              }
            `}</style>
            
            <div className="relative z-10 flex flex-col items-center gap-1 sm:gap-2">
              <div className="inline-flex items-center justify-center mb-2 sm:mb-3 md:mb-4">
                <Image
                  src="/images/inicjatywa-logo-granatowe.svg"
                  alt="Logo Inicjatywa Katolicka"
                  width={180}
                  height={54}
                  className="h-10 sm:h-14 md:h-16 w-auto drop-shadow-lg"
                  priority
                />
              </div>
              <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-white mb-1 font-display px-2">
                Nowe Możliwości
              </h1>
              <p className="text-primary-100 text-[11px] sm:text-sm md:text-base px-2 leading-snug max-w-xl">
                Startujemy całkiem nową wersję platformy, przygotowujemy dla Was coś ekscytującego.
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="px-3 sm:px-6 md:px-8 py-4 sm:py-5 md:py-8 flex-1 flex flex-col justify-center">
            {/* Timer Section */}
            <div className="mb-4 sm:mb-5 md:mb-6">
              <p className="text-center text-slate-600 font-medium mb-3 sm:mb-4 md:mb-5 text-[11px] sm:text-sm md:text-base">
                Strona będzie gotowa za:
              </p>

              {/* Counter Grid - Responsive */}
              <div className="grid grid-cols-4 gap-1.5 sm:gap-3 md:gap-4">
                {/* Days */}
                <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-5 border border-primary-200 hover:shadow-lg transition-shadow">
                  <div className="text-center">
                    <div className="text-lg sm:text-2xl md:text-4xl font-bold text-primary-700 font-display mb-0.5 sm:mb-1">
                      {String(timeLeft.days).padStart(2, '0')}
                    </div>
                    <div className="text-[9px] sm:text-xs md:text-sm font-medium text-primary-600 uppercase tracking-wider leading-none">
                      {timeLeft.days === 1 ? 'Dzień' : 'Dni'}
                    </div>
                  </div>
                </div>

                {/* Hours */}
                <div className="bg-gradient-to-br from-sky-50 to-sky-100 rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-5 border border-sky-200 hover:shadow-lg transition-shadow">
                  <div className="text-center">
                    <div className="text-lg sm:text-2xl md:text-4xl font-bold text-sky-700 font-display mb-0.5 sm:mb-1">
                      {String(timeLeft.hours).padStart(2, '0')}
                    </div>
                    <div className="text-[9px] sm:text-xs md:text-sm font-medium text-sky-600 uppercase tracking-wider leading-none">
                      Godzin
                    </div>
                  </div>
                </div>

                {/* Minutes */}
                <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-5 border border-primary-200 hover:shadow-lg transition-shadow">
                  <div className="text-center">
                    <div className="text-lg sm:text-2xl md:text-4xl font-bold text-primary-700 font-display mb-0.5 sm:mb-1">
                      {String(timeLeft.minutes).padStart(2, '0')}
                    </div>
                    <div className="text-[9px] sm:text-xs md:text-sm font-medium text-primary-600 uppercase tracking-wider leading-none">
                      Minut
                    </div>
                  </div>
                </div>

                {/* Seconds */}
                <div className="bg-gradient-to-br from-sky-50 to-sky-100 rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-5 border border-sky-200 hover:shadow-lg transition-shadow">
                  <div className="text-center">
                    <div className="text-lg sm:text-2xl md:text-4xl font-bold text-sky-700 font-display mb-0.5 sm:mb-1">
                      {String(timeLeft.seconds).padStart(2, '0')}
                    </div>
                    <div className="text-[9px] sm:text-xs md:text-sm font-medium text-sky-600 uppercase tracking-wider leading-none">
                      Sekund
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Info Section */}
            <div className="bg-gradient-to-r from-primary-50 to-sky-50 rounded-lg sm:rounded-xl p-3 sm:p-5 md:p-6 border border-primary-200 mb-4 sm:mb-6">
              <div className="flex gap-2 sm:gap-3 md:gap-4 items-start">
                <div className="flex-shrink-0">
                  <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-primary-600 mt-1 flex-shrink-0" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900 mb-1 sm:mb-2 font-display text-sm sm:text-base">
                    Piątek, 7 sierpnia 2026
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                    Startujemy całkiem nową wersję platformy. O godzinie 12:00 udostępnimy nowe funkcje dla społeczności Inicjatywy Katolickiej.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer decoration */}
          <div className="bg-gradient-to-r from-primary-50 to-sky-50 px-3 sm:px-6 md:px-8 py-2 sm:py-3 border-t border-slate-100">
            <p className="text-center text-[10px] sm:text-xs md:text-sm text-slate-600 leading-snug">
              Inicjatywa Katolicka - Odkrywaj wydarzenia katolickie w swojej okolicy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
