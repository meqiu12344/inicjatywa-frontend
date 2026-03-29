'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, MapPin, TrendingUp, ArrowRight, Star, Clock, Heart, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { EventSlider, GoldBanner, GoldBannerSkeleton, CategoryGrid, CategoryGridSkeleton } from '@/components/events';
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

// Hero Section with city search
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
    <section className="relative bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 text-white overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="relative max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-16 lg:py-24 2xl:py-32">
        <div className="max-w-3xl 2xl:max-w-4xl">
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl 2xl:text-7xl font-bold tracking-tight mb-6">
            Odkryj wydarzenia
            <span className="block text-primary-200">katolickie w Polsce</span>
          </h1>
          <p className="text-lg sm:text-xl 2xl:text-2xl text-primary-100 mb-8 max-w-2xl 2xl:max-w-4xl">
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
                className="w-full pl-12 pr-4 py-3 bg-white text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-300"
              />
            </div>
            <button
              type="submit"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-primary-700 font-semibold rounded-xl hover:bg-primary-50 transition-colors"
            >
              Szukaj wydarzeń
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          {/* Stats / Features - encourages scrolling down */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6 2xl:gap-8 mt-16 2xl:mt-24 max-w-4xl 2xl:max-w-5xl relative z-10">
            {/* Card 1 */}
            <div 
              onClick={() => window.scrollTo({ top: window.innerHeight - 80, behavior: 'smooth' })}
              className="group relative flex flex-col items-center sm:items-start p-6 bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 hover:border-white/30 rounded-3xl transition-all duration-500 cursor-pointer shadow-lg hover:shadow-2xl hover:-translate-y-2 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative w-12 h-12 flex items-center justify-center bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-500 shadow-xl group-hover:rotate-3">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div className="text-3xl font-black text-white mb-1 tracking-tight">350+</div>
              <div className="text-primary-200 font-medium">Wydarzeń</div>
              <div className="absolute right-6 bottom-6 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500">
                <ArrowRight className="w-5 h-5 text-white rotate-90" />
              </div>
            </div>

            {/* Card 2 */}
            <div 
              onClick={() => window.scrollTo({ top: window.innerHeight - 80, behavior: 'smooth' })}
              className="group relative flex flex-col items-center sm:items-start p-6 bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 hover:border-emerald-500/30 rounded-3xl transition-all duration-500 cursor-pointer shadow-lg hover:shadow-2xl hover:-translate-y-2 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative w-12 h-12 flex items-center justify-center bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-500 shadow-xl group-hover:-rotate-3">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div className="text-2xl font-black text-white mb-2 tracking-tight">Cała Polska</div>
              <div className="text-primary-200 font-medium">Lokalnie i online</div>
              <div className="absolute right-6 bottom-6 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500">
                <ArrowRight className="w-5 h-5 text-emerald-300 rotate-90" />
              </div>
            </div>

            {/* Card 3 */}
            <div 
              onClick={() => window.scrollTo({ top: window.innerHeight - 80, behavior: 'smooth' })}
              className="group relative flex flex-col items-center sm:items-start p-6 bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 hover:border-amber-400/30 rounded-3xl transition-all duration-500 cursor-pointer shadow-lg hover:shadow-2xl hover:-translate-y-2 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative w-12 h-12 flex items-center justify-center bg-gradient-to-br from-amber-400 to-amber-500 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-500 shadow-xl group-hover:rotate-3">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div className="text-3xl font-black text-white mb-1 tracking-tight">Wspólnota</div>
              <div className="text-primary-200 font-medium">Rośnij w wierze</div>
              <div className="absolute right-6 bottom-6 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500">
                <ArrowRight className="w-5 h-5 text-amber-300 rotate-90" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
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
