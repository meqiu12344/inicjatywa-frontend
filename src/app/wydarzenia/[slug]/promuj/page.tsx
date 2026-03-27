'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound, useRouter, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Sparkles, Crown, Medal, Star, Check, ArrowLeft, ArrowRight,
  TrendingUp, Eye, MousePointer, Users, Calendar, AlertTriangle,
  Info, Shield, Clock, Loader2, CheckCircle, XCircle, PartyPopper
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useEvent } from '@/hooks/useEvents';
import { apiClient } from '@/lib/api/client';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { canPromote, getStatusLabel } from '@/lib/eventUtils';

interface PromoteEventPageProps {
  params: Promise<{ slug: string }>;
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
  plans: {
    level: string;
    name: string;
    price: number;
    days: number;
    features: string[];
  }[];
  upgrade_options: {
    level: string;
    name: string;
    price_difference: number;
    new_days: number;
  }[] | null;
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

const planConfig: Record<string, { icon: typeof Medal; color: string; popular?: boolean; features: string[] }> = {
  bronze: {
    icon: Medal,
    color: 'from-amber-600 to-amber-700',
    features: [
      'Widoczność w sekcji promowanych na stronie głównej',
      'Odznaka Bronze przy wydarzeniu',
      'Statystyki promocji (wyświetlenia, kliknięcia, CTR)',
    ],
  },
  silver: {
    icon: Star,
    color: 'from-gray-400 to-gray-500',
    popular: true,
    features: [
      'Widoczność w sekcji promowanych na stronie głównej',
      'Priorytetowa pozycja w wynikach wyszukiwania',
      'Odznaka Silver przy wydarzeniu',
      'Statystyki promocji (wyświetlenia, kliknięcia, CTR)',
    ],
  },
  gold: {
    icon: Crown,
    color: 'from-yellow-400 to-yellow-600',
    features: [
      'Najwyższa pozycja w wynikach wyszukiwania',
      'Baner na stronie głównej',
      'Widoczność w sekcji promowanych',
      'Wyróżnienie w cotygodniowym newsletterze',
      'Odznaka Gold przy wydarzeniu',
      'Statystyki promocji (wyświetlenia, kliknięcia, CTR)',
    ],
  },
};

const benefits = [
  {
    icon: Eye,
    title: 'Większa widoczność',
    description: 'Twoje wydarzenie będzie wyświetlane w sekcji promowanych na stronie głównej i w wynikach wyszukiwania.',
  },
  {
    icon: TrendingUp,
    title: 'Więcej uczestników',
    description: 'Promowane wydarzenia notują średnio 3x więcej wyświetleń i 2x więcej rejestracji.',
  },
  {
    icon: MousePointer,
    title: 'Szczegółowe statystyki',
    description: 'Śledź skuteczność promocji dzięki statystykom wyświetleń, kliknięć i współczynnika konwersji.',
  },
  {
    icon: Users,
    title: 'Dotarcie do społeczności',
    description: 'Twoje wydarzenie dotrze do tysięcy katolików szukających inspirujących spotkań.',
  },
];

export default function PromoteEventPage({ params }: PromoteEventPageProps) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  
  const status = searchParams.get('status');
  const level = searchParams.get('level');
  
  const { data: event, isLoading: eventLoading, error: eventError } = useEvent(slug);
  const { isAuthenticated, user, isOrganizer, isLoading: authLoading } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  // Refetch data after payment success
  useEffect(() => {
    if (status === 'success') {
      // Invalidate queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['event-promotion'] });
      queryClient.invalidateQueries({ queryKey: ['event', slug] });
    }
  }, [status, slug, queryClient]);

  // Fetch promotion data from API
  const { data: promoData, isLoading: promoLoading, refetch: refetchPromo } = useQuery<PromotionData>({
    queryKey: ['event-promotion', event?.id],
    queryFn: async () => {
      const response = await apiClient.get(`/events/${event?.id}/promote/`);
      return response.data;
    },
    enabled: isAuthenticated && !!event?.id,
  });

  // Mutation for creating promotion
  const promoteMutation = useMutation({
    mutationFn: async (level: string) => {
      const response = await apiClient.post(`/events/${event?.id}/promote/`, { level });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.checkout_url) {
        toast.success('Przekierowanie do płatności...');
        window.location.href = data.checkout_url;
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Błąd podczas tworzenia promocji');
    },
  });

  // Mutation for upgrading promotion
  const upgradeMutation = useMutation({
    mutationFn: async (level: string) => {
      const response = await apiClient.post(`/events/${event?.id}/upgrade-promotion/`, { level });
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

  const isLoading = eventLoading || promoLoading || authLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (eventError || !event) {
    notFound();
  }

  // Check permissions
  const isOwner = user && (user.is_staff || user.id === event.user.id);
  const canPromoteEvent = isOwner && (isOrganizer || user?.is_staff);
  
  // Show success message after payment
  if (status === 'success') {
    const levelName = level === 'gold' ? 'Gold' : level === 'silver' ? 'Silver' : 'Bronze';
    const LevelIcon = level === 'gold' ? Crown : level === 'silver' ? Star : Medal;
    const levelColor = levelColors[level as keyof typeof levelColors] || 'from-indigo-500 to-purple-600';
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <div className="container-custom py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-8">
              <div className="relative inline-block">
                <div className={`w-24 h-24 bg-gradient-to-r ${levelColor} rounded-full flex items-center justify-center mx-auto mb-4`}>
                  <LevelIcon className="w-12 h-12 text-black" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
                  <Check className="w-6 h-6 text-black" />
                </div>
              </div>
            </div>
            
            <PartyPopper className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Płatność zakończona pomyślnie!</h1>
            <p className="text-lg text-slate-600 mb-2">
              Twoja promocja <strong className="text-indigo-600">{levelName}</strong> jest aktywna.
            </p>
            <p className="text-slate-500 mb-8">
              Wydarzenie &quot;{event.title}&quot; będzie teraz widoczne w sekcji promowanych.
            </p>
            
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-8 text-left">
              <h3 className="font-semibold text-emerald-900 mb-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Co zostało aktywowane:
              </h3>
              <ul className="space-y-2 text-emerald-800 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  Wyświetlanie w sekcji promowanych na stronie głównej
                </li>
                {(level === 'silver' || level === 'gold') && (
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    Priorytetowa pozycja w wynikach wyszukiwania
                  </li>
                )}
                {level === 'gold' && (
                  <>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600" />
                      Baner na stronie głównej
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600" />
                      Wyróżnienie w cotygodniowym newsletterze
                    </li>
                  </>
                )}
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  Statystyki promocji (wyświetlenia, kliknięcia, CTR)
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  Odznaka {levelName} przy wydarzeniu
                </li>
              </ul>
            </div>
            
            <div className="flex gap-4 justify-center">
              <Link
                href={`/wydarzenia/${slug}`}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Zobacz wydarzenie
              </Link>
              <Link
                href={`/moje-wydarzenia/${event.id}/statystyki`}
                className="btn-outline inline-flex items-center gap-2"
              >
                <TrendingUp className="w-4 h-4" />
                Statystyki
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show cancel message
  if (status === 'cancel') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <div className="container-custom py-16">
          <div className="max-w-2xl mx-auto text-center">
            <XCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Płatność anulowana</h1>
            <p className="text-lg text-slate-600 mb-8">
              Płatność została anulowana. Możesz spróbować ponownie wybierając pakiet poniżej.
            </p>
            <button
              onClick={() => router.replace(`/wydarzenia/${slug}/promuj`)}
              className="btn-primary inline-flex items-center gap-2"
            >
              Spróbuj ponownie
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated || !isOwner) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <div className="container-custom py-16">
          <div className="max-w-2xl mx-auto text-center">
            <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Brak uprawnień</h1>
            <p className="text-lg text-slate-600 mb-8">
              Tylko właściciel wydarzenia może promować to wydarzenie.
            </p>
            <Link
              href={`/wydarzenia/${slug}`}
              className="btn-primary inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Powrót do wydarzenia
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!canPromoteEvent) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <div className="container-custom py-16">
          <div className="max-w-2xl mx-auto text-center">
            <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Tylko dla organizatorów</h1>
            <p className="text-lg text-slate-600 mb-8">
              Promowanie wydarzeń jest dostępne wyłącznie dla zweryfikowanych organizatorów.
              Złóż wniosek o status organizatora, aby odblokować tę funkcję.
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/zostan-organizatorem"
                className="btn-primary inline-flex items-center gap-2"
              >
                Zostań organizatorem
              </Link>
              <Link
                href={`/wydarzenia/${slug}`}
                className="btn-outline inline-flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Powrót do wydarzenia
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (event.status !== 'public') {
    // Używamy logiki z eventUtils do sprawdzenia możliwości promocji
    const promoteCheck = canPromote(event);
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <div className="container-custom py-16">
          <div className="max-w-2xl mx-auto text-center">
            <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-slate-900 mb-4">Wydarzenie niedostępne do promocji</h1>
            <p className="text-lg text-slate-600 mb-8">
              {promoteCheck.reason || `Tylko publiczne wydarzenia mogą być promowane. Twoje wydarzenie ma status: `}
              <strong>{getStatusLabel(event.status)}</strong>.
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                href={`/wydarzenia/${slug}/edytuj`}
                className="btn-primary inline-flex items-center gap-2"
              >
                Edytuj wydarzenie
              </Link>
              <Link
                href={`/wydarzenia/${slug}`}
                className="btn-outline inline-flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Powrót
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show active promotion info
  if (promoData?.is_promoted && promoData.active_promotion) {
    const Icon = levelIcons[promoData.active_promotion.level as keyof typeof levelIcons] || Star;
    const color = levelColors[promoData.active_promotion.level as keyof typeof levelColors] || 'from-indigo-500 to-purple-600';
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <div className="container-custom py-16">
          <Link
            href={`/wydarzenia/${slug}`}
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Powrót do wydarzenia
          </Link>

          <div className={`bg-gradient-to-r ${color} rounded-2xl p-8 text-black mb-8`}>
            <div className="flex items-center gap-4 mb-6">
              <Icon className="w-12 h-12" />
              <div>
                <h1 className="text-3xl font-bold">Wydarzenie jest już promowane!</h1>
                <p className="text-black/80 mt-1">
                  Pakiet {promoData.active_promotion.level.charAt(0).toUpperCase() + promoData.active_promotion.level.slice(1)}
                </p>
              </div>
            </div>
            
            <div className="bg-white/10 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="w-6 h-6" />
                <span className="text-xl font-semibold">
                  Pozostało {promoData.active_promotion.days_remaining} dni
                </span>
              </div>
              <p className="text-black/80">
                Promocja wygasa: {new Date(promoData.active_promotion.end_date).toLocaleDateString('pl-PL', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
            <Link
              href={`/moje-wydarzenia/${event.id}/statystyki`}
              className="bg-white rounded-xl p-6 border border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all flex items-center gap-4"
            >
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Zobacz statystyki</h3>
                <p className="text-slate-600 text-sm">Sprawdź skuteczność promocji</p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 ml-auto" />
            </Link>

            <Link
              href={`/wydarzenia/${slug}`}
              className="bg-white rounded-xl p-6 border border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all flex items-center gap-4"
            >
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Eye className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Zobacz wydarzenie</h3>
                <p className="text-slate-600 text-sm">Jak widzą je użytkownicy</p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 ml-auto" />
            </Link>
          </div>

          {/* Upgrade Options */}
          {promoData.upgrade_options && promoData.upgrade_options.length > 0 && (
            <div className="max-w-4xl mt-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-yellow-500" />
                Ulepsz swój pakiet
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                {promoData.upgrade_options.map((option) => {
                  const UpgradeIcon = levelIcons[option.level as keyof typeof levelIcons] || Star;
                  const upgradeColor = levelColors[option.level as keyof typeof levelColors] || 'from-indigo-500 to-purple-600';
                  const config = planConfig[option.level];
                  return (
                    <div
                      key={option.level}
                      className="bg-white rounded-xl border-2 border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all p-6"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-12 h-12 bg-gradient-to-r ${upgradeColor} rounded-xl flex items-center justify-center`}>
                          <UpgradeIcon className="w-6 h-6 text-black" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900">Upgrade do {option.name}</h3>
                          <p className="text-slate-500 text-sm">{option.new_days} dni promocji</p>
                        </div>
                      </div>
                      {config && (
                        <ul className="space-y-2 mb-4">
                          {config.features.map((feature, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                              <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-2xl font-bold text-slate-900">+{option.price_difference}</span>
                          <span className="text-slate-500 ml-1">PLN</span>
                        </div>
                        <button
                          onClick={() => upgradeMutation.mutate(option.level)}
                          disabled={upgradeMutation.isPending}
                          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
                        >
                          {upgradeMutation.isPending ? (
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
        </div>
      </div>
    );
  }

  const handlePromote = (planLevel: string) => {
    setSelectedPlan(planLevel);
    promoteMutation.mutate(planLevel);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="container-custom py-16">
          <Link
            href={`/wydarzenia/${slug}`}
            className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Powrót do wydarzenia
          </Link>
          
          <div className="flex items-start gap-8">
            {event.image && (
              <div className="hidden md:block w-48 h-32 rounded-xl overflow-hidden flex-shrink-0">
                <Image
                  src={event.image}
                  alt={event.title}
                  width={192}
                  height={128}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="w-8 h-8" />
                <h1 className="text-4xl font-bold">Promuj swoje wydarzenie</h1>
              </div>
              <p className="text-xl text-white/90 mb-2">{event.title}</p>
              <p className="text-white/80">
                Zwiększ widoczność swojego wydarzenia i dotrzyj do szerszej społeczności katolickiej w Polsce
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="container-custom -mt-8">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 flex items-start gap-4 max-w-4xl mx-auto">
          <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">Jak działa promocja?</h3>
            <p className="text-blue-800 text-sm">
              Po wybraniu pakietu i dokonaniu płatności, Twoje wydarzenie zostanie oznaczone specjalną odznaką 
              i będzie wyświetlane w sekcjach promowanych na stronie głównej oraz w wynikach wyszukiwania. 
              Dodatkowo otrzymasz dostęp do szczegółowych statystyk.
            </p>
          </div>
        </div>
      </div>

      {/* Pricing Plans */}
      <div className="container-custom py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Wybierz pakiet promocji</h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Wszystkie pakiety zawierają pełną obsługę i możliwość śledzenia statystyk
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-20">
          {(promoData?.plans ?? []).map((apiPlan) => {
            const config = planConfig[apiPlan.level] ?? planConfig.bronze;
            const PlanIcon = config.icon;
            return (
            <div
              key={apiPlan.level}
              className={clsx(
                'relative bg-white rounded-2xl border-2 transition-all duration-300',
                config.popular 
                  ? 'border-indigo-600 shadow-xl scale-105' 
                  : 'border-slate-200 hover:border-indigo-300 hover:shadow-lg'
              )}
            >
              {config.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-indigo-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Najpopularniejszy
                  </span>
                </div>
              )}

              <div className="p-8">
                <div className={clsx(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-black font-semibold mb-6',
                  `bg-gradient-to-r ${config.color}`
                )}>
                  <PlanIcon className="w-5 h-5" />
                  {apiPlan.name}
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-slate-900">{apiPlan.price}</span>
                    <span className="text-slate-600">PLN</span>
                  </div>
                  <p className="text-slate-600 mt-2">{apiPlan.days} dni promocji</p>
                </div>

                <ul className="space-y-4 mb-8">
                  {config.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handlePromote(apiPlan.level)}
                  disabled={promoteMutation.isPending}
                  className={clsx(
                    'w-full py-3 px-6 rounded-xl font-semibold transition-all duration-200',
                    config.popular
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-xl'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-900',
                    promoteMutation.isPending && selectedPlan === apiPlan.level && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {promoteMutation.isPending && selectedPlan === apiPlan.level ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Przetwarzanie...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Wybierz pakiet
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </button>
              </div>
            </div>
            );
          })}
        </div>

        {/* Benefits Section */}
        <div className="max-w-6xl mx-auto">
          <h3 className="text-2xl font-bold text-slate-900 text-center mb-12">
            Korzyści z promocji wydarzenia
          </h3>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, idx) => (
              <div key={idx} className="bg-white rounded-xl p-6 border border-slate-200">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
                  <benefit.icon className="w-6 h-6 text-indigo-600" />
                </div>
                <h4 className="font-semibold text-slate-900 mb-2">{benefit.title}</h4>
                <p className="text-slate-600 text-sm">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Security Info */}
        <div className="max-w-4xl mx-auto mt-16">
          <div className="bg-slate-50 rounded-xl p-8 border border-slate-200">
            <div className="flex items-start gap-4">
              <Shield className="w-6 h-6 text-slate-600 flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Bezpieczne płatności</h4>
                <p className="text-slate-600 text-sm">
                  Wszystkie transakcje są zabezpieczone i przetwarzane przez zaufanych partnerów płatniczych. 
                  Twoje dane są chronione zgodnie z najwyższymi standardami bezpieczeństwa.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
