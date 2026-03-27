# System Statusów Wydarzeń - Dokumentacja

## Przegląd

System statusów wydarzeń został przeniesiony z backendu Django na frontend Next.js, zachowując pełną kompatybilność z logiką serwerową. Wszystkie funkcje pomocnicze, hooki i komponenty są scentralizowane w dedykowanych plikach.

## Struktura plików

```
frontend/src/
├── lib/
│   └── eventUtils.ts          # Główna biblioteka z logiką statusów
├── hooks/
│   └── useEventStatus.ts      # Hook do zarządzania statusami
└── components/
    └── StatusBadge.tsx        # Komponenty UI dla statusów
```

## Statusy wydarzeń

| Status | Label | Opis |
|--------|-------|------|
| `pending` | Do zatwierdzenia | Wydarzenie oczekuje na zatwierdzenie przez admina |
| `public` | Wydarzenie publiczne | Wydarzenie jest widoczne publicznie |
| `draft` | Wersja robocza | Wydarzenie w fazie przygotowania |
| `hidden` | Wydarzenie ukryte | Wydarzenie ukryte przed użytkownikami |
| `closed` | Wydarzenie zamknięte | Wydarzenie zakończone |

## Typy wydarzeń

| Typ | Label | Opis |
|-----|-------|------|
| `free` | Wydarzenie darmowe | Bezpłatne wejście |
| `voluntary` | Dobrowolna opłata | Opcjonalna opłata |
| `platform` | Bilety przez platformę | Sprzedaż przez system |
| `paid` | Bilety zewnętrzne | Link do zewnętrznej sprzedaży |

## Logika Auto-Close

### Automatyczne zamykanie
Wydarzenie jest automatycznie zamykane gdy:
- `end_date` minął (jest w przeszłości)
- Status jest `public` lub `pending`

**NIE zamyka się automatycznie gdy:**
- Status to `draft`, `hidden` lub `closed` (ustawione ręcznie)

### Automatyczne ponowne otwarcie
Zamknięte wydarzenie może być ponownie otwarte gdy:
- Status to `closed`
- `start_date` jest w przyszłości

## API funkcji (eventUtils.ts)

### Stałe
```typescript
STATUS_CHOICES: { value: EventStatus; label: string }[]
EVENT_TYPE_CHOICES: { value: EventType; label: string }[]
```

### Funkcje wyświetlania
```typescript
getStatusLabel(status: EventStatus): string
getEventTypeLabel(eventType: EventType): string
getStatusDisplayClass(status: EventStatus): string  // Klasy Tailwind
getStatusIcon(status: EventStatus): string          // Nazwa ikony Lucide
```

### Sprawdzenia stanu
```typescript
isEventExpired(event): boolean        // Czy wydarzenie minęło
isEventOngoing(event): boolean        // Czy wydarzenie trwa
isEventUpcoming(event): boolean       // Czy wydarzenie jest nadchodzące
isEventVisible(event): boolean        // Czy widoczne publicznie
isEventEditable(event): boolean       // Czy można edytować
```

### Logika Auto-Close
```typescript
shouldAutoClose(event): boolean       // Czy powinno być zamknięte
shouldAutoReopen(event): boolean      // Czy może być ponownie otwarte
getSuggestedStatus(event): EventStatus
getEffectiveStatus(event): EventStatus
```

### Sprawdzenia rejestracji i promocji
```typescript
canRegister(event, isAuthenticated): { canRegister: boolean; reason?: string }
canPromote(event): { canPromote: boolean; reason?: string }
canBePublished(event): { canPublish: boolean; missingFields: string[] }
areTicketsAvailable(event): { available: boolean; reason?: string }
```

### Obliczenia czasowe
```typescript
getDaysUntilEvent(event): number
getDaysSinceEventEnded(event): number
getEventDurationHours(event): number | null
```

### Przejścia statusów
```typescript
getAllowedStatusTransitions(currentStatus: EventStatus): EventStatus[]
isStatusTransitionAllowed(from: EventStatus, to: EventStatus): boolean
```

## Hook useEventStatus

```typescript
const {
  // Status
  currentStatus,
  effectiveStatus,
  statusWasAutoChanged,
  autoChangeMessage,
  statusLabel,
  
  // Dozwolone przejścia
  allowedTransitions,
  
  // Sprawdzenia
  isExpired,
  isOngoing,
  isUpcoming,
  isEditable,
  canRegister,
  canPromote,
  canPublish,
  ticketsAvailable,
  daysUntil,
  daysSince,
  
  // Akcje
  changeStatus,
  isChangingStatus,
  changeStatusError,
} = useEventStatus(event, { showToasts: true });
```

## Komponenty StatusBadge

### StatusBadge (ciemne tło)
```tsx
<StatusBadge 
  status="public" 
  size="md"           // 'sm' | 'md' | 'lg'
  showIcon={true}
/>
```

### StatusBadgeLight (jasne tło)
```tsx
<StatusBadgeLight 
  status="public" 
  useEffectiveStatus={true}
  event={eventData}
/>
```

### EventStateBadge
```tsx
<EventStateBadge 
  event={eventData}
  showDaysInfo={true}  // Pokazuje "za X dni" lub "X dni temu"
/>
```

### StatusMenu
```tsx
<StatusMenu
  currentStatus="public"
  onStatusChange={(newStatus) => handleChange(newStatus)}
  isLoading={false}
/>
```

## Przykłady użycia

### Filtrowanie wydarzeń
```typescript
import { getEffectiveStatus, isEventUpcoming } from '@/lib/eventUtils';

const upcomingEvents = events.filter(e => {
  const status = getEffectiveStatus(e);
  return isEventUpcoming(e) && status !== 'closed';
});
```

### Ostrzeżenie o auto-close w formularzu
```tsx
import { shouldAutoClose, shouldAutoReopen } from '@/lib/eventUtils';

{shouldAutoClose(event) && (
  <Alert type="warning">
    Wydarzenie zostanie automatycznie zamknięte przy zapisie.
  </Alert>
)}
```

### Wyświetlanie statusu z efektywnym statusem
```tsx
import { StatusBadge } from '@/components/StatusBadge';

<StatusBadge 
  status={event.status}
  useEffectiveStatus={true}
  event={event}
/>
```

## Synchronizacja z backendem

Frontend odzwierciedla logikę z:
- `EventService/models.py` - metody `auto_close()`, `can_register()`, `is_editable()`, `is_visible()`
- `EventService/serializers.py` - metoda `get_can_register()`
- `EventService/signals.py` - logika powiadomień

Backend nadal wykonuje faktyczną zmianę statusu przy zapisie wydarzenia. Frontend wyświetla "efektywny status" dla lepszego UX.
