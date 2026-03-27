'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, isPast, isFuture } from 'date-fns';
import { pl } from 'date-fns/locale';
import QRCode from 'qrcode';
import toast from 'react-hot-toast';
import {
  Ticket,
  Calendar,
  MapPin,
  QrCode,
  Clock,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore, useHydration } from '@/stores/authStore';
import { apiClient } from '@/lib/api/client';

interface UserTicket {
  id: number;
  ticket_code: string;
  order_number: string;
  order_status?: 'pending' | 'processing' | 'paid' | 'cancelled' | 'refunded' | 'partially_refunded' | 'failed';
  status: 'valid' | 'used' | 'cancelled' | 'refunded';
  purchase_date: string;
  quantity?: number;
  ticket_type: {
    id: number;
    name: string;
    price: number;
  };
  event: {
    id: number;
    title: string;
    slug: string;
    start_date: string;
    location: {
      name: string;
      city: string;
    } | null;
    image_url: string | null;
  };
}

interface PendingOrderTicket {
  id: number;
  ticket_code: string;
  status: 'pending' | 'valid' | 'used' | 'cancelled' | 'refunded';
  ticket_type: {
    id: number;
    name: string;
    price: number;
  };
}

interface PendingOrder {
  order_number: string;
  status: 'pending' | 'processing' | 'paid' | 'cancelled' | 'refunded' | 'partially_refunded' | 'failed';
  total: string | number;
  created_at: string;
  event: {
    id: number;
    title: string;
    slug: string;
    start_date: string;
    location: {
      name: string;
      city: string;
    } | null;
    image_url: string | null;
  };
  tickets: PendingOrderTicket[];
}

type TabType = 'upcoming' | 'past' | 'all';
type PendingTabType = 'pending';
type FullTabType = TabType | PendingTabType;

const TICKETS_PER_PAGE = 6;

export default function MyTicketsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const hydrated = useHydration();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<FullTabType>('upcoming');
  const [selectedTicket, setSelectedTicket] = useState<UserTicket | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [refundTicket, setRefundTicket] = useState<UserTicket | null>(null);
  const [refundReason, setRefundReason] = useState('customer_request');
  const [refundNotes, setRefundNotes] = useState('');
  const [refundMessage, setRefundMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isRefunding, setIsRefunding] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.push('/logowanie?redirect=/moje-bilety');
    }
  }, [hydrated, isAuthenticated, router]);

  // Reset page when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  // Fetch user tickets
  const { data: tickets, isLoading } = useQuery({
    queryKey: ['my-tickets'],
    queryFn: async () => {
      const response = await apiClient.get('/tickets/my/');
      return response.data as UserTicket[];
    },
    enabled: isAuthenticated,
  });

  // Fetch pending orders
  const { data: pendingOrders, isLoading: isPendingLoading } = useQuery({
    queryKey: ['my-pending-orders'],
    queryFn: async () => {
      const response = await apiClient.get('/tickets/my/pending-orders/');
      return response.data as PendingOrder[];
    },
    enabled: isAuthenticated,
    // Automatyczne sprawdzanie co 3 sekundy gdy są zamówienia pending
    refetchInterval: (query) => {
      const orders = query.state.data;
      if (orders && orders.some((order) => order.status === 'pending')) {
        return 3000; // Sprawdzaj co 3 sekundy
      }
      return false;
    },
  });

  // Generate QR code when ticket is selected
  useEffect(() => {
    if (!selectedTicket) {
      setQrDataUrl(null);
      return;
    }
    QRCode.toDataURL(selectedTicket.ticket_code, {
      width: 280,
      margin: 2,
      color: {
        dark: '#1f2937',
        light: '#ffffff',
      },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [selectedTicket]);

  // Download ticket as image
  const handleDownloadTicket = useCallback(async (ticket: UserTicket) => {
    try {
      const qrUrl = await QRCode.toDataURL(ticket.ticket_code, {
        width: 400,
        margin: 2,
      });

      // Create canvas for ticket
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 600;
      canvas.height = 800;

      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#1f2937');
      gradient.addColorStop(1, '#111827');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Amber accent line
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(0, 0, canvas.width, 6);

      // Title
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 28px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BILET', canvas.width / 2, 60);

      // Event title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px system-ui, sans-serif';
      const eventTitle = ticket.event.title.length > 35
        ? ticket.event.title.substring(0, 35) + '...'
        : ticket.event.title;
      ctx.fillText(eventTitle, canvas.width / 2, 110);

      // Date and time
      ctx.fillStyle = '#d1d5db';
      ctx.font = '18px system-ui, sans-serif';
      const eventDate = parseISO(ticket.event.start_date);
      ctx.fillText(
        format(eventDate, 'd MMMM yyyy, HH:mm', { locale: pl }),
        canvas.width / 2,
        150
      );

      // Location
      if (ticket.event.location) {
        ctx.fillText(
          `${ticket.event.location.name}, ${ticket.event.location.city}`,
          canvas.width / 2,
          180
        );
      }

      // QR Code
      const qrImage = new Image();
      qrImage.onload = () => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(150, 220, 300, 300);
        ctx.drawImage(qrImage, 160, 230, 280, 280);

        // Ticket code
        ctx.fillStyle = '#9ca3af';
        ctx.font = '14px system-ui, sans-serif';
        ctx.fillText('Kod biletu:', canvas.width / 2, 560);
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 20px monospace';
        ctx.fillText(ticket.ticket_code, canvas.width / 2, 590);

        // Ticket type
        ctx.fillStyle = '#d1d5db';
        ctx.font = '16px system-ui, sans-serif';
        ctx.fillText(`Typ: ${ticket.ticket_type.name}`, canvas.width / 2, 640);

        // Quantity if available
        if (ticket.quantity && ticket.quantity > 1) {
          ctx.fillText(`Ilość: ${ticket.quantity}`, canvas.width / 2, 670);
        }

        // Footer
        ctx.fillStyle = '#6b7280';
        ctx.font = '12px system-ui, sans-serif';
        ctx.fillText('Pokaż ten kod przy wejściu na wydarzenie', canvas.width / 2, 750);

        // Download
        const link = document.createElement('a');
        link.download = `bilet-${ticket.ticket_code}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      };
      qrImage.src = qrUrl;
    } catch (error) {
      console.error('Error downloading ticket:', error);
      toast.error('Nie udało się pobrać biletu. Spróbuj ponownie.');
    }
  }, []);

  const allTickets = tickets || [];
  const allPendingOrders = pendingOrders || [];

  const filteredTickets = allTickets.filter((ticket) => {
    const eventDate = parseISO(ticket.event.start_date);

    switch (activeTab) {
      case 'pending':
        return false;
      case 'upcoming':
        return isFuture(eventDate) && ticket.status === 'valid';
      case 'past':
        return isPast(eventDate) || ticket.status !== 'valid';
      default:
        return true;
    }
  });

  // Pagination
  const totalPages = Math.ceil(filteredTickets.length / TICKETS_PER_PAGE);
  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * TICKETS_PER_PAGE,
    currentPage * TICKETS_PER_PAGE
  );

  const counts = useMemo(() => {
    const upcoming = allTickets.filter(
      (t) => isFuture(parseISO(t.event.start_date)) && t.status === 'valid'
    ).length;
    const past = allTickets.filter(
      (t) => isPast(parseISO(t.event.start_date)) || t.status !== 'valid'
    ).length;
    return { upcoming, past, all: allTickets.length, pending: allPendingOrders.length };
  }, [allPendingOrders.length, allTickets]);

  const getOrderStatusConfig = (status: PendingOrder['status']) => {
    switch (status) {
      case 'pending':
        return { text: 'Oczekuje na płatność', className: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' };
      case 'processing':
        return { text: 'Przetwarzanie', className: 'bg-blue-500/20 text-blue-300 border border-blue-500/30' };
      case 'failed':
        return { text: 'Nieudane', className: 'bg-red-500/20 text-red-300 border border-red-500/30' };
      case 'cancelled':
        return { text: 'Anulowane', className: 'bg-gray-500/20 text-gray-400 border border-gray-500/30' };
      default:
        return { text: status, className: 'bg-gray-500/20 text-gray-400 border border-gray-500/30' };
    }
  };

  const getStatusConfig = (status: UserTicket['status']) => {
    switch (status) {
      case 'valid':
        return {
          text: 'Aktywny',
          className: 'bg-green-500/20 text-green-400 border border-green-500/30',
          icon: CheckCircle,
        };
      case 'used':
        return {
          text: 'Wykorzystany',
          className: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
          icon: CheckCircle,
        };
      case 'cancelled':
        return {
          text: 'Anulowany',
          className: 'bg-red-500/20 text-red-400 border border-red-500/30',
          icon: XCircle,
        };
      case 'refunded':
        return {
          text: 'Zwrócony',
          className: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
          icon: AlertCircle,
        };
      default:
        return {
          text: 'Nieznany',
          className: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
          icon: AlertCircle,
        };
    }
  };

  if (!hydrated || !isAuthenticated) {
    return null;
  }

  const getRefundBlockedReason = (ticket: UserTicket) => {
    if (!ticket.order_number) return 'Brak numeru zamówienia.';
    if (ticket.order_status && ticket.order_status !== 'paid') {
      return 'Zamówienie nie jest opłacone.';
    }
    if (ticket.status !== 'valid') return 'Zwrot jest dostępny tylko dla aktywnych biletów.';
    const eventDate = parseISO(ticket.event.start_date);
    if (!isFuture(eventDate)) return 'Wydarzenie już się odbyło.';
    const hoursUntilEvent = (eventDate.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilEvent <= 24) {
      return 'Zwrot możliwy najpóźniej 24 godziny przed wydarzeniem.';
    }
    return null;
  };

  const openRefundModal = (ticket: UserTicket) => {
    setRefundTicket(ticket);
    setRefundReason('customer_request');
    setRefundNotes('');
    setRefundMessage(null);
  };

  const handleRefundRequest = async () => {
    if (!refundTicket?.order_number) {
      setRefundMessage({ type: 'error', text: 'Brak numeru zamówienia.' });
      return;
    }

    setIsRefunding(true);
    setRefundMessage(null);
    try {
      const response = await apiClient.post(`/tickets/refund/${refundTicket.order_number}/`, {
        reason: refundReason,
        notes: refundNotes,
      });
      setRefundMessage({
        type: 'success',
        text: response.data?.message || 'Zwrot został zlecony.',
      });
      queryClient.invalidateQueries({ queryKey: ['my-tickets'] });
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Nie udało się zlecić zwrotu.';
      setRefundMessage({ type: 'error', text: message });
    } finally {
      setIsRefunding(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 py-8 md:py-12">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <Ticket className="w-6 h-6 text-amber-500" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white">Moje bilety</h1>
          </div>
          <p className="text-gray-400 ml-14">
            Zarządzaj swoimi biletami na wydarzenia
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 mb-6 overflow-hidden">
          <nav className="flex">
            {[
              { id: 'upcoming', label: 'Nadchodzące', count: counts.upcoming },
              { id: 'pending', label: 'Oczekujące', count: counts.pending },
              { id: 'past', label: 'Przeszłe', count: counts.past },
              { id: 'all', label: 'Wszystkie', count: counts.all },
            ].map((tab, index) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as FullTabType)}
                className={`
                  flex-1 px-4 md:px-6 py-4 text-sm md:text-base font-medium transition-all duration-200
                  ${index !== 0 ? 'border-l border-gray-700/50' : ''}
                  ${
                    activeTab === tab.id
                      ? 'bg-amber-500/20 text-amber-400 border-b-2 border-amber-500'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
                  }
                `}
              >
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.substring(0, 4)}.</span>
                <span
                  className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${
                    activeTab === tab.id
                      ? 'bg-amber-500/30 text-amber-300'
                      : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tickets List */}
        {activeTab === 'pending' ? (
          isPendingLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="bg-gray-800/50 rounded-2xl p-5 animate-pulse border border-gray-700/50"
                >
                  <div className="flex gap-4">
                    <div className="w-24 h-24 bg-gray-700 rounded-xl" />
                    <div className="flex-1">
                      <div className="h-5 bg-gray-700 rounded w-3/4 mb-3" />
                      <div className="h-4 bg-gray-700 rounded w-1/2 mb-2" />
                      <div className="h-4 bg-gray-700 rounded w-1/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : allPendingOrders.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {allPendingOrders.map((order) => {
                const statusConfig = getOrderStatusConfig(order.status);
                const ticketCounts = order.tickets.reduce<Record<string, number>>((acc, t) => {
                  acc[t.ticket_type.name] = (acc[t.ticket_type.name] || 0) + 1;
                  return acc;
                }, {});

                return (
                  <div
                    key={order.order_number}
                    className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 overflow-hidden"
                  >
                    <div className="p-5">
                      <div className="flex gap-4">
                        <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-700 flex-shrink-0 relative">
                          {order.event.image_url ? (
                            <img
                              src={order.event.image_url}
                              alt={order.event.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
                              <Ticket className="w-8 h-8 text-gray-500" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-semibold text-white line-clamp-2 leading-tight">
                              {order.event.title}
                            </h3>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              <Calendar className="w-4 h-4 text-amber-500/70" />
                              <span>
                                {format(parseISO(order.event.start_date), 'd MMMM yyyy, HH:mm', { locale: pl })}
                              </span>
                            </div>
                            {order.event.location && (
                              <div className="flex items-center gap-2 text-sm text-gray-400">
                                <MapPin className="w-4 h-4 text-amber-500/70" />
                                <span className="line-clamp-1">
                                  {order.event.location.name}, {order.event.location.city}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              <Ticket className="w-4 h-4 text-amber-500/70" />
                              <span>
                                {Object.entries(ticketCounts)
                                  .map(([name, count]) => `${name} × ${count}`)
                                  .join(', ')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-700/50 flex items-center justify-between gap-3">
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${statusConfig.className}`}>
                          <Clock className="w-3.5 h-3.5" />
                          {statusConfig.text}
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/bilety/zamowienie/${order.order_number}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700/50 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            Szczegóły
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-12 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-700/50 flex items-center justify-center">
                <Clock className="w-10 h-10 text-gray-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Brak oczekujących zamówień</h3>
              <p className="text-gray-400 max-w-md mx-auto">
                Nie masz aktualnie zamówień oczekujących na płatność.
              </p>
            </div>
          )
        ) : isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-gray-800/50 rounded-2xl p-5 animate-pulse border border-gray-700/50"
              >
                <div className="flex gap-4">
                  <div className="w-24 h-24 bg-gray-700 rounded-xl" />
                  <div className="flex-1">
                    <div className="h-5 bg-gray-700 rounded w-3/4 mb-3" />
                    <div className="h-4 bg-gray-700 rounded w-1/2 mb-2" />
                    <div className="h-4 bg-gray-700 rounded w-1/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : paginatedTickets.length > 0 ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {paginatedTickets.map((ticket) => {
                const eventDate = parseISO(ticket.event.start_date);
                const isUpcoming = isFuture(eventDate) && ticket.status === 'valid';
                const statusConfig = getStatusConfig(ticket.status);
                const StatusIcon = statusConfig.icon;
                const refundBlockedReason = getRefundBlockedReason(ticket);
                const canRefund = !refundBlockedReason;

                return (
                  <div
                    key={ticket.id}
                    className={`
                      bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 
                      overflow-hidden transition-all duration-300
                      ${isUpcoming ? 'hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10' : 'opacity-70'}
                    `}
                  >
                    <div className="p-5">
                      <div className="flex gap-4">
                        {/* Event Image */}
                        <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-700 flex-shrink-0 relative">
                          {ticket.event.image_url ? (
                            <img
                              src={ticket.event.image_url}
                              alt={ticket.event.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
                              <Ticket className="w-8 h-8 text-gray-500" />
                            </div>
                          )}
                          {isUpcoming && (
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                          )}
                        </div>

                        {/* Ticket Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-semibold text-white line-clamp-2 leading-tight">
                              {ticket.event.title}
                            </h3>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              <Calendar className="w-4 h-4 text-amber-500/70" />
                              <span>
                                {format(eventDate, 'd MMMM yyyy, HH:mm', { locale: pl })}
                              </span>
                            </div>
                            {ticket.event.location && (
                              <div className="flex items-center gap-2 text-sm text-gray-400">
                                <MapPin className="w-4 h-4 text-amber-500/70" />
                                <span className="line-clamp-1">
                                  {ticket.event.location.name}, {ticket.event.location.city}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              <Ticket className="w-4 h-4 text-amber-500/70" />
                              <span>
                                {ticket.ticket_type.name}
                                {ticket.quantity && ticket.quantity > 1 && (
                                  <span className="ml-1 text-amber-400">× {ticket.quantity}</span>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Status and Actions */}
                      <div className="mt-4 pt-4 border-t border-gray-700/50 flex items-center justify-between gap-3">
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${statusConfig.className}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {statusConfig.text}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTicket(ticket);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg text-sm font-medium transition-colors"
                          >
                            <QrCode className="w-4 h-4" />
                            <span className="hidden sm:inline">Kod QR</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadTicket(ticket);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700/50 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline">Pobierz bilet</span>
                          </button>
                          {ticket.status === 'valid' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openRefundModal(ticket);
                              }}
                              disabled={!canRefund}
                              title={refundBlockedReason || 'Zwróć bilet'}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                canRefund
                                  ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300'
                                  : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                              }`}
                            >
                              <RotateCcw className="w-4 h-4" />
                              <span className="hidden sm:inline">Zwróć bilet</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Ticket Perforation Effect */}
                    <div className="relative h-5 bg-gray-900/50">
                      <div className="absolute inset-x-0 top-0 h-px bg-gray-700/50 border-t border-dashed border-gray-600/50" />
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 bg-gray-900 rounded-full" />
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-5 h-5 bg-gray-900 rounded-full" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg bg-gray-800/50 border border-gray-700/50 text-gray-400 hover:text-white hover:bg-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`
                        w-10 h-10 rounded-lg font-medium transition-colors
                        ${
                          currentPage === page
                            ? 'bg-amber-500 text-gray-900'
                            : 'bg-gray-800/50 border border-gray-700/50 text-gray-400 hover:text-white hover:bg-gray-700/50'
                        }
                      `}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg bg-gray-800/50 border border-gray-700/50 text-gray-400 hover:text-white hover:bg-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
              <Ticket className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Brak biletów</h3>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              {activeTab === 'upcoming'
                ? 'Nie masz żadnych nadchodzących biletów. Przeglądaj wydarzenia i kup bilety na interesujące Cię wydarzenia.'
                : activeTab === 'past'
                ? 'Nie masz żadnych przeszłych biletów.'
                : 'Nie kupiłeś jeszcze żadnych biletów. Odkryj nadchodzące wydarzenia i dołącz do społeczności!'}
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-gray-900 font-semibold rounded-xl transition-colors"
            >
              <Eye className="w-5 h-5" />
              Przeglądaj wydarzenia
            </Link>
          </div>
        )}

        {/* QR Code Modal */}
        {selectedTicket && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedTicket(null)}
          >
            <div
              className="bg-gray-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Kod QR biletu</h2>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* QR Code Section */}
              <div className="p-6 bg-gradient-to-b from-amber-500/10 to-transparent flex flex-col items-center">
                <div className="bg-white p-4 rounded-2xl shadow-xl">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="QR Code" className="w-56 h-56" />
                  ) : (
                    <div className="w-56 h-56 flex flex-col items-center justify-center bg-gray-100 rounded-xl text-center px-4">
                      <QrCode className="w-16 h-16 text-gray-400 mb-3" />
                      <div className="text-xs text-gray-500">Generowanie kodu...</div>
                    </div>
                  )}
                </div>

                {/* Ticket Code */}
                <div className="mt-4 text-center">
                  <p className="text-gray-400 text-sm mb-1">Kod biletu</p>
                  <p className="text-amber-400 font-mono font-bold text-lg tracking-wider">
                    {selectedTicket.ticket_code}
                  </p>
                </div>

                <p className="text-gray-500 text-sm mt-4 text-center">
                  Pokaż ten kod przy wejściu na wydarzenie
                </p>
              </div>

              {/* Event Info */}
              <div className="p-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-white text-lg leading-tight">
                    {selectedTicket.event.title}
                  </h3>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-gray-300">
                    <div className="p-2 bg-amber-500/20 rounded-lg">
                      <Calendar className="w-4 h-4 text-amber-500" />
                    </div>
                    <span>
                      {format(parseISO(selectedTicket.event.start_date), 'd MMMM yyyy', {
                        locale: pl,
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-300">
                    <div className="p-2 bg-amber-500/20 rounded-lg">
                      <Clock className="w-4 h-4 text-amber-500" />
                    </div>
                    <span>
                      {format(parseISO(selectedTicket.event.start_date), 'HH:mm', { locale: pl })}
                    </span>
                  </div>
                  {selectedTicket.event.location && (
                    <div className="flex items-center gap-3 text-gray-300">
                      <div className="p-2 bg-amber-500/20 rounded-lg">
                        <MapPin className="w-4 h-4 text-amber-500" />
                      </div>
                      <span>
                        {selectedTicket.event.location.name}, {selectedTicket.event.location.city}
                      </span>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-700 pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Typ biletu</span>
                    <span className="text-white font-medium">{selectedTicket.ticket_type.name}</span>
                  </div>
                  {selectedTicket.quantity && selectedTicket.quantity > 1 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Ilość</span>
                      <span className="text-white font-medium">{selectedTicket.quantity}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Data zakupu</span>
                    <span className="text-white font-medium">
                      {format(parseISO(selectedTicket.purchase_date), 'd.MM.yyyy', { locale: pl })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Status</span>
                    <span className={`font-medium ${getStatusConfig(selectedTicket.status).className} px-2 py-0.5 rounded-full text-xs`}>
                      {getStatusConfig(selectedTicket.status).text}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => handleDownloadTicket(selectedTicket)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-gray-900 font-semibold rounded-xl transition-colors"
                  >
                    <Download className="w-5 h-5" />
                    Pobierz bilet
                  </button>
                  {selectedTicket.status === 'valid' && !getRefundBlockedReason(selectedTicket) && (
                    <button
                      onClick={() => openRefundModal(selectedTicket)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-200 font-semibold rounded-xl transition-colors"
                    >
                      <RotateCcw className="w-5 h-5" />
                      Zwróć bilet
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-colors"
                  >
                    Zamknij
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Refund Modal */}
        {refundTicket && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setRefundTicket(null)}
          >
            <div
              className="bg-gray-800 rounded-2xl max-w-md w-full border border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-gray-700 px-6 py-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Zwrot biletu</h2>
                <button
                  onClick={() => setRefundTicket(null)}
                  className="p-2 hover:bg-gray-700 rounded-full text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Wydarzenie</p>
                  <p className="text-white font-medium">{refundTicket.event.title}</p>
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-2">Powód zwrotu</label>
                  <select
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    className="w-full rounded-lg bg-gray-900 border border-gray-700 text-gray-200 px-3 py-2"
                  >
                    <option value="customer_request">Prośba klienta</option>
                    <option value="event_cancelled">Wydarzenie anulowane</option>
                    <option value="event_postponed">Wydarzenie przełożone</option>
                    <option value="duplicate">Duplikat zamówienia</option>
                    <option value="other">Inny powód</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-2">Dodatkowe informacje (opcjonalnie)</label>
                  <textarea
                    value={refundNotes}
                    onChange={(e) => setRefundNotes(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg bg-gray-900 border border-gray-700 text-gray-200 px-3 py-2"
                    placeholder="Opisz powód zwrotu..."
                  />
                </div>

                {refundMessage && (
                  <div
                    className={`rounded-lg px-3 py-2 text-sm ${
                      refundMessage.type === 'success'
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : 'bg-red-500/15 text-red-300 border border-red-500/30'
                    }`}
                  >
                    {refundMessage.text}
                  </div>
                )}
              </div>

              <div className="px-6 pb-6 flex gap-3">
                <button
                  onClick={handleRefundRequest}
                  disabled={isRefunding}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-gray-900 font-semibold rounded-xl transition-colors disabled:opacity-60"
                >
                  {isRefunding ? 'Przetwarzanie...' : 'Zleć zwrot'}
                </button>
                <button
                  onClick={() => setRefundTicket(null)}
                  className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-xl transition-colors"
                >
                  Anuluj
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
