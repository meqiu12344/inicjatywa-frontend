/**
 * Event Status Utilities
 * 
 * Centralizuje logikę statusów wydarzeń przeniesioną z backendu Django.
 * Odzwierciedla logikę z EventService/models.py
 */

import type { Event, EventStatus, EventType, LocationType } from '@/types';

// ========================
// Status Choices & Labels
// ========================

export const STATUS_CHOICES: { value: EventStatus; label: string }[] = [
  { value: 'pending', label: 'Do zatwierdzenia' },
  { value: 'public', label: 'Wydarzenie publiczne' },
  { value: 'draft', label: 'Wersja robocza' },
  { value: 'hidden', label: 'Wydarzenie ukryte' },
  { value: 'closed', label: 'Wydarzenie zamknięte' },
];

// Szkic AI nie jest do wyboru w formularzach — wchodzi wyłącznie przez API i wychodzi przez panel akceptacji.
export const AI_DRAFT_STATUS: { value: EventStatus; label: string } = { value: 'ai_draft', label: 'Szkic AI' };

export const EVENT_TYPE_CHOICES: { value: EventType; label: string }[] = [
  { value: 'free', label: 'Wydarzenie darmowe' },
  { value: 'voluntary', label: 'Dobrowolna opłata' },
  { value: 'platform', label: 'Bilety przez platformę' },
  { value: 'paid', label: 'Bilety zewnętrzne' },
  { value: 'ask_organizer', label: 'Cena: zapytaj Organizatora' },
  { value: 'unknown', label: 'Brak informacji o cenie' },
];

// Forma uczestnictwa — osobno od kategorii, która opisuje charakter wydarzenia.
export const LOCATION_TYPE_CHOICES: { value: LocationType; label: string; description: string }[] = [
  { value: 'onsite', label: 'Stacjonarne', description: 'W jednym, konkretnym miejscu' },
  { value: 'online', label: 'Online', description: 'Uczestnicy dołączają przez link' },
  { value: 'hybrid', label: 'Hybrydowe', description: 'Na miejscu i online jednocześnie' },
  { value: 'broadcast', label: 'Transmisja', description: 'Oglądanie na żywo, np. Msza online' },
  {
    value: 'nationwide',
    label: 'Ogólnopolskie / wiele lokalizacji',
    description: 'Bez jednego adresu, np. zbiórka we wszystkich parafiach',
  },
];

export function getLocationTypeLabel(type: LocationType): string {
  return LOCATION_TYPE_CHOICES.find(choice => choice.value === type)?.label ?? type;
}

/** Uczestnik przychodzi na miejsce — wymagany adres. */
export function needsVenue(type: LocationType): boolean {
  return type === 'onsite' || type === 'hybrid';
}

/** Można uczestniczyć zdalnie — wymagany link. */
export function needsOnlineLink(type: LocationType): boolean {
  return type === 'online' || type === 'hybrid' || type === 'broadcast';
}

/** Znacznik na kartach: Online / Hybrydowe / Transmisja; null, gdy udział jest tylko na miejscu. */
export function getRemoteLabel(event: { location_type?: LocationType; online_event?: boolean }): string | null {
  const type = getLocationType(event);
  return needsOnlineLink(type) ? getLocationTypeLabel(type) : null;
}

/**
 * Typ lokalizacji wydarzenia. Starsze odpowiedzi API (i dane w cache) mają tylko online_event.
 */
export function getLocationType(event: { location_type?: LocationType; online_event?: boolean }): LocationType {
  return event.location_type ?? (event.online_event ? 'online' : 'onsite');
}

/**
 * Zakończenie z pól formularza (RRRR-MM-DD, GG:MM). Koniec jest opcjonalny: bez daty i godziny — brak końca;
 * sama godzina — dzień rozpoczęcia; sama data — znany dzień bez godziny (backend zapisze 23:59, a portal
 * pokaże samą datę).
 */
export function buildEventEnd(
  startDate: string,
  endDate: string,
  endTime: string,
): { end_date: string | null; end_time_unknown: boolean } {
  if (!endDate && !endTime) return { end_date: null, end_time_unknown: false };
  return { end_date: `${endDate || startDate}T${endTime || '23:59'}`, end_time_unknown: !endTime };
}

/**
 * Krótka etykieta miejsca na kartach i listach: miasto (opcjonalnie z regionem) albo „Ogólnopolskie”.
 * null — nie ma czego pokazać (np. wydarzenie online).
 */
export function getPlaceLabel(
  event: { location?: { city: string; region?: string } | null; location_type?: LocationType },
  withRegion = false,
): string | null {
  if (event.location_type === 'nationwide') return 'Ogólnopolskie';
  if (!event.location) return null;
  return withRegion && event.location.region ? `${event.location.city}, ${event.location.region}` : event.location.city;
}

// ========================
// Status Display Helpers
// ========================

export function getStatusLabel(status: EventStatus): string {
  return [...STATUS_CHOICES, AI_DRAFT_STATUS].find(s => s.value === status)?.label || status;
}

export function getEventTypeLabel(eventType: EventType): string {
  return EVENT_TYPE_CHOICES.find(t => t.value === eventType)?.label || eventType;
}

/**
 * Zwraca klasę CSS dla danego statusu (Tailwind)
 * Odzwierciedla Event.get_status_display_class() z backendu
 */
export function getStatusDisplayClass(status: EventStatus): string {
  const statusClasses: Record<EventStatus, string> = {
    public: 'bg-green-100 text-green-800 border-green-200',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    draft: 'bg-orange-100 text-orange-800 border-orange-200',
    hidden: 'bg-gray-100 text-gray-800 border-gray-200',
    closed: 'bg-red-100 text-red-800 border-red-200',
    ai_draft: 'bg-violet-100 text-violet-800 border-violet-200',
  };
  return statusClasses[status] || 'bg-blue-100 text-blue-800 border-blue-200';
}

/**
 * Zwraca nazwę ikony Lucide dla danego statusu
 * Odzwierciedla Event.get_status_icon() z backendu
 */
export function getStatusIcon(status: EventStatus): string {
  const statusIcons: Record<EventStatus, string> = {
    public: 'Globe',
    pending: 'Clock',
    draft: 'Pencil',
    hidden: 'EyeOff',
    closed: 'Lock',
    ai_draft: 'Bot',
  };
  return statusIcons[status] || 'HelpCircle';
}

// ========================
// Event State Checks
// ========================

type EventDateFields = {
  start_date: string;
  end_date?: string | null;
  end_time_unknown?: boolean;
  is_permanent?: boolean;
};

const warsawDayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit',
});

function warsawDay(value: Date): string {
  const parts = warsawDayFormatter.formatToParts(value);
  return ['year', 'month', 'day'].map((type) => parts.find((part) => part.type === type)?.value).join('-');
}

/** Explicit end times are exclusive; missing end times cover the whole Warsaw day. */
export function isEventExpired(event: EventDateFields): boolean {
  if (event.is_permanent) return false;
  const now = new Date();
  if (event.end_date && !event.end_time_unknown) {
    return new Date(event.end_date) <= now;
  }
  return warsawDay(new Date(event.end_date || event.start_date)) < warsawDay(now);
}

/** An ongoing event cannot simultaneously be expired. */
export function isEventOngoing(event: EventDateFields): boolean {
  return new Date(event.start_date) <= new Date() && !isEventExpired(event);
}

/**
 * Sprawdza czy wydarzenie jest nadchodzące (jeszcze się nie zaczęło)
 */
export function isEventUpcoming(event: Event | { start_date: string }): boolean {
  return new Date(event.start_date) > new Date();
}

/**
 * Sprawdza czy wydarzenie jest widoczne publicznie
 * Odzwierciedla Event.is_visible() z backendu
 */
export function isEventVisible(event: Event): boolean {
  return (event.status === 'public' || event.status === 'closed') && event.visible;
}

/**
 * Sprawdza czy wydarzenie może być edytowane
 * Odzwierciedla Event.is_editable() z backendu
 */
export function isEventEditable(event: Event | { status: EventStatus }): boolean {
  return ['draft', 'public', 'hidden'].includes(event.status);
}

// ========================
// Auto-Close Logic
// ========================

/** Keep manual draft/hidden/closed statuses while closing expired public events. */
export function shouldAutoClose(event: EventDateFields & { status: EventStatus }): boolean {
  return (event.status === 'public' || event.status === 'pending') && isEventExpired(event);
}

/** Reopening requires an actual date correction, never just viewing a closed event. */
export function shouldAutoReopen(
  event: { start_date: string; status: EventStatus },
  previousStartDate?: string,
): boolean {
  return !!previousStartDate && event.status === 'closed'
    && new Date(previousStartDate) <= new Date() && new Date(event.start_date) > new Date();
}

/**
 * Zwraca sugerowany status dla wydarzenia na podstawie logiki auto-close/auto-reopen
 */
export function getSuggestedStatus(event: Event): EventStatus {
  // Sprawdź auto-reopen (priorytet wyższy)
  if (shouldAutoReopen(event)) {
    return 'public';
  }
  
  // Sprawdź auto-close
  if (shouldAutoClose(event)) {
    return 'closed';
  }
  
  // Zwróć obecny status
  return event.status;
}

/**
 * Oblicza efektywny status wydarzenia (uwzględniając auto-close/auto-reopen)
 * Użyj tej funkcji do wyświetlania statusu użytkownikowi
 */
export function getEffectiveStatus(event: Event): EventStatus {
  return getSuggestedStatus(event);
}

// ========================
// Registration Logic
// ========================

/**
 * Sprawdza czy można się zarejestrować na wydarzenie
 * Odzwierciedla Event.can_register() z backendu
 */
export function canRegister(
  event: Event | {
    status: EventStatus;
    start_date: string;
    is_fully_booked?: boolean;
    participant_limit?: number | null;
    is_limited?: boolean;
    registrations_count?: number;
  },
  isAuthenticated: boolean = false
): { canRegister: boolean; reason?: string } {
  // Musi być zalogowany
  if (!isAuthenticated) {
    return { canRegister: false, reason: 'Musisz być zalogowany, aby się zarejestrować' };
  }
  
  // Status musi być public
  if (event.status !== 'public') {
    return { canRegister: false, reason: 'Rejestracja na to wydarzenie jest niedostępna' };
  }
  
  // Sprawdź czy wydarzenie się nie zaczęło
  const now = new Date();
  if (new Date(event.start_date) <= now) {
    return { canRegister: false, reason: 'Wydarzenie już się rozpoczęło' };
  }
  
  // Sprawdź is_fully_booked
  if (event.is_fully_booked) {
    return { canRegister: false, reason: 'Brak wolnych miejsc' };
  }
  
  // Sprawdź limit uczestników (is_limited = true oznacza BRAK limitu w backendzie)
  if (event.participant_limit && !event.is_limited) {
    const registeredCount = event.registrations_count || 0;
    if (registeredCount >= event.participant_limit) {
      return { canRegister: false, reason: 'Osiągnięto limit uczestników' };
    }
  }
  
  return { canRegister: true };
}

/**
 * Sprawdza czy wydarzenie może zostać opublikowane
 * Odzwierciedla Event.can_be_published() z backendu
 */
export function canBePublished(event: Partial<Event>): { canPublish: boolean; missingFields: string[] } {
  const missingFields: string[] = [];
  
  if (!event.title) missingFields.push('Tytuł');
  if (!event.description) missingFields.push('Opis');
  if (!event.start_date) missingFields.push('Data rozpoczęcia');
  if (needsVenue(getLocationType(event)) && !event.location) missingFields.push('Lokalizacja lub wydarzenie online');
  
  return {
    canPublish: missingFields.length === 0,
    missingFields,
  };
}

// ========================
// Promotion Logic
// ========================

/**
 * Sprawdza czy wydarzenie można promować
 */
export function canPromote(event: Event): { canPromote: boolean; reason?: string } {
  // Musi być publiczne
  if (event.status !== 'public') {
    return { canPromote: false, reason: 'Tylko publiczne wydarzenia można promować' };
  }
  
  // Sprawdź czy wydarzenie się nie skończyło
  if (isEventExpired(event)) {
    return { canPromote: false, reason: 'Nie można promować zakończonych wydarzeń' };
  }
  
  // Sprawdź czy już nie jest promowane
  if (event.is_promoted) {
    return { canPromote: false, reason: 'Wydarzenie jest już promowane' };
  }
  
  return { canPromote: true };
}

// ========================
// Date Calculations
// ========================

/**
 * Oblicza ile dni pozostało do wydarzenia
 */
export function getDaysUntilEvent(event: Event | { start_date: string }): number {
  const now = new Date();
  const startDate = new Date(event.start_date);
  const diffTime = startDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Oblicza ile dni temu wydarzenie się skończyło
 */
export function getDaysSinceEventEnded(event: Event | { end_date?: string; start_date: string }): number {
  const now = new Date();
  const endDate = event.end_date ? new Date(event.end_date) : new Date(event.start_date);
  const diffTime = now.getTime() - endDate.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Zwraca czas trwania wydarzenia w godzinach
 */
export function getEventDurationHours(event: Event | { start_date: string; end_date?: string }): number | null {
  if (!event.end_date) return null;
  
  const startDate = new Date(event.start_date);
  const endDate = new Date(event.end_date);
  const diffMs = endDate.getTime() - startDate.getTime();
  return Math.round(diffMs / (1000 * 60 * 60) * 10) / 10; // Zaokrąglone do 1 miejsca po przecinku
}

// ========================
// Status Transition Helpers
// ========================

/**
 * Zwraca dozwolone przejścia statusów dla danego statusu
 */
export function getAllowedStatusTransitions(currentStatus: EventStatus): EventStatus[] {
  const transitions: Record<EventStatus, EventStatus[]> = {
    pending: ['draft'],
    public: ['draft', 'hidden', 'closed'],
    draft: ['pending'],
    hidden: ['public', 'pending', 'draft', 'closed'],
    closed: ['draft'],
    ai_draft: [], // tylko przez panel akceptacji szkiców AI
  };
  
  return transitions[currentStatus] || [];
}

/**
 * Sprawdza czy przejście między statusami jest dozwolone
 */
export function isStatusTransitionAllowed(from: EventStatus, to: EventStatus): boolean {
  return getAllowedStatusTransitions(from).includes(to);
}

// ========================
// Availability Window
// ========================

/**
 * Sprawdza czy bilety są aktualnie dostępne (w oknie czasowym)
 */
export function areTicketsAvailable(event: Event): { available: boolean; reason?: string } {
  const now = new Date();
  
  // Sprawdź available_from
  if (event.available_from) {
    const availableFrom = new Date(event.available_from);
    if (now < availableFrom) {
      return { 
        available: false, 
        reason: `Bilety będą dostępne od ${availableFrom.toLocaleDateString('pl-PL')}` 
      };
    }
  }
  
  // Sprawdź available_to
  if (event.available_to) {
    const availableTo = new Date(event.available_to);
    if (now > availableTo) {
      return { 
        available: false, 
        reason: 'Sprzedaż biletów została zakończona' 
      };
    }
  }
  
  // Sprawdź czy wydarzenie się nie zaczęło
  if (!isEventUpcoming(event)) {
    return { available: false, reason: 'Wydarzenie już się rozpoczęło' };
  }
  
  return { available: true };
}

// ========================
// Summary Helpers
// ========================

/**
 * Zwraca podsumowanie stanu wydarzenia dla UI
 */
export function getEventStateSummary(event: Event): {
  effectiveStatus: EventStatus;
  statusLabel: string;
  statusClass: string;
  isExpired: boolean;
  isOngoing: boolean;
  isUpcoming: boolean;
  canEdit: boolean;
  canRegisterResult: { canRegister: boolean; reason?: string };
  daysUntil: number | null;
  daysSince: number | null;
} {
  const effectiveStatus = getEffectiveStatus(event);
  const isExpired = isEventExpired(event);
  const isOngoing = isEventOngoing(event);
  const isUpcoming = isEventUpcoming(event);
  
  return {
    effectiveStatus,
    statusLabel: getStatusLabel(effectiveStatus),
    statusClass: getStatusDisplayClass(effectiveStatus),
    isExpired,
    isOngoing,
    isUpcoming,
    canEdit: isEventEditable(event),
    canRegisterResult: canRegister(event, false), // Bez sprawdzania auth
    daysUntil: isUpcoming ? getDaysUntilEvent(event) : null,
    daysSince: isExpired ? getDaysSinceEventEnded(event) : null,
  };
}
