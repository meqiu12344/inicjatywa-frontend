'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Eye, Users, TrendingUp, Smartphone, 
  Monitor, Tablet, ExternalLink, Calendar, BarChart3,
  MousePointer
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api/client';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';

interface EventAnalytics {
  event_id: number;
  event_title: string;
  period_days: number;
  total_views: number;
  unique_visitors: number;
  total_registrations: number;
  conversion_rate: number;
  views_by_day: Array<{ date: string; count: number }>;
  device_breakdown: { mobile: number; desktop: number; tablet: number };
  top_referrers: Array<{ referrer: string; count: number }>;
  interactions: Record<string, number>;
}

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function EventStatisticsPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { isAuthenticated } = useAuth();
  const [timeframe, setTimeframe] = useState(30);

  const { data: analytics, isLoading, error } = useQuery<EventAnalytics>({
    queryKey: ['event-analytics', eventId, timeframe],
    queryFn: async () => {
      const response = await apiClient.get(`/statistics/events/${eventId}/?days=${timeframe}`);
      return response.data;
    },
    enabled: isAuthenticated && !!eventId,
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

  if (error || !analytics) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Błąd ładowania statystyk</h1>
          <Link href="/moje-wydarzenia" className="text-indigo-600 hover:underline">
            Wróć do wydarzeń
          </Link>
        </div>
      </div>
    );
  }

  const deviceData = [
    { name: 'Komputer', value: analytics.device_breakdown.desktop, icon: Monitor },
    { name: 'Telefon', value: analytics.device_breakdown.mobile, icon: Smartphone },
    { name: 'Tablet', value: analytics.device_breakdown.tablet, icon: Tablet },
  ].filter(d => d.value > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/moje-wydarzenia/${eventId}/edytuj`}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Powrót do wydarzenia
          </Link>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-indigo-600" />
                Statystyki wydarzenia
              </h1>
              <p className="text-gray-600 mt-1">{analytics.event_title}</p>
            </div>
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
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Wyświetlenia</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.total_views}</p>
              </div>
              <div className="p-3 bg-indigo-100 rounded-full">
                <Eye className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Unikalni odwiedzający</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.unique_visitors}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Rejestracje</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.total_registrations}</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-full">
                <Calendar className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Konwersja</p>
                <p className="text-3xl font-bold text-gray-900">{analytics.conversion_rate}%</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Views Chart */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Wyświetlenia w czasie</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.views_by_day}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString('pl-PL')}
                    formatter={(value: number | undefined) => [value ?? 0, 'Wyświetlenia']}
                  />
                  <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Device Breakdown */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Urządzenia</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deviceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }: { name?: string; percent?: number }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {deviceData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Referrers */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Źródła ruchu</h2>
            {analytics.top_referrers.length > 0 ? (
              <div className="space-y-3">
                {analytics.top_referrers.map((ref, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate">
                      <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700 truncate">{ref.referrer}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{ref.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Brak danych o źródłach ruchu</p>
            )}
          </div>

          {/* Interactions */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Interakcje</h2>
            <div className="space-y-4">
              {Object.entries(analytics.interactions).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MousePointer className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700">
                      {type === 'registration_view' && 'Otworzenie formularza'}
                      {type === 'registration_submit' && 'Wysłanie formularza'}
                      {type === 'share' && 'Udostępnienia'}
                      {type === 'cta_click' && 'Kliknięcia CTA'}
                      {type === 'contact_click' && 'Kliknięcia kontakt'}
                      {type === 'website_click' && 'Kliknięcia strona'}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
