'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import { ArrowLeft, ExternalLink, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function AdminPendingRequestsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { notifications, isLoading, refetch } = useAdminNotifications();
  const [selectedRequest, setSelectedRequest] = useState<number | null>(null);

  // Redirect if not admin
  useEffect(() => {
    if (isAuthenticated && !user?.is_staff) {
      router.push('/');
    }
  }, [isAuthenticated, user?.is_staff, router]);

  if (!isAuthenticated || !user?.is_staff) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              title="Powrót"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Wnioski o rolę organizatora
              </h1>
              <p className="text-slate-600 mt-1">
                Zarządzaj wnioskami użytkowników
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-orange-600" />
                <div>
                  <p className="text-sm text-orange-600 font-medium">Oczekujące</p>
                  <p className="text-2xl font-bold text-orange-900">
                    {notifications.pending_count}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <ExternalLink className="w-6 h-6 text-blue-600" />
                <div>
                  <p className="text-sm text-blue-600 font-medium">W podglądzie</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {notifications.pending_requests.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4">
              <button
                onClick={() => refetch()}
                disabled={isLoading}
                className="w-full text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full border-2 border-slate-600 flex items-center justify-center">
                    <div className="w-2 h-2 bg-slate-600 rounded-full"></div>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 font-medium">
                      {isLoading ? 'Odświeżanie...' : 'Odśwież dane'}
                    </p>
                    <p className="text-2xl font-bold text-slate-900">
                      {isLoading ? '...' : 'OK'}
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {notifications.pending_requests.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Brak wniosków do sprawdzenia
            </h3>
            <p className="text-slate-600">
              Wszystkie wnioski zostały rozpatrzone. Świetna robota! 🎉
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.pending_requests.map((request) => (
              <div
                key={request.id}
                className="bg-white rounded-lg border border-slate-200 hover:border-orange-300 transition-colors p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {request.organization_name}
                    </h3>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-slate-600">
                        <strong>Użytkownik:</strong> {request.user.username} (
                        {request.user.email})
                      </p>
                      <p className="text-sm text-slate-600">
                        <strong>Data złożenia:</strong>{' '}
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

                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-sm font-medium">
                      <Clock className="w-4 h-4" />
                      Oczekujący
                    </span>

                    <a
                      href={`/admin/wnioski-organizatorow/${request.id}`}
                      className="btn-primary text-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Rozpatrz</span>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="bg-blue-50 border-t border-blue-200 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-sm text-blue-900">
            💡 <strong>Wskazówka:</strong> Kliknij przycisk "Rozpatrz", aby przejść do
            szczegółów wniosku w panelu administratora, gdzie możesz zatwierdzić lub
            odrzucić wniosek.
          </p>
        </div>
      </div>

      <style jsx>{`
        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: linear-gradient(90deg, #0066cc 0%, #0052a3 100%);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.3s ease;
          text-decoration: none;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 102, 204, 0.3);
        }

        .btn-primary:active {
          transform: translateY(0);
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
