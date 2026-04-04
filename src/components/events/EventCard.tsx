'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Calendar, MapPin, Users, Star, Wifi } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { clsx } from 'clsx';
import { eventsApi } from '@/lib/api/events';
import type { EventListItem } from '@/types';

interface EventCardProps {
  event: EventListItem;
  featured?: boolean;
}

const promotionBadges = {
  gold: { label: 'Wyróżnione', className: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-900' },
  silver: { label: 'Promowane', className: 'bg-gradient-to-r from-slate-300 to-slate-400 text-slate-800' },
  bronze: { label: 'Promowane', className: 'bg-gradient-to-r from-orange-300 to-orange-400 text-orange-900' },
};

export function EventCard({ event, featured = false }: EventCardProps) {
  // Guard against null/undefined event
  if (!event) {
    return null;
  }

  const eventUrl = `/wydarzenia/${event.slug}`;
  const startDate = new Date(event.start_date);
  const formattedDate = format(startDate, 'd MMMM yyyy', { locale: pl });
  const formattedTime = format(startDate, 'HH:mm');

  return (
    <Link
      href={eventUrl}
      className="block group"
      onClick={() => {
        if (event.is_promoted && event.promotion_id) {
          eventsApi.recordClick(event.promotion_id);
        }
      }}
    >      <article
        className={clsx(
          'card-hover h-full flex flex-col',
          featured && 'ring-2 ring-primary-500/20'
        )}
      >
        {/* Image */}
        <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
          {event.image_thumbnail ? (
            <Image
              src={event.image_thumbnail}
              alt={event.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
              <Calendar className="w-12 h-12 text-primary-400" />
            </div>
          )}

          {/* Promotion badge */}
          {event.promotion_level && (
            <div
              className={clsx(
                'absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1',
                promotionBadges[event.promotion_level].className
              )}
            >
              <Star className="w-3 h-3" />
              {promotionBadges[event.promotion_level].label}
            </div>
          )}

          {/* Online badge */}
          {event.online_event && (
            <div className="absolute top-3 right-3 px-2.5 py-1 bg-emerald-500 text-white rounded-full text-xs font-semibold flex items-center gap-1">
              <Wifi className="w-3 h-3" />
              Online
            </div>
          )}

          {/* Fully booked badge */}
          {event.is_fully_booked && (
            <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-red-500 text-white rounded-full text-xs font-semibold">
              Brak miejsc
            </div>
          )}

          {/* Categories */}
          <div className="absolute bottom-3 right-3 flex gap-1.5 flex-wrap justify-end">
            {event.categories.slice(0, 2).map((cat) => (
              <span
                key={cat.id}
                className="px-2 py-0.5 bg-white/90 backdrop-blur-sm text-slate-700 rounded text-xs font-medium"
              >
                {cat.name}
              </span>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 flex flex-col">
          {/* Date */}
          <div className="flex items-center gap-2 text-sm text-primary-600 font-medium mb-2">
            <Calendar className="w-4 h-4" />
            <span>{formattedDate}</span>
            <span className="text-slate-400">•</span>
            <span>{formattedTime}</span>
          </div>

          {/* Title */}
          <h3 className="font-display font-semibold text-lg text-slate-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
            {event.title}
          </h3>

          {/* Location */}
          {event.location && (
            <div className="flex items-center gap-2 text-sm text-slate-500 mt-auto pt-2">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">
                {event.location.city}
                {event.location.region && `, ${event.location.region}`}
              </span>
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}

// Skeleton loader
export function EventCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="aspect-[16/10] skeleton" />
      <div className="p-4 space-y-3">
        <div className="h-4 w-32 skeleton rounded" />
        <div className="h-6 w-full skeleton rounded" />
        <div className="h-6 w-3/4 skeleton rounded" />
        <div className="h-4 w-40 skeleton rounded mt-auto" />
      </div>
    </div>
  );
}
