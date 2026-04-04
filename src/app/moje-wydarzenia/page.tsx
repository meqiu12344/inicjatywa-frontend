'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import { 
  Calendar, MapPin, Users, Edit, Trash2, Eye, 
  Plus, Search, Star, AlertCircle, Clock,
  ChevronLeft, ChevronRight, CalendarX, Megaphone,
  FileText, EyeOff, Lock, CheckCircle, XCircle,
  ChevronDown, BarChart3, Settings
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { eventsApi } from '@/lib/api/events';
import { apiClient, getErrorMessage } from '@/lib/api/client';
import { useAuthStore, useHydration } from '@/stores/authStore';
import toast from 'react-hot-toast';
import { 
  getEffectiveStatus, 
  isEventExpired, 
  isEventUpcoming,
  getStatusLabel,
  STATUS_CHOICES
} from '@/lib/eventUtils';
import { StatusBadge, EventStateBadge } from '@/components/StatusBadge';
import type { EventStatus, EventListItem } from '@/types';

type TabType = 'upcoming' | 'past' | 'pending' | 'all';

const ITEMS_PER_PAGE = 10;

export default function MyEventsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const hydrated = useHydration();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [statusMenuOpen, setStatusMenuOpen] = useState<number | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.push('/logowanie?redirect=/moje-wydarzenia');
    }
  }, [hydrated, isAuthenticated, router]);

  // Reset page when tab or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  // Close status menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setStatusMenuOpen(null);
    if (statusMenuOpen !== null) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [statusMenuOpen]);

  // Pobierz wydarzenia użytkownika
  const { data: eventsData, isLoading, error } = useQuery({
    queryKey: ['my-events'],
    queryFn: () => eventsApi.getMyEvents(),
    enabled: isAuthenticated,
  });

  // Mutacja usuwania
  const deleteMutation = useMutation({
    mutationFn: eventsApi.deleteEvent,
    onSuccess: () => {
      toast.success('Wydarzenie zostało usunięte');
      queryClient.invalidateQueries({ queryKey: ['my-events'] });
      setDeleteConfirmId(null);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Nie udało się usunąć wydarzenia'));
      setDeleteConfirmId(null);
    },
  });

  // Mutacja zmiany statusu
  const changeStatusMutation = useMutation({
    mutationFn: async ({ eventId, status }: { eventId: number; status: string }) => {
      const response = await apiClient.post(`/events/${eventId}/change-status/`, { status });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Status został zmieniony');
      queryClient.invalidateQueries({ queryKey: ['my-events'] });
      setStatusMenuOpen(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Nie udało się zmienić statusu');
      setStatusMenuOpen(null);
    },
  });

  const allEvents: EventListItem[] = eventsData?.results || [];
  
  // Status options for dropdown - używamy STATUS_CHOICES z eventUtils
  const statusOptions = [
    { value: 'public' as EventStatus, label: 'Publiczne', icon: CheckCircle, color: 'text-green-400' },
    { value: 'draft' as EventStatus, label: 'Szkic', icon: FileText, color: 'text-gray-400' },
    { value: 'hidden' as EventStatus, label: 'Ukryte', icon: EyeOff, color: 'text-purple-400' },
    { value: 'closed' as EventStatus, label: 'Zamknięte', icon: Lock, color: 'text-red-400' },
  ];

  const handleStatusChange = (eventId: number, newStatus: EventStatus) => {
    changeStatusMutation.mutate({ eventId, status: newStatus });
  };

  // Calculate counts for tabs - używamy logiki z eventUtils
  const counts = useMemo(() => {
    return {
      upcoming: allEvents.filter(e => {
        const effectiveStatus = getEffectiveStatus(e as any);
        return isEventUpcoming(e) && effectiveStatus !== 'closed';
      }).length,
      past: allEvents.filter(e => isEventExpired(e)).length,
      pending: allEvents.filter(e => e.status === 'pending').length,
      all: allEvents.length,
    };
  }, [allEvents]);

  // Filtruj wydarzenia - używamy logiki z eventUtils
  const filteredEvents = useMemo(() => {
    return allEvents.filter(event => {
      const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase());
      const effectiveStatus = getEffectiveStatus(event as any);
      
      switch (activeTab) {
        case 'upcoming':
          return matchesSearch && isEventUpcoming(event) && effectiveStatus !== 'closed';
        case 'past':
          return matchesSearch && isEventExpired(event);
        case 'pending':
          return matchesSearch && event.status === 'pending';
        case 'all':
          return matchesSearch;
        default:
          return matchesSearch;
      }
    });
  }, [allEvents, activeTab, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredEvents.length / ITEMS_PER_PAGE);
  const paginatedEvents = filteredEvents.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleDelete = (eventId: number) => {
    deleteMutation.mutate(eventId);
  };

  // Funkcja getStatusBadge używa komponentu StatusBadge z eventUtils
  const getStatusBadge = (status: EventStatus) => {
    return <StatusBadge status={status} size="md" showIcon={true} />;
  };

  const getPromotionBadge = (event: EventListItem) => {
    if (!event.is_promoted) return null;
    
    const level = event.promotion_level || 'standard';
    const colors = {
      gold: 'bg-gradient-to-r from-yellow-500 to-amber-500 text-black',
      silver: 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800',
      standard: 'bg-gradient-to-r from-amber-600 to-amber-700 text-black',
    };
    
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${colors[level as keyof typeof colors] || colors.standard}`}>
        <Star className="w-3 h-3" />
        Promowane
      </span>
    );
  };

  if (!hydrated || !isAuthenticated) {
    return null;
  }

  const tabs = [
    { id: 'upcoming' as TabType, label: 'Nadchodzące', count: counts.upcoming, icon: Calendar },
    { id: 'past' as TabType, label: 'Przeszłe', count: counts.past, icon: Clock },
    { id: 'pending' as TabType, label: 'Oczekujące', count: counts.pending, icon: AlertCircle },
    { id: 'all' as TabType, label: 'Wszystkie', count: counts.all, icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Moje wydarzenia</h1>
            <p className="text-gray-400 mt-1">Zarządzaj swoimi wydarzeniami</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/wydarzenia/dodaj"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold rounded-xl shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all duration-300 transform hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              Dodaj wydarzenie
            </Link>
            <Link
              href="/spolecznosc-organizatorow"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 transform hover:scale-105"
            >
              <Users className="w-5 h-5" />
              Społeczność organizatorów
            </Link>
          </div>
        </div>

        {/* Tabs & Search Card */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 mb-6 overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-gray-700/50">
            <nav className="flex flex-wrap">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-2 px-4 sm:px-6 py-4 text-sm font-medium border-b-2 transition-all duration-200
                      ${activeTab === tab.id
                        ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                        : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600 hover:bg-gray-700/30'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      activeTab === tab.id 
                        ? 'bg-amber-500/20 text-amber-400' 
                        : 'bg-gray-700 text-gray-400'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Search */}
          <div className="p-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Szukaj po tytule wydarzenia..."
                className="w-full pl-10 pr-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Events List */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-32 h-32 bg-gray-700 rounded-xl" />
                  <div className="flex-1">
                    <div className="h-5 bg-gray-700 rounded w-1/3 mb-3" />
                    <div className="h-4 bg-gray-700 rounded w-1/4 mb-2" />
                    <div className="h-4 bg-gray-700 rounded w-1/5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
            <h3 className="text-lg font-medium text-red-400 mb-2">Błąd ładowania</h3>
            <p className="text-gray-400">Nie udało się załadować wydarzeń. Spróbuj ponownie później.</p>
          </div>
        ) : paginatedEvents.length > 0 ? (
          <>
            <div className="space-y-4">
              {paginatedEvents.map((event) => (
                <div
                  key={event.id}
                  className="group bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 hover:border-amber-500/30 hover:bg-gray-800/70 transition-all duration-300 overflow-hidden"
                >
                  <div className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                      {/* Event Image */}
                      <div className="w-full sm:w-36 h-36 rounded-xl overflow-hidden bg-gray-900/50 flex-shrink-0 relative">
                        {event.image ? (
                          <Image
                            src={event.image}
                            alt={event.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-600">
                            <Calendar className="w-12 h-12" />
                          </div>
                        )}
                      </div>

                      {/* Event Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="flex-1">
                            {/* Status Badges */}
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              {getStatusBadge(event.status || 'public')}
                              {getPromotionBadge(event)}
                            </div>
                            
                            {/* Title */}
                            <h3 className="text-lg font-semibold text-white group-hover:text-amber-400 transition-colors line-clamp-1">
                              {event.title}
                            </h3>
                            
                            {/* Date & Location */}
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center gap-2 text-sm text-gray-400">
                                <Calendar className="w-4 h-4 text-amber-500/70" />
                                <span>
                                  {format(parseISO(event.start_date), 'd MMMM yyyy, HH:mm', { locale: pl })}
                                </span>
                              </div>
                              {event.location && (
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                  <MapPin className="w-4 h-4 text-amber-500/70" />
                                  <span>{event.location.address ? `${event.location.address}, ` : ''}{event.location.city}</span>
                                </div>
                              )}
                            </div>

                            {/* Stats */}
                            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                              <div className="flex items-center gap-1.5 text-gray-400">
                                <Users className="w-4 h-4" />
                                <span>{event.registrations_count || 0} zapisanych</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-gray-400">
                                <Eye className="w-4 h-4" />
                                <span>{event.views_count || 0} wyświetleń</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-700/50">
                      <Link
                        href={`/wydarzenia/${event.slug}`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-300 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        Zobacz
                      </Link>
                      <Link
                        href={`/moje-wydarzenia/${event.id}/edytuj`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-300 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                        Edytuj
                      </Link>
                      <Link
                        href={`/moje-wydarzenia/${event.id}/rejestracje`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-300 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <Users className="w-4 h-4" />
                        Rejestracje
                      </Link>
                      <Link
                        href={`/moje-wydarzenia/${event.id}/statystyki`}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-300 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <BarChart3 className="w-4 h-4" />
                        Statystyki
                      </Link>
                      
                      {/* Status Dropdown */}
                      {event.status !== 'pending' && (
                        <div className="relative">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setStatusMenuOpen(statusMenuOpen === event.id ? null : event.id);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-300 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors"
                          >
                            <Settings className="w-4 h-4" />
                            Status
                            <ChevronDown className="w-3 h-3" />
                          </button>
                          
                          {statusMenuOpen === event.id && (
                            <div 
                              className="absolute left-0 top-full mt-1 z-50 w-48 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {statusOptions.map((option) => {
                                const Icon = option.icon;
                                const isActive = event.status === option.value;
                                return (
                                  <button
                                    key={option.value}
                                    onClick={() => handleStatusChange(event.id, option.value)}
                                    disabled={isActive || changeStatusMutation.isPending}
                                    className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-left transition-colors ${
                                      isActive 
                                        ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed' 
                                        : 'text-gray-300 hover:bg-gray-700'
                                    }`}
                                  >
                                    <Icon className={`w-4 h-4 ${option.color}`} />
                                    <span>{option.label}</span>
                                    {isActive && <span className="ml-auto text-xs text-gray-500">(aktualny)</span>}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Promote button - only for public events that are not promoted */}
                      {event.status === 'public' && !event.is_promoted && (
                        <Link
                          href={`/wydarzenia/${event.slug}/promuj`}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition-colors"
                        >
                          <Megaphone className="w-4 h-4" />
                          Promuj
                        </Link>
                      )}
                      
                      {/* Delete button */}
                      {deleteConfirmId === event.id ? (
                        <div className="flex items-center gap-2 ml-auto">
                          <span className="text-sm text-red-400">Na pewno?</span>
                          <button
                            onClick={() => handleDelete(event.id)}
                            disabled={deleteMutation.isPending}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {deleteMutation.isPending ? 'Usuwanie...' : 'Tak, usuń'}
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                          >
                            Anuluj
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(event.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg transition-colors ml-auto"
                        >
                          <Trash2 className="w-4 h-4" />
                          Usuń
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gray-800 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // Show first page, last page, current page, and pages around current
                  const showPage = page === 1 || page === totalPages || 
                    (page >= currentPage - 1 && page <= currentPage + 1);
                  const showEllipsis = page === currentPage - 2 || page === currentPage + 2;
                  
                  if (showEllipsis && totalPages > 5) {
                    return (
                      <span key={page} className="px-2 text-gray-500">...</span>
                    );
                  }
                  
                  if (!showPage && totalPages > 5) return null;
                  
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`inline-flex items-center justify-center w-10 h-10 rounded-lg font-medium transition-colors ${
                        currentPage === page
                          ? 'bg-amber-500 text-black'
                          : 'bg-gray-800 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gray-800 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        ) : (
          /* Empty State */
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-700/50 flex items-center justify-center">
              <CalendarX className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {searchQuery ? 'Brak wyników' : 'Brak wydarzeń'}
            </h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              {searchQuery 
                ? 'Nie znaleziono wydarzeń pasujących do wyszukiwania. Spróbuj zmienić kryteria.'
                : activeTab === 'upcoming' 
                  ? 'Nie masz żadnych nadchodzących wydarzeń. Dodaj swoje pierwsze wydarzenie!'
                  : activeTab === 'past'
                    ? 'Nie masz żadnych przeszłych wydarzeń.'
                    : activeTab === 'pending'
                      ? 'Nie masz żadnych wydarzeń oczekujących na akceptację.'
                      : 'Nie masz jeszcze żadnych wydarzeń. Zacznij od dodania pierwszego!'
              }
            </p>
            {!searchQuery && (activeTab === 'upcoming' || activeTab === 'all') && (
              <Link 
                href="/wydarzenia/dodaj" 
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold rounded-xl shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all duration-300"
              >
                <Plus className="w-5 h-5" />
                Dodaj pierwsze wydarzenie
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
