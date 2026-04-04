'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Calendar, MapPin, Heart, Star } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { clsx } from 'clsx';
import { eventsApi } from '@/lib/api/events';
import { usePromotionImpressions } from '@/hooks/usePromotionTracking';
import type { EventListItem } from '@/types';

interface EventSliderProps {
  title: string;
  events: EventListItem[];
  icon?: React.ReactNode;
  viewAllLink?: string;
  isLoading?: boolean;
  showPromoBadges?: boolean;
  subtitle?: string;
}

// Promotion badge styles
const promoBadgeStyles = {
  gold: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-900',
  silver: 'bg-gradient-to-r from-slate-300 to-slate-400 text-slate-800',
  bronze: 'bg-gradient-to-r from-orange-300 to-orange-400 text-orange-900',
};

const promoBadgeLabels = {
  gold: '🥇 Złoty',
  silver: '🥈 Srebrny',
  bronze: '🥉 Brązowy',
};

// Price type display
function getPriceDisplay(event: EventListItem) {
  if (event.event_type === 'paid' || event.event_type === 'platform') {
    return { text: 'Płatne', className: 'text-slate-700' };
  }
  if (event.event_type === 'voluntary') {
    return { text: 'Dobrowolna opłata', className: 'text-emerald-600', icon: Heart };
  }
  return { text: 'Bezpłatne', className: 'text-primary-600' };
}

// Slider Event Card Component
function SliderEventCard({ event, showPromoBadge = false }: { event: EventListItem; showPromoBadge?: boolean }) {
  const [isHovered, setIsHovered] = useState(false);
  const eventUrl = `/wydarzenia/${event.slug}`;
  const startDate = new Date(event.start_date);
  const formattedDate = format(startDate, 'd.MM.yyyy', { locale: pl });
  const endDate = event.end_date ? new Date(event.end_date) : null;
  const formattedEndDate = endDate ? format(endDate, 'd.MM.yyyy', { locale: pl }) : null;
  const price = getPriceDisplay(event);

  return (
    <Link
      href={eventUrl}
      className="flex-shrink-0 w-64 sm:w-72 group relative"
      onClick={() => { if (event.is_promoted && event.promotion_id) eventsApi.recordClick(event.promotion_id); }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <article className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 h-full">
        {/* Image Container */}
        <div className="relative aspect-[4/3] overflow-hidden">
          {event.image_thumbnail ? (
            <Image
              src={event.image_thumbnail}
              alt={event.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              sizes="(max-width: 640px) 256px, 288px"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
              <Calendar className="w-12 h-12 text-primary-400" />
            </div>
          )}

          {/* Promotion Badge */}
          {showPromoBadge && event.promotion_level && (
            <div
              className={clsx(
                'absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold z-10',
                promoBadgeStyles[event.promotion_level]
              )}
            >
              {promoBadgeLabels[event.promotion_level]}
            </div>
          )}

          {/* Hover Overlay */}
            <div
              className={clsx(
                'absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent',
                'flex flex-col justify-end p-4 transition-opacity duration-300',
                  isHovered ? 'opacity-100' : 'opacity-0'
              )}
            >
            <div className="text-white space-y-2">
              <p className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4" />
                {formattedDate}
                {formattedEndDate && ` - ${formattedEndDate}`}
              </p>
              {event.location && (
                <p className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4" />
                  {event.location.city}
                  {event.location.region && `, ${event.location.region}`}
                </p>
              )}
              <span className="mt-2 bg-white text-slate-900 px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Sprawdź
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold text-slate-900 line-clamp-2 group-hover:text-primary-600 transition-colors mb-2">
            {event.title}
          </h3>
          <p className={clsx('text-sm font-medium flex items-center gap-1', price.className)}>
            {price.icon && <price.icon className="w-4 h-4" />}
            {price.text}
          </p>
        </div>
      </article>
    </Link>
  );
}

// Skeleton Loader
function SliderEventCardSkeleton() {
  return (
    <div className="flex-shrink-0 w-64 sm:w-72">
      <div className="bg-white rounded-xl overflow-hidden shadow-md">
        <div className="aspect-[4/3] bg-slate-200 animate-pulse" />
        <div className="p-4 space-y-2">
          <div className="h-5 bg-slate-200 rounded animate-pulse" />
          <div className="h-5 bg-slate-200 rounded w-3/4 animate-pulse" />
          <div className="h-4 bg-slate-200 rounded w-1/2 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function EventSlider({
  title,
  events,
  icon,
  viewAllLink,
  isLoading = false,
  showPromoBadges = false,
  subtitle,
}: EventSliderProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Deduplicate events by ID to prevent React key warnings
  const uniqueEvents = useMemo(() => {
    const seen = new Set<number>();
    return events.filter(event => {
      if (seen.has(event.id)) return false;
      seen.add(event.id);
      return true;
    });
  }, [events]);

  usePromotionImpressions(uniqueEvents);

  const checkScrollButtons = () => {
    const container = scrollContainerRef.current;
    if (container) {
      setCanScrollLeft(container.scrollLeft > 0);
      setCanScrollRight(
        container.scrollLeft < container.scrollWidth - container.clientWidth - 10
      );
    }
  };

  useEffect(() => {
    checkScrollButtons();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollButtons);
      window.addEventListener('resize', checkScrollButtons);
    }
    return () => {
      if (container) {
        container.removeEventListener('scroll', checkScrollButtons);
      }
      window.removeEventListener('resize', checkScrollButtons);
    };
  }, [uniqueEvents]);

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = 300;
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (!isLoading && (!uniqueEvents || uniqueEvents.length === 0)) {
    return null;
  }

  return (
    <section className="py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {icon}
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-semibold text-slate-900 drop-shadow-sm">
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        {viewAllLink && (
          <Link
            href={viewAllLink}
            className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center gap-1"
          >
            Zobacz wszystkie
            <ChevronRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Slider */}
      <div className="relative">
        {/* Left Arrow */}
        <button
          onClick={() => scroll('left')}
          disabled={!canScrollLeft}
          className={clsx(
            'absolute -left-4 top-1/2 -translate-y-1/2 z-10',
            'w-10 h-10 bg-white rounded-full shadow-lg',
            'flex items-center justify-center',
            'transition-all duration-200',
            canScrollLeft
              ? 'opacity-100 hover:bg-slate-50 hover:scale-110'
              : 'opacity-0 pointer-events-none'
          )}
          aria-label="Przesuń w lewo"
        >
          <ChevronLeft className="w-5 h-5 text-slate-700" />
        </button>

        {/* Events Container */}
        <div
          ref={scrollContainerRef}
          className="flex gap-5 overflow-x-auto scrollbar-hide pb-4 -mx-2 px-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {isLoading
            ? [...Array(5)].map((_, i) => <SliderEventCardSkeleton key={i} />)
            : uniqueEvents.map((event) => (
                <SliderEventCard
                  key={event.id}
                  event={event}
                  showPromoBadge={showPromoBadges}
                />
              ))}
        </div>

        {/* Right Arrow */}
        <button
          onClick={() => scroll('right')}
          disabled={!canScrollRight}
          className={clsx(
            'absolute -right-4 top-1/2 -translate-y-1/2 z-10',
            'w-10 h-10 bg-white rounded-full shadow-lg',
            'flex items-center justify-center',
            'transition-all duration-200',
            canScrollRight
              ? 'opacity-100 hover:bg-slate-50 hover:scale-110'
              : 'opacity-0 pointer-events-none'
          )}
          aria-label="Przesuń w prawo"
        >
          <ChevronRight className="w-5 h-5 text-slate-700" />
        </button>
      </div>
    </section>
  );
}
