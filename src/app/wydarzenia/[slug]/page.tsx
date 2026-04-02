'use client';

import { use, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Share2, 
  Ticket, 
  ExternalLink,
  Wifi,
  ArrowLeft,
  Tag,
  AlertTriangle,
  CheckCircle,
  Settings,
  Edit,
  TrendingUp,
  Users,
  Mail,
  Facebook,
  Twitter,
  MessageCircle,
  Crown,
  Award,
  Medal,
  Globe
} from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { clsx } from 'clsx';
import { useEvent, useRegisterForEvent, useCancelRegistration } from '@/hooks/useEvents';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import toast from 'react-hot-toast';
import { 
  isEventExpired, 
  isEventOngoing, 
  isEventUpcoming,
  canRegister as canRegisterCheck,
  canPromote as canPromoteCheck,
  areTicketsAvailable,
  getEffectiveStatus
} from '@/lib/eventUtils';
import { StatusBadgeLight, EventStateBadge } from '@/components/StatusBadge';
import { linkifyHtml } from '@/lib/utils/linkify';

const LeafletMap = dynamic(() => import('@/components/maps/LeafletMap'), { ssr: false });

interface EventPageProps {
  params: Promise<{ slug: string }>;
}

// Promotion badge component
function PromotionBadge({ level }: { level?: 'gold' | 'silver' | 'bronze' }) {
  if (!level) return null;
  
  const config = {
    gold: {
      icon: Crown,
      label: 'Złoty',
      className: 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-amber-900 shadow-lg shadow-amber-200/50 border border-amber-300',
    },
    silver: {
      icon: Award,
      label: 'Srebrny',
      className: 'bg-gradient-to-r from-slate-300 via-gray-200 to-slate-400 text-slate-800 shadow-md shadow-slate-200/50 border border-slate-300',
    },
    bronze: {
      icon: Medal,
      label: 'Brązowy',
      className: 'bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 text-orange-900 shadow-md shadow-orange-200/50 border border-orange-300',
    },
  };
  
  const { icon: Icon, label, className } = config[level];
  
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold', className)}>
      <Icon className="w-4 h-4" />
      {label}
    </span>
  );
}

export default function EventPage({ params }: EventPageProps) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  const router = useRouter();
  
  const { data: event, isLoading, error } = useEvent(slug);
  const { isAuthenticated, user, isOrganizer } = useAuth();
  const registerMutation = useRegisterForEvent();
  const cancelMutation = useCancelRegistration();
  const [mapCoords, setMapCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [shareUrl, setShareUrl] = useState('');
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://test.inicjatywakatolicka.pl';

  const { data: ticketTypes } = useQuery({
    queryKey: ['ticket-types', event?.id],
    queryFn: async () => {
      const response = await apiClient.get(`/tickets/event/${event?.id}/types/`);
      return response.data?.ticket_types || [];
    },
    enabled: !!event?.id,
  });

  const { data: myTickets } = useQuery({
    queryKey: ['my-tickets', event?.id],
    queryFn: async () => {
      const response = await apiClient.get('/tickets/my/');
      return response.data || [];
    },
    enabled: isAuthenticated && !!event?.id,
  });

  const hasTicketsForSale = (ticketTypes || []).some(
    (tt: any) => tt.is_active && !tt.is_hidden && (tt.quantity_available ?? 0) > 0
  );
  const minTicketPrice = (ticketTypes || [])
    .filter((tt: any) => tt.is_active && !tt.is_hidden && (tt.quantity_available ?? 0) > 0)
    .reduce((min: number | null, tt: any) => {
      const price = parseFloat(tt.price);
      if (Number.isNaN(price)) return min;
      return min === null ? price : Math.min(min, price);
    }, null as number | null);

  const myTicketsForEvent = (myTickets || []).filter((ticket: any) => ticket?.event?.id === event?.id);

  useEffect(() => {
    setShareUrl(window.location.href);
  }, []);

  useEffect(() => {
    const fetchCoords = async () => {
      if (!event || !event.location) return;
      const query = `${event.location.address || ''} ${event.location.city || ''}`.trim();
      if (!query) return;
      try {
        const response = await fetch(`${API_BASE}/nominatim/?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        if (Array.isArray(data) && data[0]?.lat && data[0]?.lon) {
          setMapCoords({ lat: Number(data[0].lat), lon: Number(data[0].lon) });
        }
      } catch (err) {
        setMapCoords(null);
      }
    };

    fetchCoords();
  }, [event?.location, API_BASE]);

  if (isLoading) {
    return <EventPageSkeleton />;
  }

  if (error || !event) {
    notFound();
  }

  const startDate = new Date(event.start_date);
  const endDate = event.end_date ? new Date(event.end_date) : null;
  const now = new Date();
  
  // Używamy logiki z eventUtils
  const effectiveStatus = getEffectiveStatus(event);
  const isClosed = effectiveStatus === 'closed';
  const isOngoing = isEventOngoing(event);
  const isPast = isEventExpired(event);
  const isUpcoming = isEventUpcoming(event);
  const isOwner = user && (user.is_staff || user.id === event.user.id);
  
  // Sprawdzenie możliwości promocji używając eventUtils
  const promoteCheck = canPromoteCheck(event);
  const canPromote = promoteCheck.canPromote;

  const handleRegister = () => {
    if (!isAuthenticated) {
      router.push(`/logowanie?redirect=/wydarzenia/${event.slug}`);
      return;
    }
    registerMutation.mutate(event.id);
  };

  const handleCancelRegistration = () => {
    if (!isAuthenticated) {
      toast.error('Musisz być zalogowany, aby anulować rejestrację');
      return;
    }
    cancelMutation.mutate(event.id);
  };

  // Format date for display
  const formatEventDate = () => {
    if (event.is_permanent) {
      return 'Wydarzenie trwa cały czas';
    }
    
    const dateStr = format(startDate, 'd MMMM yyyy', { locale: pl });
    const timeStr = format(startDate, 'HH:mm');
    
    if (endDate) {
      if (startDate.toDateString() === endDate.toDateString()) {
        return `${dateStr}, ${timeStr} - ${format(endDate, 'HH:mm')}`;
      }
      return `${dateStr} - ${format(endDate, 'd MMMM yyyy', { locale: pl })}`;
    }
    
    return `${dateStr}, ${timeStr}`;
  };

  // Share handlers
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(event.title);
  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodeURIComponent(`Sprawdź to wydarzenie: ${shareUrl}`)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${event.title} - ${shareUrl}`)}`,
  };

  const eventTypeLabels = {
    free: 'Wydarzenie darmowe',
    voluntary: 'Dobrowolna opłata',
    platform: 'Bilety przez platformę',
    paid: 'Wydarzenie płatne',
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Back button - outside hero */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Powrót do wydarzeń</span>
          </Link>
        </div>
      </div>

      {/* Header Section */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Date */}
          <div className="flex items-center gap-2 text-primary-600 font-medium mb-3">
            <Calendar className="w-5 h-5" />
            <span>{formatEventDate()}</span>
          </div>

          {/* Title with promotion badge */}
          <div className="flex flex-wrap items-start gap-4 mb-4">
            <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900">
              {event.title}
            </h1>
            {event.is_promoted && (
              <PromotionBadge level={event.promotion_level} />
            )}
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-2">
            {event.categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/?category=${cat.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-100 text-primary-700 text-sm font-medium hover:bg-primary-200 transition-colors"
              >
                <Tag className="w-3.5 h-3.5" />
                {cat.name}
              </Link>
            ))}
            {event.online_event && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium">
                <Globe className="w-3.5 h-3.5" />
                Wydarzenie online
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Action Buttons Card */}
            <div className="card p-6">
              <div className="flex flex-wrap gap-3">
                {/* Platform tickets */}
                {hasTicketsForSale && event.event_type === 'platform' && !isClosed && !(isOngoing && !event.is_permanent) && (
                  <Link
                    href={`/bilety/zakup/${event.id}`}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    <Ticket className="w-5 h-5" />
                    Kup bilety{minTicketPrice !== null ? ` - od ${minTicketPrice.toFixed(2)} zł` : ''}
                  </Link>
                )}

                {/* External tickets */}
                {event.ticket_url && event.event_type === 'paid' && !isClosed && !(isOngoing && !event.is_permanent) && (
                  <a
                    href={event.ticket_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary flex items-center gap-2"
                  >
                    <ExternalLink className="w-5 h-5" />
                    Kup bilet zewnętrzny{event.ticket_price ? ` - ${event.ticket_price} zł` : ''}
                  </a>
                )}

                {/* Registration buttons - hidden for ticketed events (platform/paid) */}
                {event.can_register && !event.is_registered && !event.is_fully_booked && !isClosed && !['paid', 'platform'].includes(event.event_type) && !(isOngoing && !event.is_permanent) && (
                  <button
                    onClick={handleRegister}
                    disabled={registerMutation.isPending}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    {registerMutation.isPending ? 'Rejestrowanie...' : 'Zarejestruj się'}
                  </button>
                )}

                {['paid', 'platform'].includes(event.event_type) && !isClosed && (
                  <div className="flex items-start gap-2 px-4 py-2 rounded-lg bg-amber-50 text-amber-800 text-sm border border-amber-200">
                    <AlertTriangle className="w-4 h-4 mt-0.5" />
                    <span>
                      Rejestracja odbywa się poprzez zakup biletu.
                    </span>
                  </div>
                )}

                {event.is_registered && !isClosed && !['paid', 'platform'].includes(event.event_type) && (
                  <button
                    onClick={handleCancelRegistration}
                    disabled={cancelMutation.isPending}
                    className="btn btn-outline flex items-center gap-2 border-red-300 text-red-600 hover:bg-red-50"
                  >
                    {cancelMutation.isPending ? 'Anulowanie...' : 'Anuluj rejestrację'}
                  </button>
                )}

                {/* Full event warning */}
                {event.is_fully_booked && !isClosed && (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-100 text-red-700 font-medium">
                    <AlertTriangle className="w-5 h-5" />
                    Brak dostępnych miejsc
                  </div>
                )}
              </div>

              {isAuthenticated && myTicketsForEvent.length > 0 && (
                <div className="mt-6 border-t border-slate-200 pt-5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                    <Ticket className="w-4 h-4" />
                    Twoje bilety na to wydarzenie
                  </div>
                  <div className="space-y-2">
                    {myTicketsForEvent.map((ticket: any) => (
                      <div key={ticket.ticket_code} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-100 p-3">
                        <div>
                          <div className="text-sm font-medium text-slate-900">{ticket.ticket_type?.name || 'Bilet'}</div>
                          <div className="text-xs text-slate-500">Kod: {ticket.ticket_code}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                            {{ valid: 'Ważny', used: 'Wykorzystany', cancelled: 'Anulowany', refunded: 'Zwrócony' }[ticket.status as string] || ticket.status}
                          </span>
                          <Link
                            href={`/bilety/${ticket.ticket_code}`}
                            className="text-sm text-indigo-600 hover:underline"
                          >
                            Zobacz bilet
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Status Warnings */}
            <div className="space-y-3">
              {user?.is_staff && event.needs_poster && !event.image && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-amber-800">Wydarzenie oczekuje na plakat</div>
                    <p className="text-sm text-amber-700 mt-1">
                      To wydarzenie wymaga dodania plakatu promocyjnego.
                    </p>
                  </div>
                </div>
              )}

              {isOngoing && !event.is_permanent && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <Clock className="w-5 h-5 text-blue-600 mt-0.5 animate-pulse" />
                  <div>
                    <div className="font-medium text-blue-800">To wydarzenie jest w trakcie trwania</div>
                    <p className="text-sm text-blue-700 mt-1">
                      Wydarzenie właśnie się odbywa!
                    </p>
                  </div>
                </div>
              )}

              {isClosed && !isOngoing && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-red-50 border border-red-200">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-red-800">To wydarzenie zostało zakończone</div>
                    <p className="text-sm text-red-700 mt-1">
                      Wydarzenie nie przyjmuje już rejestracji ani biletów.
                    </p>
                  </div>
                </div>
              )}

              {isPast && !isClosed && !isOngoing && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-slate-100 border border-slate-200">
                  <Calendar className="w-5 h-5 text-slate-500 mt-0.5" />
                  <div>
                    <div className="font-medium text-slate-700">Wydarzenie już się zakończyło</div>
                  </div>
                </div>
              )}
            </div>

            {/* Organizer Info */}
            {(event.organizer_profile || event.organizer) && (
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Organizator</h3>
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                    {event.organizer_profile?.logo ? (
                      <Image
                        src={event.organizer_profile.logo}
                        alt={event.organizer_profile.name}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-8 h-8 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900 text-lg">
                        {event.organizer_profile?.name || event.organizer}
                      </span>
                      {event.organizer_profile?.verified && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                          <CheckCircle className="w-3 h-3" />
                          Zweryfikowany
                        </span>
                      )}
                    </div>
                    {event.organizer_profile?.description && (
                      <p className="text-slate-600 mt-2 line-clamp-2">
                        {event.organizer_profile.description}
                      </p>
                    )}
                    {event.organizer_profile?.slug && (
                      <Link
                        href={`/organizatorzy/${event.organizer_profile.slug}`}
                        className="inline-flex items-center gap-1.5 mt-3 text-primary-600 hover:text-primary-700 font-medium"
                      >
                        Zobacz profil organizatora
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Owner Tools */}
            {isOwner && (
              <div className="card p-6 bg-slate-50 border-2 border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                  <Settings className="w-5 h-5 text-slate-600" />
                  <h3 className="text-lg font-semibold text-slate-900">Narzędzia organizatora</h3>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Link
                    href={`/moje-wydarzenia/${event.id}/rejestracje`}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors font-medium"
                  >
                    <Users className="w-5 h-5" />
                    Zarządzaj rejestracjami
                    {typeof event.registrations_count === 'number' && (
                      <span className="px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 text-sm">
                        {event.registrations_count}
                      </span>
                    )}
                  </Link>
                  
                  <Link
                    href={`/moje-wydarzenia/${event.id}/edytuj`}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors font-medium"
                  >
                    <Edit className="w-5 h-5" />
                    Edytuj wydarzenie
                  </Link>
                  
                  {event.event_type === 'platform' && (
                    <Link
                      href={`/bilety/organizator/zarzadzaj/${event.id}`}
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors font-medium"
                    >
                      <Ticket className="w-5 h-5" />
                      Zarządzaj biletami
                    </Link>
                  )}
                  
                  {canPromote && isOrganizer ? (
                    <Link
                      href={`/wydarzenia/${event.slug}/promuj`}
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-900 hover:from-amber-500 hover:to-yellow-600 transition-colors font-semibold shadow-md"
                    >
                      <TrendingUp className="w-5 h-5" />
                      Promuj to wydarzenie
                    </Link>
                  ) : event.is_promoted ? (
                    <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-emerald-100 border border-emerald-200 text-emerald-800 font-medium">
                      <CheckCircle className="w-5 h-5" />
                      <span>
                        Wydarzenie promowane
                        {event.promotion_level && ` (${event.promotion_level})`}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {/* About Section */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-black mb-4">O wydarzeniu</h3>
              
              {/* Event Image */}
              {event.image && (
                <div className="relative w-full aspect-video mb-6 rounded-xl overflow-hidden bg-slate-100">
                  <Image
                    src={event.image}
                    alt={event.title}
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              )}
              
              {/* Description with HTML support */}
              <div 
                className="prose prose-slate max-w-none prose-headings:font-display prose-a:text-primary-600 prose-a:no-underline hover:prose-a:underline"
                dangerouslySetInnerHTML={{ __html: linkifyHtml(event.description) }}
              />
            </div>

            {/* Location Section */}
            {(event.location || event.online_event) && (
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Lokalizacja</h3>
                
                {event.online_event ? (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                      <Wifi className="w-5 h-5 text-emerald-600 mt-0.5" />
                      <div>
                        <div className="font-medium text-emerald-800">Wydarzenie online</div>
                        <p className="text-sm text-emerald-700 mt-1">
                          To wydarzenie odbywa się w internecie
                        </p>
                      </div>
                    </div>
                    
                    {event.online_link && (
                      <a
                        href={event.online_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 btn btn-primary"
                      >
                        <ExternalLink className="w-5 h-5" />
                        Przejdź do wydarzenia online
                      </a>
                    )}
                  </div>
                ) : event.location && (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-primary-600 mt-0.5" />
                      <div>
                        <div className="font-medium text-slate-900">
                          {event.location.address && (
                            <span>{event.location.address}, </span>
                          )}
                          {event.location.city}
                        </div>
                        {event.location.region && (
                          <div className="text-sm text-slate-500">
                            {event.location.region}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Map */}
                    <div className="rounded-xl overflow-hidden">
                      {mapCoords ? (
                        <LeafletMap
                          lat={mapCoords.lat}
                          lon={mapCoords.lon}
                          label={`${event.location.address || ''} ${event.location.city}`.trim()}
                          height={300}
                        />
                      ) : (
                        <div className="h-[300px] bg-slate-100 flex items-center justify-center">
                          <div className="text-slate-500">Ładowanie mapy...</div>
                        </div>
                      )}
                    </div>

                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        `${event.location.address || ''} ${event.location.city}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Przejdź do Google Maps
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Share Section */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Udostępnij wydarzenie</h3>
              
              <div className="flex flex-wrap gap-3">
                <a
                  href={shareLinks.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1877F2] text-white hover:bg-[#166FE5] transition-colors font-medium"
                >
                  <Facebook className="w-5 h-5" />
                  Facebook
                </a>
                
                <a
                  href={shareLinks.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#1DA1F2] text-white hover:bg-[#1A94DA] transition-colors font-medium"
                >
                  <Twitter className="w-5 h-5" />
                  Twitter
                </a>
                
                <a
                  href={shareLinks.email}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-600 text-white hover:bg-slate-700 transition-colors font-medium"
                >
                  <Mail className="w-5 h-5" />
                  Email
                </a>
                
                <a
                  href={shareLinks.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#25D366] text-black hover:bg-[#20BD5A] transition-colors font-medium"
                >
                  <MessageCircle className="w-5 h-5" />
                  WhatsApp
                </a>
                
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl);
                    toast.success('Link skopiowany do schowka!');
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors font-medium border border-slate-200"
                >
                  <Share2 className="w-5 h-5" />
                  Kopiuj link
                </button>
              </div>
            </div>

            {/* Tags */}
            {event.tags?.length > 0 && (
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Tagi</h3>
                <div className="flex flex-wrap gap-2">
                  {event.tags.map((tag) => (
                    <Link
                      key={tag.id}
                      href={`/?tag=${tag.id}`}
                      className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-sm hover:bg-slate-200 transition-colors"
                    >
                      #{tag.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Info Card */}
            <div className="card p-6 sticky top-4">
              <h3 className="font-semibold text-slate-900 mb-4">Informacje</h3>
              
              <div className="space-y-4">
                {/* Date & Time */}
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-primary-600 mt-0.5" />
                  <div>
                    <div className="text-sm text-slate-500">Data</div>
                    {event.is_permanent ? (
                      <div className="font-medium text-slate-900">Wydarzenie trwa cały czas</div>
                    ) : (
                      <>
                        <div className="font-medium text-slate-900">
                          {format(startDate, 'd MMMM yyyy', { locale: pl })}
                        </div>
                        {endDate && startDate.toDateString() !== endDate.toDateString() && (
                          <div className="text-sm text-slate-500">
                            do {format(endDate, 'd MMMM yyyy', { locale: pl })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {!event.is_permanent && (
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-primary-600 mt-0.5" />
                    <div>
                      <div className="text-sm text-slate-500">Godzina</div>
                      <div className="font-medium text-slate-900">
                        {format(startDate, 'HH:mm')}
                        {endDate && ` - ${format(endDate, 'HH:mm')}`}
                      </div>
                    </div>
                  </div>
                )}

                {/* Location */}
                {event.location && !event.online_event && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-primary-600 mt-0.5" />
                    <div>
                      <div className="text-sm text-slate-500">Lokalizacja</div>
                      <div className="font-medium text-slate-900">
                        {event.location.city}
                      </div>
                      {event.location.address && (
                        <div className="text-sm text-slate-500">{event.location.address}</div>
                      )}
                    </div>
                  </div>
                )}

                {event.online_event && (
                  <div className="flex items-start gap-3">
                    <Wifi className="w-5 h-5 text-emerald-600 mt-0.5" />
                    <div>
                      <div className="text-sm text-slate-500">Typ</div>
                      <div className="font-medium text-emerald-700">Wydarzenie online</div>
                    </div>
                  </div>
                )}

                {/* Event Type */}
                <div className="flex items-start gap-3">
                  <Ticket className="w-5 h-5 text-primary-600 mt-0.5" />
                  <div>
                    <div className="text-sm text-slate-500">Typ biletu</div>
                    <div className="font-medium text-slate-900">
                      {eventTypeLabels[event.event_type]}
                    </div>
                    {event.ticket_price && event.event_type === 'paid' && (
                      <div className="text-lg font-bold text-primary-600 mt-1">
                        {event.ticket_price} zł
                      </div>
                    )}
                  </div>
                </div>

                {/* Participant limit */}
                {event.participant_limit && (
                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-primary-600 mt-0.5" />
                    <div>
                      <div className="text-sm text-slate-500">Limit miejsc</div>
                      <div className="font-medium text-slate-900">
                        {event.participant_limit} uczestników
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick action buttons */}
              <div className="mt-6 pt-6 border-t border-slate-200 space-y-3">
                {hasTicketsForSale && event.event_type === 'platform' && !isClosed && !(isOngoing && !event.is_permanent) && (
                  <Link
                    href={`/bilety/zakup/${event.id}`}
                    className="btn btn-primary w-full flex items-center justify-center gap-2"
                  >
                    <Ticket className="w-4 h-4" />
                    Kup bilety
                  </Link>
                )}

                {event.can_register && !event.is_registered && !event.is_fully_booked && !isClosed && !['paid', 'platform'].includes(event.event_type) && !(isOngoing && !event.is_permanent) && (
                  <button
                    onClick={handleRegister}
                    disabled={registerMutation.isPending}
                    className="btn btn-primary w-full"
                  >
                    {registerMutation.isPending ? 'Rejestrowanie...' : 'Zarejestruj się'}
                  </button>
                )}

                {event.is_registered && !isClosed && !['paid', 'platform'].includes(event.event_type) && (
                  <div className="text-center text-sm text-emerald-700 font-medium bg-emerald-50 px-4 py-2 rounded-lg">
                    ✓ Jesteś zarejestrowany
                  </div>
                )}

                {/* Report error link */}
                <Link
                  href={`/wydarzenia/${slug}/zglos-blad`}
                  className="text-center text-sm text-slate-500 hover:text-slate-700 transition-colors block mt-4"
                >
                  <AlertTriangle className="w-4 h-4 inline-block mr-1" />
                  Zgłoś błąd w wydarzeniu
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EventPageSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header skeleton */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="h-5 w-32 skeleton rounded" />
        </div>
      </div>
      
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-4">
          <div className="h-5 w-48 skeleton rounded" />
          <div className="h-10 w-3/4 skeleton rounded" />
          <div className="flex gap-2">
            <div className="h-8 w-24 skeleton rounded-full" />
            <div className="h-8 w-24 skeleton rounded-full" />
          </div>
        </div>
      </div>
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6 h-20 skeleton" />
            <div className="card p-6 h-32 skeleton" />
            <div className="card p-6 h-64 skeleton" />
            <div className="card p-6 h-80 skeleton" />
          </div>
          <div className="space-y-6">
            <div className="card p-6 h-80 skeleton" />
          </div>
        </div>
      </div>
    </div>
  );
}
