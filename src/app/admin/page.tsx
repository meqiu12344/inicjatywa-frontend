'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Shield, 
  Users, 
  Calendar, 
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  BarChart3,
  Settings
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { adminApi } from '@/lib/api/admin';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const { data: requestStats } = useQuery({
    queryKey: ['organizer-request-stats'],
    queryFn: () => adminApi.getOrganizerRequestStats(),
    enabled: isAuthenticated && user?.is_staff && !authLoading,
  });
  
  const { data: eventStats } = useQuery({
    queryKey: ['pending-event-stats'],
    queryFn: () => adminApi.getPendingEventStats(),
    enabled: isAuthenticated && user?.is_staff && !authLoading,
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
          <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Brak dostępu</h1>
          <p className="text-gray-600 mb-4">Ta strona jest dostępna tylko dla administratorów.</p>
          <Link href="/" className="text-indigo-600 hover:text-indigo-800">
            Wróć do strony głównej
          </Link>
        </div>
      </div>
    );
  }

  const adminModules = [
    {
      title: 'Wnioski organizatorów',
      description: 'Zarządzaj wnioskami o rolę organizatora',
      href: '/admin/wnioski-organizatorow',
      icon: Users,
      stats: requestStats?.pending || 0,
      statsLabel: 'oczekujących',
      color: 'bg-blue-500',
    },
    {
      title: 'Zatwierdzanie wydarzeń',
      description: 'Przeglądaj i zatwierdzaj nowe wydarzenia',
      href: '/admin/wydarzenia',
      icon: Calendar,
      stats: eventStats?.pending || 0,
      statsLabel: 'oczekujących',
      color: 'bg-green-500',
    },
    {
      title: 'Statystyki',
      description: 'Przeglądaj statystyki platformy',
      href: '/admin/statystyki',
      icon: BarChart3,
      stats: null,
      statsLabel: '',
      color: 'bg-purple-500',
    },
    {
      title: 'Newsletter',
      description: 'Zarządzaj newsletterem i subskrybentami',
      href: '/admin/newsletter',
      icon: FileText,
      stats: null,
      statsLabel: '',
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-900">Panel administracyjny</h1>
          </div>
          <p className="text-gray-600">
            Witaj, {user.first_name || user.username}! Zarządzaj platformą z tego miejsca.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Wnioski oczekujące</p>
                <p className="text-2xl font-bold text-gray-900">{requestStats?.pending || 0}</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-full">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Wydarzenia do zatwierdzenia</p>
                <p className="text-2xl font-bold text-gray-900">{eventStats?.pending || 0}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Zatwierdzeni organizatorzy</p>
                <p className="text-2xl font-bold text-gray-900">{requestStats?.approved || 0}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Publiczne wydarzenia</p>
                <p className="text-2xl font-bold text-gray-900">{eventStats?.public || 0}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Admin Modules */}
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Moduły administracyjne</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {adminModules.map((module) => (
            <Link
              key={module.href}
              href={module.href}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className={`${module.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                <module.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{module.title}</h3>
              <p className="text-sm text-gray-600 mb-3">{module.description}</p>
              {module.stats !== null && (
                <div className="flex items-center gap-2">
                  <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {module.stats} {module.statsLabel}
                  </span>
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
