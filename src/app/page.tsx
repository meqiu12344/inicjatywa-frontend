'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, MapPin, TrendingUp, ArrowRight, Star, Clock, Heart, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { EventSlider, GoldBanner, GoldBannerSkeleton, CategoryGrid, CategoryGridSkeleton } from '@/components/events';
import HeroGlobe from '@/components/layout/HeroGlobe';
import {
  useLatestEvents,
  useTop10Events,
  useGoldEvents,
  usePromotedEvents,
  useCategorySliders,
  useCategories,
  useRecommendedEvents,
} from '@/hooks/useEvents';
import { useAuth } from '@/hooks/useAuth';

function SectionLoadError({ message }: { message: string }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 my-4">
      <p className="text-sm text-amber-800 inline-flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" />
        {message}
      </p>
    </div>
  );
}

function HeroSection() {
  const [cityInput, setCityInput] = useState('');
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (cityInput.trim()) {
      router.push(`/szukaj?city=${encodeURIComponent(cityInput.trim())}`);
    } else {
      router.push('/szukaj');
    }
  };

  return (
    <section className="relative bg-[#050B14] text-white overflow-hidden min-h-[90vh] lg:min-h-screen flex items-center">
      {/* 3D Globe Background */}
      <div className="absolute inset-0 z-0">
        <HeroGlobe />
      </div>

      {/* Dark overlay for readability on the left side */}
      <div className="absolute inset-0 z-0 bg-gradient-to-r from-[#050B14] via-[#050B14]/80 to-transparent pointer-events-none" />
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#050B14] via-transparent to-transparent pointer-events-none" />

      {/* Content Container */}
      <div className="relative w-full max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-12 lg:py-20 z-10 pointer-events-none">

        {/* Left Column: Text & CTA */}
        <div className="max-w-3xl pointer-events-auto">
          <div className="inline-block mb-6 px-4 py-2 rounded-full border border-primary-500/30 bg-primary-900/30 backdrop-blur-md">
            <span className="text-sm font-medium tracking-wide text-primary-100 flex items-center gap-2">
              <GlobeIcon /> Odkrywaj świat katolickich wydarzeń
            </span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl 2xl:text-7xl font-bold tracking-tight mb-6 drop-shadow-xl">
            Odkryj wydarzenia
            <span className="block text-primary-300">katolickie w Polsce</span>
          </h1>
          <p className="text-lg sm:text-xl 2xl:text-2xl text-slate-300 mb-8 max-w-2xl drop-shadow-md">
            Rekolekcje, pielgrzymki, spotkania modlitewne, koncerty i wiele więcej.
            Znajdź wydarzenia w swojej okolicy lub online.
          </p>

          {/* Quick search form */}
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 max-w-xl">
            <div className="relative flex-1">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                placeholder="Wpisz miasto..."
                className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 text-white placeholder-slate-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 backdrop-blur-md shadow-2xl"
              />
            </div>
            <button
              type="submit"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-600 transition-colors shadow-xl"
            >
              Szukaj
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>


        </div>

      </div>
    </section>
  );
}

// Icon helper for the badge
function GlobeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

// Gold Promoted Events Banner Section
function GoldBannerSection() {
  const { data: goldEvents, isLoading, isError } = useGoldEvents();

  if (isLoading) {
    return <GoldBannerSkeleton />;
  }

  if (isError) {
    return <SectionLoadError message="Nie udało się pobrać wyróżnionych wydarzeń." />;
  }

  if (!goldEvents || goldEvents.length === 0) {
    return null;
  }

  return <GoldBanner events={goldEvents} />;
}

// Promoted Events Section
function PromotedEventsSection() {
  const { data: promotedEvents, isLoading, isError } = usePromotedEvents();

  if (isError) {
    return <SectionLoadError message="Nie udało się pobrać promowanych wydarzeń." />;
  }

  return (
    <EventSlider
      title="Promowane wydarzenia"
      events={promotedEvents || []}
      icon={<Star className="w-6 h-6 text-amber-500" />}
      viewAllLink="/szukaj?promoted=true"
      isLoading={isLoading}
      showPromoBadges
    />
  );
}

// Recommended Events Section (personalized for logged-in users)
function RecommendedEventsSection() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { data: recommendedData, isLoading, isError } = useRecommendedEvents();

  // While auth is hydrating or recommended events are loading, show skeleton slider
  if (isAuthLoading || isLoading) {
    return (
      <EventSlider
        title="Polecane dla Ciebie"
        events={[]}
        icon={<Heart className="w-6 h-6 text-rose-500" />}
        viewAllLink="/szukaj"
        isLoading={true}
      />
    );
  }

  // Show clear CTA for guests instead of hiding section completely
  if (!isAuthenticated) {
    return (
      <div className="bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-100 rounded-xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Heart className="w-6 h-6 text-rose-500" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 mb-1">Polecane dla Ciebie</h3>
            <p className="text-slate-600 text-sm mb-3">
              Zaloguj się i ustaw zainteresowania, aby otrzymywać spersonalizowane rekomendacje wydarzeń.
            </p>
            <Link
              href="/logowanie"
              className="inline-flex items-center gap-2 text-sm font-medium text-rose-600 hover:text-rose-700"
            >
              Zaloguj się
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-100 rounded-xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Heart className="w-6 h-6 text-rose-500" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 mb-1">Polecane dla Ciebie</h3>
            <p className="text-slate-600 text-sm">
              Nie udało się teraz pobrać rekomendacji. Odśwież stronę i spróbuj ponownie.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // No preferences set
  if (recommendedData && !recommendedData.has_preferences) {
    return (
      <div className="bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-100 rounded-xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Heart className="w-6 h-6 text-rose-500" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 mb-1">Polecane dla Ciebie</h3>
            <p className="text-slate-600 text-sm mb-3">
              Ustaw swoje zainteresowania, aby otrzymywać spersonalizowane rekomendacje wydarzeń.
            </p>
            <Link
              href="/profil/zainteresowania"
              className="inline-flex items-center gap-2 text-sm font-medium text-rose-600 hover:text-rose-700"
            >
              Ustaw zainteresowania
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Has events to show
  if (recommendedData && recommendedData.events && recommendedData.events.length > 0) {
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <Link
            href="/profil/zainteresowania"
            className="text-sm text-rose-600 hover:text-rose-700 font-medium inline-flex items-center gap-1"
          >
            Edytuj zainteresowania
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <EventSlider
          title="Polecane dla Ciebie"
          events={recommendedData.events}
          icon={<Heart className="w-6 h-6 text-rose-500" />}
          viewAllLink="/szukaj"
          isLoading={false}
          subtitle={
            recommendedData.categories && recommendedData.categories.length > 0
              ? `Na podstawie: ${recommendedData.categories.slice(0, 3).join(', ')}${recommendedData.categories.length > 3 ? '...' : ''}`
              : undefined
          }
        />
      </div>
    );
  }

  // Authenticated user with preferences but no current matches
  if (recommendedData && recommendedData.has_preferences && (!recommendedData.events || recommendedData.events.length === 0)) {
    return (
      <div className="bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-100 rounded-xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Heart className="w-6 h-6 text-rose-500" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 mb-1">Polecane dla Ciebie</h3>
            <p className="text-slate-600 text-sm mb-3">
              Na ten moment nie znaleziono dopasowanych wydarzeń. Spróbuj rozszerzyć zainteresowania.
            </p>
            <Link
              href="/profil/zainteresowania"
              className="inline-flex items-center gap-2 text-sm font-medium text-rose-600 hover:text-rose-700"
            >
              Edytuj zainteresowania
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// Latest Events Slider
function LatestEventsSection() {
  const { data: latestEvents, isLoading, isError } = useLatestEvents(15);

  if (isError) {
    return <SectionLoadError message="Nie udało się pobrać najnowszych wydarzeń." />;
  }

  return (
    <EventSlider
      title="Najnowsze Wydarzenia"
      events={latestEvents || []}
      icon={<Clock className="w-6 h-6 text-primary-600" />}
      viewAllLink="/szukaj?ordering=-created_at"
      isLoading={isLoading}
    />
  );
}

// Top 10 Events Slider
function Top10EventsSection() {
  const { data: top10Events, isLoading, isError } = useTop10Events();

  if (isError) {
    return <SectionLoadError message="Nie udało się pobrać rankingu Top 10." />;
  }

  return (
    <EventSlider
      title="Top 10"
      events={top10Events?.slice(0, 10) || []}
      icon={<TrendingUp className="w-6 h-6 text-emerald-600" />}
      viewAllLink="/szukaj?ordering=-views_count"
      isLoading={isLoading}
    />
  );
}

// Dynamic Category Sliders
function CategorySlidersSection() {
  const { data: categorySliders, isLoading, isError } = useCategorySliders();

  if (isLoading) {
    return (
      <div className="space-y-8 py-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-8 w-48 bg-slate-200 rounded mb-4" />
            <div className="flex gap-5 overflow-hidden">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="flex-shrink-0 w-64 sm:w-72">
                  <div className="bg-white rounded-xl overflow-hidden shadow-md">
                    <div className="aspect-[4/3] bg-slate-200" />
                    <div className="p-4 space-y-2">
                      <div className="h-5 bg-slate-200 rounded" />
                      <div className="h-4 bg-slate-200 rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return <SectionLoadError message="Nie udało się pobrać sekcji kategorii." />;
  }

  if (!categorySliders || categorySliders.length === 0) {
    return null;
  }

  return (
    <>
      {categorySliders.map((slider) => (
        <EventSlider
          key={slider.category_id}
          title={slider.category_name}
          events={slider.events}
          viewAllLink={`/szukaj?category=${slider.category_id}`}
          isLoading={false}
        />
      ))}
    </>
  );
}

// Category Grid Section
function CategoryGridSection() {
  const { data: categories, isLoading, isError } = useCategories();

  if (isLoading) {
    return <CategoryGridSkeleton />;
  }

  if (isError) {
    return <SectionLoadError message="Nie udało się pobrać listy kategorii." />;
  }

  if (!categories || categories.length === 0) {
    return null;
  }

  return <CategoryGrid categories={categories} initialVisibleCount={10} />;
}

// Main Home Page
export default function HomePage() {
  return (
    <>
      <HeroSection />

      <div className="container-page">
        {/* Gold Banner for top-tier promoted events */}
        <div className="mt-10">
          <GoldBannerSection />
        </div>

        {/* Personalized Recommendations (for logged-in users) */}
        <RecommendedEventsSection />

        {/* Promoted Events Slider */}
        <PromotedEventsSection />

        {/* Latest Events Slider */}
        <LatestEventsSection />

        {/* Top 10 Popular Events */}
        <Top10EventsSection />

        {/* Dynamic Category Sliders */}
        <CategorySlidersSection />

        {/* Category Grid at bottom */}
        <CategoryGridSection />

        {/* Spacer */}
        <div className="h-8" />
      </div>
    </>
  );
}
