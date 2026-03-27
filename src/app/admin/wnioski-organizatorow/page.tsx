'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { 
  ArrowLeft,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Building2,
  Mail,
  Phone,
  Globe,
  FileText,
  ExternalLink,
  Filter
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { adminApi, OrganizerRequest } from '@/lib/api/admin';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

export default function OrganizerRequestsPage() {
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [selectedRequest, setSelectedRequest] = useState<OrganizerRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  const { data: requests, isLoading } = useQuery({
    queryKey: ['organizer-requests', statusFilter],
    queryFn: () => adminApi.getOrganizerRequests(statusFilter === 'all' ? undefined : statusFilter),
    enabled: isAuthenticated && user?.is_staff && !authLoading,
  });

  const { data: stats } = useQuery({
    queryKey: ['organizer-request-stats'],
    queryFn: () => adminApi.getOrganizerRequestStats(),
    enabled: isAuthenticated && user?.is_staff && !authLoading,
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => adminApi.approveOrganizerRequest(id),
    onSuccess: () => {
      toast.success('Wniosek został zatwierdzony');
      queryClient.invalidateQueries({ queryKey: ['organizer-requests'] });
      queryClient.invalidateQueries({ queryKey: ['organizer-request-stats'] });
      setSelectedRequest(null);
    },
    onError: () => {
      toast.error('Nie udało się zatwierdzić wniosku');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => 
      adminApi.rejectOrganizerRequest(id, reason),
    onSuccess: () => {
      toast.success('Wniosek został odrzucony');
      queryClient.invalidateQueries({ queryKey: ['organizer-requests'] });
      queryClient.invalidateQueries({ queryKey: ['organizer-request-stats'] });
      setSelectedRequest(null);
      setShowRejectModal(false);
      setRejectReason('');
    },
    onError: () => {
      toast.error('Nie udało się odrzucić wniosku');
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Oczekujący</span>;
      case 'approved':
        return <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Zatwierdzony</span>;
      case 'rejected':
        return <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">Odrzucony</span>;
      default:
        return null;
    }
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
              <h1 className="text-3xl font-bold text-gray-900">Wnioski organizatorów</h1>
              <p className="text-gray-600 mt-1">Zarządzaj wnioskami o rolę organizatora</p>
            </div>
            <div className="flex gap-4">
              <div className="bg-white rounded-lg shadow-sm border px-4 py-2">
                <span className="text-sm text-gray-500">Oczekujące: </span>
                <span className="font-semibold text-yellow-600">{stats?.pending || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Status:</span>
            <div className="flex gap-2">
              {[
                { value: 'all', label: 'Wszystkie' },
                { value: 'pending', label: 'Oczekujące' },
                { value: 'approved', label: 'Zatwierdzone' },
                { value: 'rejected', label: 'Odrzucone' },
              ].map((option) => (
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
              ) : requests?.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Brak wniosków do wyświetlenia</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {requests?.map((request) => (
                    <div
                      key={request.id}
                      onClick={() => setSelectedRequest(request)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedRequest?.id === request.id ? 'bg-indigo-50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                          {request.logo_url ? (
                            <Image
                              src={request.logo_url}
                              alt={request.organization_name}
                              width={48}
                              height={48}
                              className="object-cover"
                            />
                          ) : (
                            <Building2 className="h-6 w-6 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {request.organization_name}
                            </h3>
                            {getStatusBadge(request.status)}
                          </div>
                          <p className="text-sm text-gray-600">
                            {request.user.username} ({request.user.email})
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {format(new Date(request.created_at), 'd MMM yyyy, HH:mm', { locale: pl })}
                          </p>
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
            {selectedRequest ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-4">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                    {selectedRequest.logo_url ? (
                      <Image
                        src={selectedRequest.logo_url}
                        alt={selectedRequest.organization_name}
                        width={64}
                        height={64}
                        className="object-cover"
                      />
                    ) : (
                      <Building2 className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{selectedRequest.organization_name}</h3>
                    {getStatusBadge(selectedRequest.status)}
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Użytkownik</p>
                    <p className="text-gray-900">{selectedRequest.user.username}</p>
                    <p className="text-sm text-gray-600">{selectedRequest.user.email}</p>
                  </div>

                  {selectedRequest.organization_id && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">NIP/KRS/REGON</p>
                      <p className="text-gray-900">{selectedRequest.organization_id}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Opis działalności</p>
                    <p className="text-gray-900 text-sm">{selectedRequest.description}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Motywacja</p>
                    <p className="text-gray-900 text-sm">{selectedRequest.motivation}</p>
                  </div>

                  {selectedRequest.official_website && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Strona internetowa</p>
                      <a 
                        href={selectedRequest.official_website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline flex items-center gap-1 text-sm"
                      >
                        <Globe className="h-4 w-4" />
                        {selectedRequest.official_website}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}

                  {selectedRequest.document_url && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Dokument</p>
                      <a 
                        href={selectedRequest.document_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline flex items-center gap-1 text-sm"
                      >
                        <FileText className="h-4 w-4" />
                        Pobierz dokument
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}

                  {selectedRequest.admin_notes && (
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Notatki administratora</p>
                      <p className="text-gray-900 text-sm bg-gray-50 p-2 rounded">{selectedRequest.admin_notes}</p>
                    </div>
                  )}
                </div>

                {selectedRequest.status === 'pending' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => approveMutation.mutate(selectedRequest.id)}
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

                {selectedRequest.reviewed_by && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      Rozpatrzone przez: {selectedRequest.reviewed_by.username}
                      <br />
                      {selectedRequest.reviewed_at && format(new Date(selectedRequest.reviewed_at), 'd MMM yyyy, HH:mm', { locale: pl })}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Wybierz wniosek, aby zobaczyć szczegóły</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Odrzuć wniosek</h3>
            <p className="text-sm text-gray-600 mb-4">
              Podaj powód odrzucenia wniosku dla organizacji &quot;{selectedRequest.organization_name}&quot;:
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
                  if (rejectReason.trim()) {
                    rejectMutation.mutate({ id: selectedRequest.id, reason: rejectReason });
                  } else {
                    toast.error('Podaj powód odrzucenia');
                  }
                }}
                disabled={rejectMutation.isPending || !rejectReason.trim()}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                Odrzuć wniosek
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
