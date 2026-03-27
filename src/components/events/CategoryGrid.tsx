'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';
import type { Category } from '@/types';

interface CategoryGridProps {
  categories: Category[];
  initialVisibleCount?: number;
}

// Category color palette for visual variety
const categoryColors = [
  'bg-primary-50 hover:bg-primary-100 text-primary-700 border-primary-200',
  'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200',
  'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200',
  'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200',
  'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200',
  'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200',
  'bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border-cyan-200',
  'bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200',
  'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200',
  'bg-teal-50 hover:bg-teal-100 text-teal-700 border-teal-200',
];

export function CategoryGrid({ categories, initialVisibleCount = 9 }: CategoryGridProps) {
  const [showAll, setShowAll] = useState(false);

  if (!categories || categories.length === 0) {
    return null;
  }

  const visibleCategories = showAll ? categories : categories.slice(0, initialVisibleCount);
  const hasMore = categories.length > initialVisibleCount;

  return (
    <section className="py-8 mt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-xl sm:text-2xl font-semibold text-slate-900">
          Kategorie wydarzeń
        </h2>
        {hasMore && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center gap-1 transition-colors"
          >
            {showAll ? 'Pokaż mniej' : 'Pokaż wszystkie kategorie'}
            <ChevronRight
              className={clsx('w-4 h-4 transition-transform', showAll && 'rotate-90')}
            />
          </button>
        )}
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {visibleCategories.map((category, index) => (
          <Link
            key={category.id}
            href={`/szukaj?categories=${category.id}`}
            className={clsx(
              'px-4 py-3 rounded-xl text-center font-medium text-sm',
              'border transition-all duration-200',
              'hover:shadow-md hover:scale-[1.02]',
              categoryColors[index % categoryColors.length]
            )}
          >
            {category.name}
            {category.event_count !== undefined && category.event_count > 0 && (
              <span className="block text-xs opacity-70 mt-0.5">
                {category.event_count} {category.event_count === 1 ? 'wydarzenie' : (category.event_count % 10 >= 2 && category.event_count % 10 <= 4 && (category.event_count % 100 < 10 || category.event_count % 100 >= 20)) ? 'wydarzenia' : 'wydarzeń'}
              </span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}

// Skeleton loader
export function CategoryGridSkeleton() {
  return (
    <section className="py-8 mt-4">
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="h-6 w-36 bg-slate-200 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="h-12 bg-slate-200 rounded-xl animate-pulse" />
        ))}
      </div>
    </section>
  );
}
