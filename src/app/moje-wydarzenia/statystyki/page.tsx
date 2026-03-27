'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { 
  BarChart3, Eye, Users, Calendar, TrendingUp,
  ArrowRight, ChevronRight
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api/client';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';

interface OrganizerAnalytics {
  timeframe_days: number;
  event_count: number;
  total_views: number;
  total_registrations: number;
  conversion_rate: number;
  popular_events: Array<{
    id: number;
    title: string;
    slug: string;
    views_count: number;
    reg_count: number;
  }>;
  registrations_by_day: Array<{ date: string; count: number }>;
}

export default function OrganizerAnalyticsPage() {
  const { isAuthenticated } = useAuth();
  const [timeframe, setTimeframe] = useState(30);

  const { data: analytics, isLoading, error } = useQuery<OrganizerAnalytics>({
    queryKey: ['organizer-analytics', timeframe],
    queryFn: async () => {
      const response = await apiClient.get(`/statistics/organizer/?timeframe=${timeframe}`);
      return response.data;
    },
    enabled: isAuthenticated,
  });

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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Brak dostępu</h1>
          <p className="text-gray-600 mb-4">Musisz być organizatorem aby zobaczyć statystyki.</p>
          <Link href="/profil" className="text-indigo-600 hover:underline">
            Wróć do profilu
          </Link>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-indigo-600" />
                Statystyki organizatora
              </h1>
              <p className="text-gray-600 mt-1">Przegląd wszystkich Twoich wydarzeń</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Okres:</span>
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={7}>7 dni</option>
                  <option value={14}>14 dni</option>
                  <option value={30}>30 dni</option>
                  <option value={90}>90 dni</option>
                </select>
              </div>
              <Link
                href="/moje-wydarzenia"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
              >
                Moje wydarzenia
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Wszystkie wydarzenia</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.event_count}</p>
              </div>
              <div className="p-3 bg-indigo-100 rounded-full">
                <Calendar className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Łączne wyświetlenia</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.total_views}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Eye className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Łączne rejestracje</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.total_registrations}</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-full">
                <Users className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Średnia konwersja</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.conversion_rate}%</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Registrations Chart */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Rejestracje w czasie</h2>
            <div className="h-80">
              {analytics.registrations_by_day.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.registrations_by_day}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleDateString('pl-PL')}
                      formatter={(value: number | undefined) => [value ?? 0, 'Rejestracje']}
                    />
                    <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1' }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  Brak danych do wyświetlenia
                </div>
              )}
            </div>
          </div>

          {/* Popular Events */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Najpopularniejsze wydarzenia</h2>
            {analytics.popular_events.length > 0 ? (
              <div className="space-y-4">
                {analytics.popular_events.map((event, index) => (
                  <Link
                    key={event.id}
                    href={`/moje-wydarzenia/${event.id}/statystyki`}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-bold text-gray-300">#{index + 1}</span>
                      <div>
                        <p className="font-medium text-gray-900">{event.title}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            {event.views_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {event.reg_count}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                Brak wydarzeń do wyświetlenia
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
