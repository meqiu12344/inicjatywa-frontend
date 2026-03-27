'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, MapPin, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import type { EventListItem } from '@/types';

interface GoldBannerProps {
  events: EventListItem[];
}

export function GoldBanner({ events }: GoldBannerProps) {
  // Deduplicate events by ID to prevent React key warnings
  const uniqueEvents = useMemo(() => {
    const seen = new Set<number>();
    return events.filter(event => {
      if (seen.has(event.id)) return false;
      seen.add(event.id);
      return true;
    });
  }, [events]);

  if (!uniqueEvents || uniqueEvents.length === 0) {
    return null;
  }

  return (
    <section className="mb-10">
      <div className="space-y-5">
        {uniqueEvents.map((event) => (
          <GoldBannerCard key={event.id} event={event} />
        ))}
      </div>
    </section>
  );
}

function GoldBannerCard({ event }: { event: EventListItem }) {
  const eventUrl = `/wydarzenia/${event.slug}`;
  const startDate = new Date(event.start_date);
  const formattedDate = format(startDate, 'd.MM.yyyy', { locale: pl });

  return (
    <Link href={eventUrl} className="block group">
      <div className="relative overflow-hidden rounded-2xl shadow-xl">
        {/* Gold Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400" />

        {/* Shine Animation */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(45deg, transparent, rgba(255,255,255,0.4), transparent)',
            animation: 'goldShine 3s infinite',
          }}
        />

        {/* Content */}
        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
            {/* Image */}
            <div className="w-full md:w-48 lg:w-56 aspect-video md:aspect-[4/3] relative rounded-xl overflow-hidden border-4 border-white shadow-lg flex-shrink-0">
              {event.image_thumbnail ? (
                <Image
                  src={event.image_thumbnail}
                  alt={event.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 224px"
                  priority
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
                  <Calendar className="w-12 h-12 text-amber-600" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              {/* Badge */}
              <span className="inline-block bg-slate-900 text-amber-400 px-4 py-1.5 rounded-full text-sm font-bold mb-3">
                🥇 Polecane
              </span>

              {/* Title */}
              <h3 className="text-slate-900 text-xl sm:text-2xl font-bold mb-3 line-clamp-2 group-hover:text-slate-700 transition-colors">
                {event.title}
              </h3>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-slate-700 mb-4">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {formattedDate}
                </span>
                {event.location && (
                  <>
                    <span className="text-slate-400">•</span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      {event.location.city}
                    </span>
                  </>
                )}
              </div>

              {/* CTA Button */}
              <span className="inline-flex items-center gap-2 bg-slate-900 text-amber-400 px-6 py-2.5 rounded-full font-bold hover:bg-slate-800 transition-all group-hover:scale-105 group-hover:shadow-lg">
                <ArrowRight className="w-4 h-4" />
                Zobacz wydarzenie
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CSS for shine animation */}
      <style jsx>{`
        @keyframes goldShine {
          0% {
            transform: translateX(-100%) rotate(45deg);
          }
          100% {
            transform: translateX(100%) rotate(45deg);
          }
        }
      `}</style>
    </Link>
  );
}

// Skeleton
export function GoldBannerSkeleton() {
  return (
    <section className="mb-10">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-300 to-yellow-400">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
            <div className="w-full md:w-48 lg:w-56 aspect-video md:aspect-[4/3] bg-amber-200 rounded-xl animate-pulse" />
            <div className="flex-1 space-y-4 w-full">
              <div className="h-8 w-32 bg-amber-200 rounded-full animate-pulse mx-auto md:mx-0" />
              <div className="h-8 w-full max-w-md bg-amber-200 rounded animate-pulse mx-auto md:mx-0" />
              <div className="h-6 w-48 bg-amber-200 rounded animate-pulse mx-auto md:mx-0" />
              <div className="h-12 w-48 bg-amber-200 rounded-full animate-pulse mx-auto md:mx-0" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
