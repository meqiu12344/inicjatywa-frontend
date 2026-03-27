'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { 
  ArrowLeft, 
  BarChart3, 
  Calendar, 
  Eye, 
  Users, 
  TrendingUp,
  Smartphone,
  Monitor,
  Tablet,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api/client';

interface AdminStats {
  timeframe_days: number;
  total_events: number;
  total_views: number;
  total_registrations: number;
  active_users: number;
  events_by_category: Array<{
    id: number;
    name: string;
    count: number;
  }>;
  registrations_by_day: Array<{
    date: string;
    count: number;
  }>;
  device_breakdown: {
    mobile: number;
    desktop: number;
    tablet: number;
  };
}

const timeframeOptions = [
  { value: '7', label: 'Ostatnie 7 dni' },
  { value: '30', label: 'Ostatnie 30 dni' },
  { value: '90', label: 'Ostatnie 90 dni' },
  { value: '365', label: 'Ostatni rok' },
];

export default function AdminStatystykiPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [timeframe, setTimeframe] = useState('30');

  const { data: stats, isLoading, refetch, isRefetching } = useQuery<AdminStats>({
    queryKey: ['admin-stats', timeframe],
    queryFn: async () => {
      const response = await apiClient.get(`/statistics/admin/?timeframe=${timeframe}`);
      return response.data;
    },
    enabled: isAuthenticated && user?.is_staff,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user?.is_staff) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Brak dostępu</h1>
          <p className="text-gray-600 mb-4">Ta strona jest dostępna tylko dla administratorów.</p>
          <Link href="/" className="text-indigo-600 hover:text-indigo-800">
            Wróć do strony głównej
          </Link>
        </div>
      </div>
    );
  }

  const deviceTotal = stats 
    ? stats.device_breakdown.mobile + stats.device_breakdown.desktop + stats.device_breakdown.tablet 
    : 0;

  const getDevicePercentage = (count: number) => {
    if (deviceTotal === 0) return 0;
    return Math.round((count / deviceTotal) * 100);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Panel administracyjny
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <BarChart3 className="w-8 h-8 text-purple-600" />
                Statystyki platformy
              </h1>
              <p className="text-gray-600 mt-1">Przegląd aktywności i trendów</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {timeframeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => refetch()}
                disabled={isRefetching}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              >
                <RefreshCw className={`w-5 h-5 ${isRefetching ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : stats ? (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Zatwierdzone wydarzenia</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total_events}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Eye className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Wyświetlenia</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total_views.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Rejestracje</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total_registrations.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Aktywni użytkownicy</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.active_users.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Events by Category */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Wydarzenia według kategorii
                </h2>
                {stats.events_by_category.length > 0 ? (
                  <div className="space-y-3">
                    {stats.events_by_category.map((cat) => {
                      const maxCount = Math.max(...stats.events_by_category.map(c => c.count));
                      const percentage = maxCount > 0 ? (cat.count / maxCount) * 100 : 0;
                      return (
                        <div key={cat.id}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-700">{cat.name}</span>
                            <span className="font-medium text-gray-900">{cat.count}</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-indigo-500 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">Brak danych</p>
                )}
              </div>

              {/* Device Breakdown */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Podział urządzeń
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Monitor className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">Desktop</span>
                        <span className="font-medium text-gray-900">
                          {stats.device_breakdown.desktop.toLocaleString()} ({getDevicePercentage(stats.device_breakdown.desktop)}%)
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${getDevicePercentage(stats.device_breakdown.desktop)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">Mobile</span>
                        <span className="font-medium text-gray-900">
                          {stats.device_breakdown.mobile.toLocaleString()} ({getDevicePercentage(stats.device_breakdown.mobile)}%)
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${getDevicePercentage(stats.device_breakdown.mobile)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Tablet className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">Tablet</span>
                        <span className="font-medium text-gray-900">
                          {stats.device_breakdown.tablet.toLocaleString()} ({getDevicePercentage(stats.device_breakdown.tablet)}%)
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-500 rounded-full"
                          style={{ width: `${getDevicePercentage(stats.device_breakdown.tablet)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Registrations Chart (Simple Table) */}
              <div className="bg-white rounded-xl shadow-sm p-6 lg:col-span-2">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Rejestracje w czasie
                </h2>
                {stats.registrations_by_day.length > 0 ? (
                  <div className="overflow-x-auto">
                    <div className="flex gap-1 items-end h-48 min-w-[600px]">
                      {stats.registrations_by_day.map((day, index) => {
                        const maxCount = Math.max(...stats.registrations_by_day.map(d => d.count));
                        const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                        return (
                          <div 
                            key={index} 
                            className="flex-1 flex flex-col items-center gap-1"
                          >
                            <span className="text-xs text-gray-500">{day.count}</span>
                            <div 
                              className="w-full bg-indigo-500 rounded-t min-h-[4px]"
                              style={{ height: `${Math.max(height, 2)}%` }}
                              title={`${day.date}: ${day.count} rejestracji`}
                            />
                            <span className="text-xs text-gray-400 -rotate-45 origin-left whitespace-nowrap">
                              {new Date(day.date).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">Brak danych o rejestracjach w wybranym okresie</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nie udało się załadować statystyk</p>
          </div>
        )}
      </div>
    </div>
  );
}
