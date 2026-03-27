'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api/client';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  MapPin,
  Globe,
  Briefcase,
} from 'lucide-react';

interface RequestDetail {
  id: number;
  user: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    date_joined?: string;
  };
  organization_name: string;
  organization_id: string;
  official_website: string;
  description: string;
  motivation: string;
  document?: string;
  document_url?: string;
  organization_logo?: string;
  logo_url?: string;
  status: string;
  status_display?: string;
  created_at: string;
  updated_at: string;
  admin_notes: string;
  reviewed_by?: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  reviewed_at?: string;
  slug?: string;
  public_email?: string;
  public_phone?: string;
  facebook_url?: string;
  instagram_url?: string;
  youtube_url?: string;
  twitter_url?: string;
  is_verified?: boolean;
  is_public?: boolean;
}

export default function AdminRequestDetailPage(props: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

  // Redirect if not admin
  useEffect(() => {
    if (isAuthenticated && !user?.is_staff) {
      router.push('/');
    }
  }, [isAuthenticated, user?.is_staff, router]);

  // Unwrap params Promise
  useEffect(() => {
    props.params.then((p) => setRequestId(p.id));
  }, [props.params]);

  // Fetch request details
  useEffect(() => {
    const fetchDetails = async () => {
      if (!isAuthenticated || !user?.is_staff || !requestId) return;

      try {
        setIsLoading(true);
        setError(null);
        const response = await apiClient.get<RequestDetail>(
          `/auth/admin/organizer-requests/${requestId}/`
        );
        setRequest(response.data);
        setAdminNotes(response.data.admin_notes || '');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Nie udało się załadować danych';
        setError(message);
        console.error('Error fetching request:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [isAuthenticated, user?.is_staff, requestId]);

  const handleApprove = async () => {
    if (!request) return;

    try {
      setIsSubmitting(true);
      setError(null);
      setSuccess(null);

      await apiClient.post(`/auth/admin/organizer-requests/${request.id}/approve/`, {
        admin_notes: adminNotes,
      });

      setSuccess('Wniosek zatwierdzony! Użytkownik otrzyma potwierdzenie e-mailem.');
      setTimeout(() => router.back(), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Błąd podczas zatwierdzania';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!request || !confirm('Czy jesteś pewny, że chcesz odrzucić ten wniosek?'))
      return;

    try {
      setIsSubmitting(true);
      setError(null);
      setSuccess(null);

      await apiClient.post(`/auth/admin/organizer-requests/${request.id}/reject/`, {
        admin_notes: adminNotes,
      });

      setSuccess('Wniosek odrzucony. Użytkownik otrzyma powiadomienie e-mailowe.');
      setTimeout(() => router.back(), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Błąd podczas odrzucania';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAuthenticated || !user?.is_staff) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Wróć
          </button>
          <h1 className="text-3xl font-bold text-slate-900">
            Szczegóły wniosku organizatora
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <div className="inline-block animate-spin">
              <Clock className="w-8 h-8 text-slate-400" />
            </div>
            <p className="mt-4 text-slate-600">Ładowanie danych...</p>
          </div>
        ) : !request ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900">Wniosek nie znaleziony</h3>
            <p className="text-slate-600 mt-2">
              Nie można znaleźć wniosku o podanym ID.
            </p>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <p className="text-green-800">{success}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Status badge */}
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-slate-900">
                      {request.organization_name}
                    </h2>
                    <span
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm ${
                        request.status === 'pending'
                          ? 'bg-amber-50 text-amber-700'
                          : request.status === 'approved'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {request.status === 'pending' && (
                        <>
                          <Clock className="w-4 h-4" />
                          Oczekujący
                        </>
                      )}
                      {request.status === 'approved' && (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Zatwierdzony
                        </>
                      )}
                      {request.status === 'rejected' && (
                        <>
                          <XCircle className="w-4 h-4" />
                          Odrzucony
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* User info */}
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    Informacje o użytkowniku
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-600 w-24">
                        Imię:
                      </span>
                      <span className="text-slate-900">
                        {request.user.first_name} {request.user.last_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-900">{request.user.email}</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-sm font-medium text-slate-600 w-24">
                        Użytkownik:
                      </span>
                      <span className="text-slate-900">@{request.user.username}</span>
                    </div>
                  </div>
                </div>

                {/* Organization details */}
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    Dane organizacji
                  </h3>
                  <div className="space-y-4">
                    {request.organization_id && (
                      <div>
                        <label className="text-sm font-medium text-slate-600">
                          ID organizacji:
                        </label>
                        <p className="text-slate-900 mt-1">{request.organization_id}</p>
                      </div>
                    )}

                    {request.public_phone && (
                      <div>
                        <label className="text-sm font-medium text-slate-600">
                          Telefon:
                        </label>
                        <p className="text-slate-900 mt-1">{request.public_phone}</p>
                      </div>
                    )}

                    {request.official_website && (
                      <div>
                        <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
                          <Globe className="w-4 h-4" />
                          Strona www:
                        </label>
                        <a
                          href={request.official_website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline mt-1"
                        >
                          {request.official_website}
                        </a>
                      </div>
                    )}

                    {request.description && (
                      <div>
                        <label className="text-sm font-medium text-slate-600 flex items-center gap-2">
                          <Briefcase className="w-4 h-4" />
                          Opis organizacji:
                        </label>
                        <p className="text-slate-700 mt-2 whitespace-pre-wrap">
                          {request.description}
                        </p>
                      </div>
                    )}

                    {request.motivation && (
                      <div>
                        <label className="text-sm font-medium text-slate-600">
                          Motywacja:
                        </label>
                        <p className="text-slate-700 mt-2 whitespace-pre-wrap">
                          {request.motivation}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Admin notes */}
                {request.status === 'pending' && (
                  <div className="bg-white rounded-lg border border-slate-200 p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">
                      Notatki administatora
                    </h3>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Dodaj komentarz lub uzasadnienie decyzji..."
                      className="w-full border border-slate-300 rounded-lg p-3 text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={4}
                    />
                  </div>
                )}

                {request.admin_notes && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h3 className="text-sm font-semibold text-blue-900 mb-2">
                      Notatki z rozpatrzenia:
                    </h3>
                    <p className="text-blue-800 whitespace-pre-wrap">
                      {request.admin_notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
                {/* Timeline */}
                <div className="bg-white rounded-lg border border-slate-200 p-6">
                  <h3 className="text-sm font-semibold text-slate-900 mb-4">
                    Historia
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-slate-500 uppercase font-semibold">
                        Data złożenia
                      </p>
                      <p className="text-slate-900 mt-1">
                        {new Date(request.created_at).toLocaleDateString('pl-PL', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                {request.status === 'pending' && (
                  <div className="bg-white rounded-lg border border-slate-200 p-6">
                    <h3 className="text-sm font-semibold text-slate-900 mb-4">
                      Akcje
                    </h3>
                    <div className="space-y-3">
                      <button
                        onClick={handleApprove}
                        disabled={isSubmitting}
                        className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Zatwierdź wniosek
                      </button>
                      <button
                        onClick={handleReject}
                        disabled={isSubmitting}
                        className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Odrzuć wniosek
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
