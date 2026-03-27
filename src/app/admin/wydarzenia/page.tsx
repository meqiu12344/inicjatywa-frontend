'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  MapPin,
  User,
  Eye,
  Filter,
  Tag,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { adminApi, PendingEvent } from '@/lib/api/admin';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { STATUS_CHOICES, EVENT_TYPE_CHOICES, getStatusLabel, getEventTypeLabel } from '@/lib/eventUtils';
import { StatusBadgeLight } from '@/components/StatusBadge';
import type { EventStatus, EventType } from '@/types';

export default function PendingEventsPage() {
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [selectedEvent, setSelectedEvent] = useState<PendingEvent | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  const { data: events, isLoading } = useQuery({
    queryKey: ['pending-events', statusFilter],
    queryFn: () => adminApi.getPendingEvents(statusFilter === 'all' ? undefined : statusFilter),
    enabled: isAuthenticated && user?.is_staff && !authLoading,
  });

  const { data: stats } = useQuery({
    queryKey: ['pending-event-stats'],
    queryFn: () => adminApi.getPendingEventStats(),
    enabled: isAuthenticated && user?.is_staff && !authLoading,
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => adminApi.approveEvent(id),
    onSuccess: () => {
      toast.success('Wydarzenie zostało zatwierdzone');
      queryClient.invalidateQueries({ queryKey: ['pending-events'] });
      queryClient.invalidateQueries({ queryKey: ['pending-event-stats'] });
      setSelectedEvent(null);
    },
    onError: () => {
      toast.error('Nie udało się zatwierdzić wydarzenia');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => 
      adminApi.rejectEvent(id, reason),
    onSuccess: () => {
      toast.success('Wydarzenie zostało odrzucone');
      queryClient.invalidateQueries({ queryKey: ['pending-events'] });
      queryClient.invalidateQueries({ queryKey: ['pending-event-stats'] });
      setSelectedEvent(null);
      setShowRejectModal(false);
      setRejectReason('');
    },
    onError: () => {
      toast.error('Nie udało się odrzucić wydarzenia');
    },
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Brak dostępu</h1>
          <Link href="/" className="text-indigo-600 hover:text-indigo-800">
            Wróć do strony głównej
          </Link>
        </div>
      </div>
    );
  }

  // Używamy komponentu StatusBadgeLight zamiast własnej funkcji
  const getStatusBadge = (status: string) => {
    return <StatusBadgeLight status={status as EventStatus} size="sm" showIcon={false} />;
  };

  const getEventTypeBadge = (type: string) => {
    const label = getEventTypeLabel(type as EventType);
    const types: Record<string, { bg: string; text: string }> = {
      free: { bg: 'bg-green-50', text: 'text-green-700' },
      voluntary: { bg: 'bg-blue-50', text: 'text-blue-700' },
      platform: { bg: 'bg-purple-50', text: 'text-purple-700' },
      paid: { bg: 'bg-orange-50', text: 'text-orange-700' },
    };
    const style = types[type] || types.free;
    return <span className={`${style.bg} ${style.text} text-xs font-medium px-2 py-0.5 rounded`}>{label}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="h-5 w-5" />
            Powrót do panelu
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Zatwierdzanie wydarzeń</h1>
              <p className="text-gray-600 mt-1">Przeglądaj i zatwierdzaj nowe wydarzenia</p>
            </div>
            <div className="flex gap-4">
              <div className="bg-white rounded-lg shadow-sm border px-4 py-2">
                <span className="text-sm text-gray-500">Oczekujące: </span>
                <span className="font-semibold text-yellow-600">{stats?.pending || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters - używamy STATUS_CHOICES z eventUtils */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Status:</span>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-indigo-100 text-indigo-700 font-medium'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Wszystkie
              </button>
              {STATUS_CHOICES.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setStatusFilter(option.value)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    statusFilter === option.value
                      ? 'bg-indigo-100 text-indigo-700 font-medium'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                </div>
              ) : events?.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Brak wydarzeń do wyświetlenia</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {events?.map((event) => (
                    <div
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedEvent?.id === event.id ? 'bg-indigo-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                          {event.image_url ? (
                            <Image
                              src={event.image_url}
                              alt={event.title}
                              width={80}
                              height={80}
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <Calendar className="h-8 w-8 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {event.title}
                            </h3>
                            {getStatusBadge(event.status)}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                            <User className="h-4 w-4" />
                            {event.user.username}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                            <Clock className="h-4 w-4" />
                            {format(new Date(event.start_date), 'd MMM yyyy, HH:mm', { locale: pl })}
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <MapPin className="h-4 w-4" />
                              {event.location.city}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Detail Panel */}
          <div className="lg:col-span-1">
            {selectedEvent ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-4">
                {selectedEvent.image_url && (
                  <div className="w-full h-40 bg-gray-200 rounded-lg overflow-hidden mb-4">
                    <Image
                      src={selectedEvent.image_url}
                      alt={selectedEvent.title}
                      width={400}
                      height={160}
                      className="object-cover w-full h-full"
                    />
                  </div>
                )}
                
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  {getStatusBadge(selectedEvent.status)}
                  {getEventTypeBadge(selectedEvent.event_type)}
                </div>
                
                <h3 className="font-bold text-lg text-gray-900 mb-4">{selectedEvent.title}</h3>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Twórca:</span>
                    <span className="text-gray-900">{selectedEvent.user.username}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">Data:</span>
                    <span className="text-gray-900">
                      {format(new Date(selectedEvent.start_date), 'd MMM yyyy, HH:mm', { locale: pl })}
                    </span>
                  </div>
                  
                  {selectedEvent.location && (
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div>
                        <span className="text-gray-600">Lokalizacja:</span>
                        <p className="text-gray-900">
                          {selectedEvent.location.city}
                          {selectedEvent.location.address && `, ${selectedEvent.location.address}`}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {selectedEvent.categories.length > 0 && (
                    <div className="flex items-start gap-2 text-sm">
                      <Tag className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div className="flex flex-wrap gap-1">
                        {selectedEvent.categories.map((cat) => (
                          <span key={cat.id} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs">
                            {cat.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedEvent.description && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Opis</p>
                      <div 
                        className="text-sm text-gray-700 prose prose-sm max-h-40 overflow-y-auto"
                        dangerouslySetInnerHTML={{ __html: selectedEvent.description }}
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mb-4">
                  <Link
                    href={`/wydarzenia/${selectedEvent.slug}`}
                    target="_blank"
                    className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <Eye className="h-4 w-4" />
                    Podgląd
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>

                {selectedEvent.status === 'pending' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => approveMutation.mutate(selectedEvent.id)}
                      disabled={approveMutation.isPending}
                      className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <CheckCircle className="h-5 w-5" />
                      Zatwierdź
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      disabled={rejectMutation.isPending}
                      className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <XCircle className="h-5 w-5" />
                      Odrzuć
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Wybierz wydarzenie, aby zobaczyć szczegóły</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Odrzuć wydarzenie</h3>
            <p className="text-sm text-gray-600 mb-4">
              Podaj powód odrzucenia wydarzenia &quot;{selectedEvent.title}&quot;:
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              rows={4}
              placeholder="Wpisz powód odrzucenia..."
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={() => {
                  rejectMutation.mutate({ id: selectedEvent.id, reason: rejectReason });
                }}
                disabled={rejectMutation.isPending}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                Odrzuć wydarzenie
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
