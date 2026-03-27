'use client';

import Link from 'next/link';
import { ClipboardList, AlertTriangle, Ticket } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import React, { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useHydration } from '@/stores/authStore';
import { apiClient } from '@/lib/api/client';

interface Props {
  params: Promise<{ eventId: string }>;
}

interface TicketOrder {
  order_number: string;
  status: string;
  total: string | number;
  subtotal: string | number;
  service_fee: string | number;
  platform_fee: string | number;
  organizer_payout: string | number;
  created_at: string;
  tickets: Array<{
    id: number;
    ticket_code: string;
    status: string;
    ticket_type: {
      id: number;
      name: string;
      price: number;
    };
  }>;
}

interface OrdersResponse {
  orders: TicketOrder[];
  total: number;
}

const formatCurrency = (value: string | number) => {
  const numberValue = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(numberValue)) return '-';
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    minimumFractionDigits: 2,
  }).format(numberValue);
};

const formatDateTime = (value: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pl-PL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const statusLabel: Record<string, string> = {
  pending: 'Oczekujące',
  paid: 'Opłacone',
  failed: 'Nieudane',
  refunded: 'Zwrócone',
  partial_refund: 'Częściowy zwrot',
};

const statusClass: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
  refunded: 'bg-slate-100 text-slate-700',
  partial_refund: 'bg-blue-100 text-blue-700',
};

export default function OrganizerOrdersPage({ params }: Props) {
  const { eventId } = React.use(params);
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const hydrated = useHydration();

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.push('/logowanie?redirect=/moje-wydarzenia');
    }
  }, [hydrated, isAuthenticated, router]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['organizer-orders', eventId],
    queryFn: async () => {
      const response = await apiClient.get(`/tickets/organizer/event/${eventId}/orders/`);
      return response.data as OrdersResponse;
    },
    enabled: isAuthenticated && !!eventId,
  });

  const orders = data?.orders || [];
  const totalOrders = data?.total || 0;
  const totalRevenue = useMemo(() => {
    return orders.reduce((sum, order) => {
      const val = typeof order.total === 'string' ? Number(order.total) : order.total;
      return sum + (Number.isNaN(val) ? 0 : val);
    }, 0);
  }, [orders]);

  if (!hydrated || !isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <ClipboardList className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-900">Zamówienia biletów</h1>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="text-sm text-gray-600">
              Wydarzenie ID: <strong>{eventId}</strong>
            </div>
            <Link
              href={`/bilety/organizator/zarzadzaj/${eventId}`}
              className="text-indigo-600 hover:underline"
            >
              ← Wróć do zarządzania biletami
            </Link>
          </div>

          {isLoading && (
            <div className="text-gray-600">Ładowanie zamówień...</div>
          )}

          {isError && (
            <div className="flex items-start gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Nie udało się pobrać zamówień.
            </div>
          )}

          {!isLoading && !isError && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="text-sm text-gray-500">Łączna liczba zamówień</div>
                  <div className="text-2xl font-semibold text-gray-900">{totalOrders}</div>
                </div>
                <div className="rounded-lg border border-gray-200 p-4">
                  <div className="text-sm text-gray-500">Łączna sprzedaż</div>
                  <div className="text-2xl font-semibold text-gray-900">{formatCurrency(totalRevenue)}</div>
                </div>
              </div>

              {orders.length === 0 ? (
                <div className="text-gray-600">Brak zamówień dla tego wydarzenia.</div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.order_number} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                          <div className="text-sm text-gray-500">Numer zamówienia</div>
                          <div className="font-semibold text-gray-900">{order.order_number}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              statusClass[order.status] || 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {statusLabel[order.status] || order.status}
                          </span>
                          <span className="text-sm text-gray-500">{formatDateTime(order.created_at)}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                        <div>
                          <div className="text-xs text-gray-500">Suma</div>
                          <div className="font-medium text-gray-900">{formatCurrency(order.total)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Opłata serwisowa</div>
                          <div className="font-medium text-gray-900">{formatCurrency(order.service_fee)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Wypłata organizatora</div>
                          <div className="font-medium text-gray-900">{formatCurrency(order.organizer_payout)}</div>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                          <Ticket className="w-4 h-4" />
                          Bilety ({order.tickets.length})
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {order.tickets.map((ticket) => (
                            <div key={ticket.id} className="flex items-center justify-between rounded-md border border-gray-100 p-2">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{ticket.ticket_type.name}</div>
                                <div className="text-xs text-gray-500">{ticket.ticket_code}</div>
                              </div>
                              <div className="text-sm text-gray-700">{formatCurrency(ticket.ticket_type.price)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
