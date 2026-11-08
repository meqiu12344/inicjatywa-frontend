'use client';

import { TrackedEventLink } from '@/components/events/TrackedEventLink';

import { Calendar, MapPin, Users, Star, Wifi } from 'lucide-react';
import { EventPoster } from '@/components/events/EventPoster';
import { clsx } from 'clsx';
import { getPlaceLabel, getRemoteLabel } from '@/lib/eventUtils';
import { formatEventWhen } from '@/lib/eventWhen';
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
  const placeLabel = getPlaceLabel(event, true);
  const dateDisplay = formatEventWhen(event);

  return (
    <TrackedEventLink event={event}
      href={eventUrl}
      className="block group"
    >      <article
        className={clsx(
          'card-hover h-full flex flex-col',
          featured && 'ring-2 ring-primary-500/20'
        )}
      >
        {/* Image — plakat w całości; plakietki są pod nim, żeby nie zasłaniały jego treści. */}
        <div className="relative aspect-[1/1.414] bg-slate-100 overflow-hidden">
          {event.image_thumbnail ? (
            <EventPoster
              src={event.image_thumbnail}
              alt={event.title}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
              <Calendar className="w-12 h-12 text-primary-400" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex-1 flex flex-col">
          {/* Badges */}
          <div className="flex gap-1.5 flex-wrap mb-3">
            {event.promotion_level && (
              <span
                className={clsx(
                  'px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1',
                  promotionBadges[event.promotion_level].className
                )}
              >
                <Star className="w-3 h-3" />
                {promotionBadges[event.promotion_level].label}
              </span>
            )}
            {getRemoteLabel(event) && (
              <span className="px-2.5 py-1 bg-emerald-500 text-white rounded-full text-xs font-semibold flex items-center gap-1">
                <Wifi className="w-3 h-3" />
                {getRemoteLabel(event)}
              </span>
            )}
            {event.is_fully_booked && (
              <span className="px-2.5 py-1 bg-red-500 text-white rounded-full text-xs font-semibold">
                Brak miejsc
              </span>
            )}
            {(event.event_types?.length ? event.event_types : event.resource_types || []).slice(0, 2).map((value) => (
              <span
                key={value.slug}
                className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium"
              >
                {value.name}
              </span>
            ))}
          </div>

          {/* Date */}
          <div className="flex items-center gap-2 text-sm text-primary-600 font-medium mb-2">
            <Calendar className="w-4 h-4" />
            <span>{dateDisplay}</span>
          </div>

          {/* Title */}
          <h3 className="font-display font-semibold text-lg text-slate-900 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
            {event.title}
          </h3>

          {/* Location */}
          {placeLabel && (
            <div className="flex items-center gap-2 text-sm text-slate-500 mt-auto pt-2">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{placeLabel}</span>
            </div>
          )}
        </div>
      </article>
    </TrackedEventLink>
  );
}

// Skeleton loader
export function EventCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="aspect-[1/1.414] skeleton" />
      <div className="p-4 space-y-3">
        <div className="h-4 w-32 skeleton rounded" />
        <div className="h-6 w-full skeleton rounded" />
        <div className="h-6 w-3/4 skeleton rounded" />
        <div className="h-4 w-40 skeleton rounded mt-auto" />
      </div>
    </div>
  );
}
