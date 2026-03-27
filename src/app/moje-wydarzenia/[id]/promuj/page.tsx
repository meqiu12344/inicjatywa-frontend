'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Sparkles, Check, Crown, Medal, Star,
  Clock, Eye, MousePointer, TrendingUp, Loader2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api/client';
import toast from 'react-hot-toast';

interface PromotionPlan {
  level: string;
  name: string;
  price: number;
  days: number;
  features: string[];
}

interface PromotionData {
  event_id: number;
  event_title: string;
  is_promoted: boolean;
  active_promotion: {
    level: string;
    end_date: string;
    days_remaining: number;
  } | null;
  plans: PromotionPlan[];
  upgrade_options: {
    level: string;
    name: string;
    price_difference: number;
    new_days: number;
  }[] | null;
}

interface PromotionStats {
  promotion: {
    level: string;
    start_date: string;
    end_date: string;
    days_remaining: number;
    is_expired: boolean;
  };
  stats: {
    impressions: number;
    clicks: number;
    ctr: number;
  };
}

const levelIcons = {
  bronze: Medal,
  silver: Star,
  gold: Crown,
};

const levelColors = {
  bronze: 'from-amber-600 to-amber-700',
  silver: 'from-gray-400 to-gray-500',
  gold: 'from-yellow-400 to-yellow-600',
};

export default function PromoteEventPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const eventId = params.id as string;
  const { isAuthenticated } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const { data: promoData, isLoading } = useQuery<PromotionData>({
    queryKey: ['event-promotion', eventId],
    queryFn: async () => {
      const response = await apiClient.get(`/events/${eventId}/promote/`);
      return response.data;
    },
    enabled: isAuthenticated && !!eventId,
  });

  const { data: stats } = useQuery<PromotionStats>({
    queryKey: ['event-promotion-stats', eventId],
    queryFn: async () => {
      const response = await apiClient.get(`/events/${eventId}/promotion-stats/`);
      return response.data;
    },
    enabled: isAuthenticated && !!eventId && promoData?.is_promoted === true,
  });

  const promoteMutation = useMutation({
    mutationFn: async (level: string) => {
      const response = await apiClient.post(`/events/${eventId}/promote/`, { level });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Błąd podczas tworzenia promocji');
    },
  });

  const upgradeMutation = useMutation({
    mutationFn: async (level: string) => {
      const response = await apiClient.post(`/events/${eventId}/upgrade-promotion/`, { level });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.checkout_url) {
        toast.success('Przekierowanie do płatności za upgrade...');
        window.location.href = data.checkout_url;
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Błąd podczas ulepszania promocji');
    },
  });

  const handlePromote = () => {
    if (!selectedPlan) {
      toast.error('Wybierz plan promocji');
      return;
    }
    promoteMutation.mutate(selectedPlan);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Brak dostępu</h1>
          <Link href="/logowanie" className="text-indigo-600 hover:underline">
            Zaloguj się
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!promoData) return null;

  const hasActivePromotion = promoData.is_promoted && promoData.active_promotion;
  const hasUpgradeOptions = hasActivePromotion && promoData.upgrade_options && promoData.upgrade_options.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/moje-wydarzenia/${eventId}/edytuj`}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Powrót do wydarzenia
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-yellow-500" />
            Promuj wydarzenie
          </h1>
          <p className="text-gray-600 mt-1">{promoData.event_title}</p>
        </div>

        {/* Active Promotion Info */}
        {hasActivePromotion && (
          <div className={`mb-8 p-6 rounded-xl bg-gradient-to-r ${levelColors[promoData.active_promotion!.level as keyof typeof levelColors]} text-black`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {(() => {
                  const Icon = levelIcons[promoData.active_promotion!.level as keyof typeof levelIcons];
                  return <Icon className="w-12 h-12" />;
                })()}
                <div>
                  <h2 className="text-xl font-bold">
                    Promocja {promoData.active_promotion!.level.charAt(0).toUpperCase() + promoData.active_promotion!.level.slice(1)} aktywna
                  </h2>
                  <p className="text-black/80">
                    Pozostało {promoData.active_promotion!.days_remaining} dni
                  </p>
                </div>
              </div>
              <Link
                href={`/moje-wydarzenia/${eventId}/statystyki`}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium"
              >
                Zobacz statystyki
              </Link>
            </div>

            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-black/70 text-sm mb-1">
                    <Eye className="w-4 h-4" />
                    Wyświetlenia
                  </div>
                  <p className="text-2xl font-bold">{stats.stats.impressions}</p>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-black/70 text-sm mb-1">
                    <MousePointer className="w-4 h-4" />
                    Kliknięcia
                  </div>
                  <p className="text-2xl font-bold">{stats.stats.clicks}</p>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-black/70 text-sm mb-1">
                    <TrendingUp className="w-4 h-4" />
                    CTR
                  </div>
                  <p className="text-2xl font-bold">{stats.stats.ctr}%</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Upgrade Options — shown only when active promotion exists */}
        {hasUpgradeOptions && (
          <div className="mb-10 p-6 bg-white rounded-xl shadow-lg border border-indigo-100">
            <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              Ulepsz swój pakiet
            </h3>
            <p className="text-sm text-gray-500 mb-5">
              Płacisz tylko różnicę w cenie. Stara promocja zostaje automatycznie dezaktywowana.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {promoData.upgrade_options!.map((option) => {
                const UpgradeIcon = levelIcons[option.level as keyof typeof levelIcons];
                const upgradeColor = levelColors[option.level as keyof typeof levelColors];
                const isPending = upgradeMutation.isPending;
                return (
                  <div
                    key={option.level}
                    className="flex items-center justify-between p-4 border-2 border-slate-200 hover:border-indigo-400 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 bg-gradient-to-r ${upgradeColor} rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <UpgradeIcon className="w-6 h-6 text-black" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Upgrade do {option.name}</p>
                        <p className="text-sm text-gray-500">{option.new_days} dni · dopłata</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <div className="text-right">
                        <p className="text-xl font-bold text-indigo-700">+{option.price_difference} PLN</p>
                      </div>
                      <button
                        onClick={() => upgradeMutation.mutate(option.level)}
                        disabled={isPending}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 whitespace-nowrap"
                      >
                        {isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Ulepsz'
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pricing Plans — only shown when no active promotion */}
        {!hasActivePromotion && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {promoData.plans.map((plan) => {
                const Icon = levelIcons[plan.level as keyof typeof levelIcons];
                const isSelected = selectedPlan === plan.level;
                const isPopular = plan.level === 'silver';

                return (
                  <div
                    key={plan.level}
                    onClick={() => setSelectedPlan(plan.level)}
                    className={`relative bg-white rounded-xl shadow-lg p-6 cursor-pointer transition-all ${
                      isSelected ? 'ring-2 ring-indigo-600 scale-105' : 'hover:shadow-xl'
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-indigo-600 text-white text-xs font-medium rounded-full">
                        Najpopularniejszy
                      </div>
                    )}

                    <div className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br ${levelColors[plan.level as keyof typeof levelColors]} flex items-center justify-center`}>
                      <Icon className="w-8 h-8 text-black" />
                    </div>

                    <h3 className="text-xl font-bold text-center text-gray-900 mb-2">{plan.name}</h3>

                    <div className="text-center mb-4">
                      <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                      <span className="text-gray-500"> PLN</span>
                      <p className="text-sm text-gray-500">{plan.days} dni</p>
                    </div>

                    <ul className="space-y-2 mb-6">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <div className={`w-full h-1 rounded-full ${isSelected ? 'bg-indigo-600' : 'bg-gray-200'}`} />
                  </div>
                );
              })}
            </div>

            <div className="mt-8 text-center">
              <button
                onClick={handlePromote}
                disabled={!selectedPlan || promoteMutation.isPending}
                className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {promoteMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Przetwarzanie...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    {selectedPlan
                      ? `Kup promocję ${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)}`
                      : 'Wybierz plan'}
                  </>
                )}
              </button>
              <p className="text-sm text-gray-500 mt-2">
                Płatność przez Stripe - karty, BLIK, Przelewy24
              </p>
            </div>
          </>
        )}

        {/* Gold — no more upgrades available */}
        {hasActivePromotion && !hasUpgradeOptions && (
          <div className="mt-4 p-5 bg-yellow-50 border border-yellow-200 rounded-xl text-center">
            <Crown className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
            <p className="font-semibold text-yellow-900">Masz już najwyższy pakiet promocji (Gold)</p>
            <p className="text-sm text-yellow-700 mt-1">Nie ma wyższego poziomu do którego możesz awansować.</p>
          </div>
        )}
      </div>
    </div>
  );
}
