'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import { 
  ArrowLeft, Users, Check, X, Mail, Calendar,
  Download, Search, CheckCircle, XCircle, Clock,
  User, MapPin, Trash2, ChevronLeft, ChevronRight, Inbox, FileText,
  Send, Loader2
} from 'lucide-react';
import { get, post, patch, del, getErrorMessage } from '@/lib/api/client';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

interface Registration {
  id: number;
  user: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    profile_image?: string;
  };
  registration_date: string;
  attended: boolean;
  notes: string;
  status: 'pending' | 'confirmed' | 'cancelled';
}

interface Event {
  id: number;
  title: string;
  slug: string;
  start_date: string;
  end_date: string;
  location?: {
    name: string;
    city: string;
  };
  participant_limit: number | null;
  owner: number;
}

interface RegistrationsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Registration[];
}

type StatusFilter = 'all' | 'pending' | 'confirmed' | 'cancelled';

export default function EventRegistrationsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();
  
  const eventId = params.id as string;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageSubject, setMessageSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const pageSize = 10;

  // Pobierz dane wydarzenia
  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => get<Event>(`/events/${eventId}/`),
    enabled: !!eventId,
  });

  // Pobierz rejestracje
  const { data: registrationsData, isLoading: registrationsLoading, refetch } = useQuery({
    queryKey: ['event-registrations', eventId, currentPage, statusFilter, searchQuery],
    queryFn: () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        page_size: pageSize.toString(),
      });
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }
      return get<RegistrationsResponse>(`/events/${eventId}/registrations/?${params}`);
    },
    enabled: !!eventId,
  });

  // Pobierz wszystkie rejestracje dla statystyk
  const { data: allRegistrationsData } = useQuery({
    queryKey: ['event-registrations-stats', eventId],
    queryFn: () => get<RegistrationsResponse>(`/events/${eventId}/registrations/?page_size=1000`),
    enabled: !!eventId,
  });

  const registrations = registrationsData?.results || [];
  const totalCount = registrationsData?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Statystyki
  const stats = useMemo(() => {
    const allRegs = allRegistrationsData?.results || [];
    return {
      total: allRegistrationsData?.count || 0,
      confirmed: allRegs.filter(r => r.status === 'confirmed').length,
      pending: allRegs.filter(r => r.status === 'pending').length,
      cancelled: allRegs.filter(r => r.status === 'cancelled').length,
    };
  }, [allRegistrationsData]);

  // Mutacja aktualizacji statusu
  const updateStatusMutation = useMutation({
    mutationFn: ({ registrationId, status }: { registrationId: number; status: string }) =>
      patch(`/events/${eventId}/registrations/${registrationId}/`, { status }),
    onSuccess: () => {
      toast.success('Status zaktualizowany');
      queryClient.invalidateQueries({ queryKey: ['event-registrations'] });
      queryClient.invalidateQueries({ queryKey: ['event-registrations-stats'] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Nie udało się zaktualizować statusu'));
    },
    onSettled: () => {
      setActionLoading(null);
    },
  });

  // Mutacja oznaczania obecności
  const updateAttendanceMutation = useMutation({
    mutationFn: ({ registrationId, attended }: { registrationId: number; attended: boolean }) =>
      patch(`/events/${eventId}/registrations/${registrationId}/`, { attended }),
    onSuccess: () => {
      toast.success('Obecność zaktualizowana');
      queryClient.invalidateQueries({ queryKey: ['event-registrations'] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Nie udało się zaktualizować obecności'));
    },
    onSettled: () => {
      setActionLoading(null);
    },
  });

  // Mutacja usuwania rejestracji
  const deleteRegistrationMutation = useMutation({
    mutationFn: (registrationId: number) =>
      del(`/events/${eventId}/registrations/${registrationId}/`),
    onSuccess: () => {
      toast.success('Rejestracja usunięta');
      queryClient.invalidateQueries({ queryKey: ['event-registrations'] });
      queryClient.invalidateQueries({ queryKey: ['event-registrations-stats'] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Nie udało się usunąć rejestracji'));
    },
    onSettled: () => {
      setActionLoading(null);
    },
  });

  // Mutacja wysyłania wiadomości do uczestników
  const sendMessageMutation = useMutation({
    mutationFn: (data: { subject: string; message: string }) =>
      post<{ message: string; success_count: number; fail_count: number }>(`/events/${eventId}/registrations/send-message/`, data),
    onSuccess: (data) => {
      toast.success(data.message);
      setShowMessageModal(false);
      setMessageSubject('');
      setMessageBody('');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Nie udało się wysłać wiadomości';
      toast.error(message);
    },
  });

  const handleSendMessage = () => {
    if (messageSubject.length < 5) {
      toast.error('Temat wiadomości musi mieć co najmniej 5 znaków');
      return;
    }
    if (messageBody.length < 20) {
      toast.error('Treść wiadomości musi mieć co najmniej 20 znaków');
      return;
    }
    sendMessageMutation.mutate({ subject: messageSubject, message: messageBody });
  };

  const handleStatusUpdate = (registrationId: number, status: string) => {
    setActionLoading(registrationId);
    updateStatusMutation.mutate({ registrationId, status });
  };

  const handleAttendanceUpdate = (registrationId: number, attended: boolean) => {
    setActionLoading(registrationId);
    updateAttendanceMutation.mutate({ registrationId, attended });
  };

  const handleDelete = (registrationId: number) => {
    if (!confirm('Czy na pewno chcesz usunąć tę rejestrację?')) return;
    setActionLoading(registrationId);
    deleteRegistrationMutation.mutate(registrationId);
  };

  // Export do CSV
  const exportToCSV = () => {
    const allRegs = allRegistrationsData?.results || [];
    const headers = ['Imię i nazwisko', 'Email', 'Data rejestracji', 'Status', 'Obecność'];
    const rows = allRegs.map(reg => [
      `${reg.user.first_name || ''} ${reg.user.last_name || ''}`.trim() || reg.user.username,
      reg.user.email,
      format(parseISO(reg.registration_date), 'dd.MM.yyyy HH:mm'),
      reg.status === 'confirmed' ? 'Potwierdzona' : reg.status === 'pending' ? 'Oczekująca' : 'Anulowana',
      reg.attended ? 'Tak' : 'Nie'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `rejestracje-${event?.slug || eventId}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Export do PDF (placeholder)
  const exportToPDF = () => {
    toast('Eksport do PDF będzie dostępny wkrótce', { icon: '📄' });
  };

  const getUserDisplayName = (user: Registration['user']) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return user.username;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
            <CheckCircle className="w-3.5 h-3.5" />
            Potwierdzona
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" />
            Oczekująca
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
            <XCircle className="w-3.5 h-3.5" />
            Anulowana
          </span>
        );
      default:
        return null;
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value: StatusFilter) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/logowanie');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  const isLoading = eventLoading || registrationsLoading;
  const backHref = event?.slug
    ? `/wydarzenia/${event.slug}`
    : `/moje-wydarzenia/${eventId}/edytuj`;

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href={backHref}
            className="inline-flex items-center gap-2 text-neutral-400 hover:text-amber-400 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Powrót do wydarzenia
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                Rejestracje
              </h1>
              {event && (
                <p className="text-neutral-400 mt-1">{event.title}</p>
              )}
            </div>

            {/* Export Buttons */}
            <div className="flex gap-3">
              {stats.total > 0 && (
                <button
                  onClick={() => setShowMessageModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Mail className="w-5 h-5" />
                  Wyślij wiadomość
                </button>
              )}
              <button
                onClick={exportToCSV}
                className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors border border-neutral-700"
              >
                <Download className="w-5 h-5" />
                CSV
              </button>
              <button
                onClick={exportToPDF}
                className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors border border-neutral-700"
              >
                <FileText className="w-5 h-5" />
                PDF
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-neutral-800 rounded-lg">
                <Users className="w-6 h-6 text-neutral-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-sm text-neutral-400">Wszystkie</p>
              </div>
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-500/10 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.confirmed}</p>
                <p className="text-sm text-neutral-400">Potwierdzone</p>
              </div>
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 rounded-lg">
                <Clock className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.pending}</p>
                <p className="text-sm text-neutral-400">Oczekujące</p>
              </div>
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-500/10 rounded-lg">
                <XCircle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.cancelled}</p>
                <p className="text-sm text-neutral-400">Anulowane</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
              <input
                type="text"
                placeholder="Szukaj po imieniu lub email..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value as StatusFilter)}
              className="px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
            >
              <option value="all">Wszystkie statusy</option>
              <option value="pending">Oczekujące</option>
              <option value="confirmed">Potwierdzone</option>
              <option value="cancelled">Anulowane</option>
            </select>
          </div>
        </div>

        {/* Registrations Table */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-neutral-400">Ładowanie rejestracji...</p>
            </div>
          ) : registrations.length === 0 ? (
            <div className="p-12 text-center">
              <Inbox className="w-16 h-16 text-neutral-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                Brak rejestracji
              </h3>
              <p className="text-neutral-400">
                {searchQuery || statusFilter !== 'all'
                  ? 'Nie znaleziono rejestracji pasujących do filtrów'
                  : 'To wydarzenie nie ma jeszcze żadnych rejestracji'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-800">
                      <th className="px-6 py-4 text-left text-sm font-medium text-neutral-400">
                        Uczestnik
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-neutral-400">
                        Email
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-neutral-400">
                        Data rejestracji
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-neutral-400">
                        Status
                      </th>
                      <th className="px-6 py-4 text-center text-sm font-medium text-neutral-400">
                        Obecność
                      </th>
                      <th className="px-6 py-4 text-right text-sm font-medium text-neutral-400">
                        Akcje
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    {registrations.map((registration) => (
                      <tr
                        key={registration.id}
                        className="hover:bg-neutral-800/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-neutral-700 flex-shrink-0">
                              {registration.user.profile_image ? (
                                <Image
                                  src={registration.user.profile_image}
                                  alt={getUserDisplayName(registration.user)}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-white font-medium">
                                  {getUserDisplayName(registration.user)
                                    .charAt(0)
                                    .toUpperCase()}
                                </div>
                              )}
                            </div>
                            <span className="text-white font-medium">
                              {getUserDisplayName(registration.user)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-neutral-300">
                          <a 
                            href={`mailto:${registration.user.email}`}
                            className="hover:text-amber-400 transition-colors"
                          >
                            {registration.user.email}
                          </a>
                        </td>
                        <td className="px-6 py-4 text-neutral-300">
                          {format(parseISO(registration.registration_date), 'd MMMM yyyy', { locale: pl })}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(registration.status)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={registration.attended}
                            onChange={(e) =>
                              handleAttendanceUpdate(registration.id, e.target.checked)
                            }
                            disabled={actionLoading === registration.id}
                            className="w-5 h-5 rounded border-neutral-600 bg-neutral-800 text-amber-500 focus:ring-amber-500 focus:ring-offset-neutral-900 cursor-pointer disabled:opacity-50"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {registration.status === 'pending' && (
                              <button
                                onClick={() => handleStatusUpdate(registration.id, 'confirmed')}
                                disabled={actionLoading === registration.id}
                                className="px-3 py-1.5 text-sm bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors disabled:opacity-50"
                              >
                                Potwierdź
                              </button>
                            )}
                            {registration.status !== 'cancelled' && (
                              <button
                                onClick={() => handleStatusUpdate(registration.id, 'cancelled')}
                                disabled={actionLoading === registration.id}
                                className="px-3 py-1.5 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors disabled:opacity-50"
                              >
                                Anuluj
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(registration.id)}
                              disabled={actionLoading === registration.id}
                              className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                              title="Usuń rejestrację"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="lg:hidden divide-y divide-neutral-800">
                {registrations.map((registration) => (
                  <div key={registration.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-full overflow-hidden bg-neutral-700 flex-shrink-0">
                          {registration.user.profile_image ? (
                            <Image
                              src={registration.user.profile_image}
                              alt={getUserDisplayName(registration.user)}
                              fill
                              className="object-cover"
                            />
                          ) : (
                              <div className="w-full h-full flex items-center justify-center text-white font-medium text-lg">
                              {getUserDisplayName(registration.user)
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-white font-medium">
                            {getUserDisplayName(registration.user)}
                          </p>
                          <p className="text-sm text-neutral-400">
                            {registration.user.email}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(registration.status)}
                    </div>

                    <div className="flex items-center justify-between text-sm mb-4">
                      <span className="text-neutral-400">
                        {format(parseISO(registration.registration_date), 'd MMMM yyyy', { locale: pl })}
                      </span>
                      <label className="flex items-center gap-2 text-neutral-300">
                        <input
                          type="checkbox"
                          checked={registration.attended}
                          onChange={(e) =>
                            handleAttendanceUpdate(registration.id, e.target.checked)
                          }
                          disabled={actionLoading === registration.id}
                          className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-amber-500 focus:ring-amber-500 focus:ring-offset-neutral-900 cursor-pointer disabled:opacity-50"
                        />
                        Obecność
                      </label>
                    </div>

                    <div className="flex gap-2">
                      {registration.status === 'pending' && (
                        <button
                          onClick={() => handleStatusUpdate(registration.id, 'confirmed')}
                          disabled={actionLoading === registration.id}
                          className="flex-1 px-3 py-2 text-sm bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors disabled:opacity-50"
                        >
                          Potwierdź
                        </button>
                      )}
                      {registration.status !== 'cancelled' && (
                        <button
                          onClick={() => handleStatusUpdate(registration.id, 'cancelled')}
                          disabled={actionLoading === registration.id}
                          className="flex-1 px-3 py-2 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors disabled:opacity-50"
                        >
                          Anuluj
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(registration.id)}
                        disabled={actionLoading === registration.id}
                        className="px-3 py-2 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                        title="Usuń rejestrację"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="border-t border-neutral-800 px-6 py-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-neutral-400">
                      Pokazano {(currentPage - 1) * pageSize + 1} -{' '}
                      {Math.min(currentPage * pageSize, totalCount)} z {totalCount}{' '}
                      rejestracji
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum: number;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }

                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                                currentPage === pageNum
                                  ? 'bg-amber-500 text-black'
                                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={currentPage === totalPages}
                        className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal wysyłania wiadomości */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 rounded-xl max-w-lg w-full border border-neutral-700 shadow-2xl">
            <div className="p-6 border-b border-neutral-700">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Mail className="w-5 h-5 text-amber-500" />
                Wyślij wiadomość do uczestników
              </h3>
              <p className="text-neutral-400 text-sm mt-1">
                Wiadomość zostanie wysłana do {stats.total} uczestników
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Temat wiadomości
                </label>
                <input
                  type="text"
                  value={messageSubject}
                  onChange={(e) => setMessageSubject(e.target.value)}
                  placeholder="np. Ważna informacja dotycząca wydarzenia"
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-600 rounded-lg text-white placeholder-neutral-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                />
                <p className="text-neutral-500 text-xs mt-1">Minimum 5 znaków</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-neutral-300 mb-2">
                  Treść wiadomości
                </label>
                <textarea
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="Napisz wiadomość do wszystkich uczestników..."
                  rows={6}
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-600 rounded-lg text-white placeholder-neutral-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none resize-none"
                />
                <p className="text-neutral-500 text-xs mt-1">Minimum 20 znaków</p>
              </div>
            </div>
            
            <div className="p-6 border-t border-neutral-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowMessageModal(false);
                  setMessageSubject('');
                  setMessageBody('');
                }}
                className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={handleSendMessage}
                disabled={sendMessageMutation.isPending}
                className="inline-flex items-center gap-2 px-6 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendMessageMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Wysyłanie...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Wyślij wiadomość
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
