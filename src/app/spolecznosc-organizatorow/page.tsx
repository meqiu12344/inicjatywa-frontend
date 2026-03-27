'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Heart, Users, Calendar, BarChart3, Plus, List, 
  Trophy, Lightbulb, Mail, ArrowRight, CheckCircle,
  TrendingUp, Eye, UserCheck, Rocket
} from 'lucide-react';
import { get } from '@/lib/api/client';
import { useAuth } from '@/hooks/useAuth';

interface OrganizerStats {
  event_count: number;
  total_views: number;
  total_registrations: number;
}

interface RecentEvent {
  id: number;
  title: string;
  slug: string;
  start_date: string | null;
  views: number;
  registrations: number;
}

interface TopOrganizer {
  id: number;
  slug: string;
  organization_name: string;
  logo: string | null;
  event_count: number;
  is_verified: boolean;
}

interface Tip {
  number: number;
  title: string;
  description: string;
}

interface CommunityData {
  is_organizer: boolean;
  user_stats: OrganizerStats | null;
  recent_events: RecentEvent[];
  top_organizers: TopOrganizer[];
  tips: Tip[];
}

export default function OrganizerCommunityPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['organizer-community'],
    queryFn: () => get<CommunityData>('/auth/organizer-community/'),
    enabled: isAuthenticated,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <Heart className="w-16 h-16 text-blue-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Społeczność organizatorów</h1>
          <p className="text-gray-600 mb-8">
            Zaloguj się, aby uzyskać dostęp do zasobów dla organizatorów.
          </p>
          <Link 
            href="/logowanie" 
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Zaloguj się
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="animate-pulse space-y-8">
            <div className="h-12 bg-gray-200 rounded w-1/2 mx-auto" />
            <div className="h-6 bg-gray-200 rounded w-2/3 mx-auto" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-40 bg-gray-200 rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
        <div className="container mx-auto px-4 max-w-2xl text-center">
          <p className="text-red-500 mb-4">Nie udało się załadować danych</p>
          <Link href="/" className="text-blue-600 hover:underline">
            Wróć do strony głównej
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-3">
            <Heart className="w-10 h-10 text-red-500" />
            Społeczność organizatorów
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto mb-6">
            Witaj w społeczności organizatorów Inicjatywy Katolickiej! 
            Tutaj znajdziesz materiały pomocnicze, porady i wsparcie dla skutecznego organizowania wydarzeń.
          </p>
        </div>

        {/* Stats Section - for organizers */}
        {data.is_organizer && data.user_stats && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-blue-500" />
              Twoje statystyki
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center hover:shadow-md transition">
                <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-7 h-7 text-blue-600" />
                </div>
                <div className="text-4xl font-bold text-blue-600 mb-2">{data.user_stats.event_count}</div>
                <div className="text-gray-500 uppercase text-sm tracking-wide">Opublikowanych wydarzeń</div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center hover:shadow-md transition">
                <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Eye className="w-7 h-7 text-green-600" />
                </div>
                <div className="text-4xl font-bold text-green-600 mb-2">{data.user_stats.total_views}</div>
                <div className="text-gray-500 uppercase text-sm tracking-wide">Łącznych wyświetleń</div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center hover:shadow-md transition">
                <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <UserCheck className="w-7 h-7 text-purple-600" />
                </div>
                <div className="text-4xl font-bold text-purple-600 mb-2">{data.user_stats.total_registrations}</div>
                <div className="text-gray-500 uppercase text-sm tracking-wide">Zapisanych uczestników</div>
              </div>
            </div>
          </div>
        )}

        {/* Resources Grid */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-500" />
            Zasoby dla organizatorów
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link 
              href="/wydarzenia/dodaj" 
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4">
                <Plus className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition">Dodaj wydarzenie</h3>
              <p className="text-gray-500 text-sm">Utwórz nowe wydarzenie i dotrzyj do tysięcy wiernych w całej Polsce.</p>
            </Link>

            <Link 
              href="/moje-wydarzenia/statystyki" 
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-4">
                <BarChart3 className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-green-600 transition">Statystyki i analityka</h3>
              <p className="text-gray-500 text-sm">Analizuj wyświetlenia, rejestracje i skuteczność swoich wydarzeń.</p>
            </Link>

            <Link 
              href="/moje-wydarzenia" 
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mb-4">
                <List className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-orange-600 transition">Zarządzaj wydarzeniami</h3>
              <p className="text-gray-500 text-sm">Przeglądaj, edytuj i zarządzaj wszystkimi swoimi wydarzeniami.</p>
            </Link>

            <Link 
              href="/organizatorzy" 
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-purple-600 transition">Poznaj innych organizatorów</h3>
              <p className="text-gray-500 text-sm">Zobacz profile innych organizatorów i czerp inspirację z ich działalności.</p>
            </Link>
          </div>
        </div>

        {/* Top Organizers */}
        {data.top_organizers.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              Najaktwniejsi organizatorzy
            </h2>
            <div className="flex flex-wrap gap-4">
              {data.top_organizers.map((org) => (
                <Link
                  key={org.id}
                  href={`/organizatorzy/${org.slug}`}
                  className="flex items-center gap-4 bg-white px-5 py-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                    {org.logo ? (
                      <Image 
                        src={org.logo} 
                        alt={org.organization_name}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      org.organization_name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 flex items-center gap-2">
                      {org.organization_name}
                      {org.is_verified && (
                        <CheckCircle className="w-4 h-4 text-blue-500" />
                      )}
                    </div>
                    <div className="text-sm text-gray-500">{org.event_count} wydarzeń</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Tips Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-yellow-500" />
            Porady dla skutecznych wydarzeń
          </h2>
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.tips.map((tip) => (
                <div key={tip.number} className="flex gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    {tip.number}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">{tip.title}</h4>
                    <p className="text-gray-500 text-sm">{tip.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Section */}
        {!data.is_organizer ? (
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-10 text-center text-white">
            <Rocket className="w-12 h-12 mx-auto mb-4 opacity-90" />
            <h2 className="text-2xl font-bold mb-3">Zostań organizatorem</h2>
            <p className="text-blue-100 mb-6 max-w-xl mx-auto">
              Dołącz do grona organizatorów i zacznij tworzyć wydarzenia, 
              które będą inspirować i łączyć katolików w całej Polsce.
            </p>
            <Link
              href="/zostan-organizatorem"
              className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition"
            >
              <Plus className="w-5 h-5" />
              Złóż wniosek
            </Link>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-10 text-center text-white">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-90" />
            <h2 className="text-2xl font-bold mb-3">Gotowy na nowe wydarzenie?</h2>
            <p className="text-blue-100 mb-6 max-w-xl mx-auto">
              Twórz kolejne wydarzenia i buduj swoją społeczność. 
              Każde Twoje wydarzenie może dotrzeć do tysięcy wiernych.
            </p>
            <Link
              href="/wydarzenia/dodaj"
              className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition"
            >
              <Plus className="w-5 h-5" />
              Dodaj wydarzenie
            </Link>
          </div>
        )}

        {/* Contact Info */}
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-6 flex items-start gap-4">
          <Mail className="w-8 h-8 text-amber-600 flex-shrink-0 mt-1" />
          <div>
            <h4 className="font-semibold text-amber-800 mb-1">Potrzebujesz pomocy?</h4>
            <p className="text-amber-700 text-sm">
              Jeśli masz pytania dotyczące organizowania wydarzeń lub korzystania z platformy, 
              skontaktuj się z nami: <a href="mailto:kontakt@wydarzeniakatolickie.pl" className="text-blue-600 hover:underline">kontakt@wydarzeniakatolickie.pl</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
