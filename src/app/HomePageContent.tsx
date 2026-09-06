'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowRight, Clock, Heart, Search, Star, TrendingUp } from 'lucide-react';
import { CategoryGrid, EventSlider, GoldBanner } from '@/components/events';
import AdBanner from '@/components/ads/AdBanner';
import PopupAd from '@/components/ads/PopupAd';
import { useAuth } from '@/hooks/useAuth';
import { useRecommendedEvents } from '@/hooks/useEvents';
import type { Category, EventListItem } from '@/types';

const HeroPolandMap = dynamic(() => import('@/components/layout/HeroPolandMap'), { ssr: false });

export interface HomePageData {
  goldEvents: EventListItem[];
  promotedEvents: EventListItem[];
  latestEvents: EventListItem[];
  top10Events: EventListItem[];
  categorySliders: { category_id: number; category_name: string; events: EventListItem[] }[];
  categories: Category[];
}

function HeroSection() {
  const [cityInput, setCityInput] = useState('');
  const router = useRouter();

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    router.push(cityInput.trim() ? `/szukaj?q=${encodeURIComponent(cityInput.trim())}` : '/szukaj');
  };

  return (
    <section className="relative bg-[#050B14] text-white overflow-hidden min-h-[90vh] lg:min-h-screen flex items-center">
      <PopupAd />
      <div className="absolute inset-0 z-0"><HeroPolandMap /></div>
      <div className="absolute inset-0 z-0 bg-gradient-to-r from-[#050B14] via-[#050B14]/80 to-transparent pointer-events-none" />
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#050B14] via-transparent to-transparent pointer-events-none" />
      <div className="relative w-full max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-12 lg:py-20 z-10 pointer-events-none">
        <div className="max-w-3xl pointer-events-auto">
          <div className="inline-block mb-6 px-4 py-2 rounded-full border border-primary-500/30 bg-primary-900/30 backdrop-blur-md">
            <span className="text-sm font-medium tracking-wide text-primary-100">Odkrywaj świat katolickich wydarzeń</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl 2xl:text-7xl font-bold tracking-tight mb-6 drop-shadow-xl">
            Odkryj wydarzenia<span className="block text-primary-300">katolickie w Polsce</span>
          </h1>
          <p className="text-lg sm:text-xl 2xl:text-2xl text-slate-300 mb-8 max-w-2xl drop-shadow-md">
            Rekolekcje, pielgrzymki, spotkania modlitewne, koncerty i wiele więcej. Znajdź wydarzenia w swojej okolicy lub online.
          </p>
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 max-w-xl">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input value={cityInput} onChange={(event) => setCityInput(event.target.value)} placeholder="Szukaj wydarzeń..." className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 text-white placeholder-slate-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 backdrop-blur-md shadow-2xl" />
            </div>
            <button type="submit" className="flex items-center justify-center gap-2 px-6 py-3 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-600 transition-colors shadow-xl">
              Szukaj <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

function RecommendedEventsSection() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { data, isLoading } = useRecommendedEvents();

  if (isAuthLoading || isLoading || !isAuthenticated || !data?.events?.length) {
    return (
      <div className="bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-100 rounded-xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <Heart className="w-6 h-6 text-rose-500 shrink-0" />
          <div><h2 className="font-semibold text-slate-900 mb-1">Polecane dla Ciebie</h2><p className="text-slate-600 text-sm mb-3">Zaloguj się i ustaw zainteresowania, aby otrzymywać spersonalizowane rekomendacje wydarzeń.</p><Link href="/logowanie" className="inline-flex items-center gap-2 text-sm font-medium text-rose-600">Zaloguj się <ArrowRight className="w-4 h-4" /></Link></div>
        </div>
      </div>
    );
  }

  return <EventSlider title="Polecane dla Ciebie" events={data.events} icon={<Heart className="w-6 h-6 text-rose-500" />} viewAllLink="/szukaj" />;
}

export default function HomePageContent({ data }: { data: HomePageData }) {
  return (
    <>
      <HeroSection />
      <div className="container-page">
        {data.goldEvents.length > 0 && <div className="mt-10"><GoldBanner events={data.goldEvents} /></div>}
        <AdBanner id="ad-banner-1" />
        <RecommendedEventsSection />
        <EventSlider title="Promowane wydarzenia" events={data.promotedEvents} icon={<Star className="w-6 h-6 text-amber-500" />} viewAllLink="/szukaj?promoted=true" showPromoBadges />
        <EventSlider title="Najnowsze Wydarzenia" events={data.latestEvents} icon={<Clock className="w-6 h-6 text-primary-600" />} viewAllLink="/szukaj?ordering=-created_at" />
        <EventSlider title="Top 10" events={data.top10Events.slice(0, 10)} icon={<TrendingUp className="w-6 h-6 text-emerald-600" />} viewAllLink="/szukaj?ordering=-views_count" />
        <AdBanner id="ad-banner-2" />
        {data.categorySliders.map((slider) => <EventSlider key={slider.category_id} title={slider.category_name} events={slider.events} viewAllLink={`/szukaj?category=${slider.category_id}`} />)}
        {data.categories.length > 0 && <CategoryGrid categories={data.categories} initialVisibleCount={10} />}
        <div className="h-8" />
      </div>
    </>
  );
}