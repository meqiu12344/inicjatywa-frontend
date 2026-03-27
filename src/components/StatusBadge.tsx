'use client';

import { 
  Globe, 
  Clock, 
  Pencil, 
  EyeOff, 
  Lock, 
  HelpCircle,
  CheckCircle,
  AlertCircle,
  FileText,
  XCircle
} from 'lucide-react';
import { clsx } from 'clsx';
import type { EventStatus } from '@/types';
import { 
  getStatusLabel, 
  getStatusDisplayClass,
  getEffectiveStatus,
  isEventExpired,
  isEventOngoing,
  isEventUpcoming,
  getDaysUntilEvent,
  getDaysSinceEventEnded
} from '@/lib/eventUtils';

interface StatusBadgeProps {
  status: EventStatus;
  /** Jeśli true, wyświetli efektywny status uwzględniający auto-close */
  useEffectiveStatus?: boolean;
  /** Dane wydarzenia do obliczenia efektywnego statusu */
  event?: { end_date?: string; start_date: string; status: EventStatus };
  /** Rozmiar badge'a */
  size?: 'sm' | 'md' | 'lg';
  /** Czy pokazywać ikonę */
  showIcon?: boolean;
  /** Dodatkowe klasy CSS */
  className?: string;
}

const StatusIcon = ({ status, className }: { status: EventStatus; className?: string }) => {
  const iconProps = { className: clsx('shrink-0', className) };
  
  switch (status) {
    case 'public':
      return <CheckCircle {...iconProps} />;
    case 'pending':
      return <Clock {...iconProps} />;
    case 'draft':
      return <FileText {...iconProps} />;
    case 'hidden':
      return <EyeOff {...iconProps} />;
    case 'closed':
      return <Lock {...iconProps} />;
    default:
      return <HelpCircle {...iconProps} />;
  }
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
};

const iconSizeClasses = {
  sm: 'w-3 h-3',
  md: 'w-3.5 h-3.5',
  lg: 'w-4 h-4',
};

/**
 * Komponent StatusBadge
 * Wyświetla badge ze statusem wydarzenia w odpowiednich kolorach i z ikoną
 */
export function StatusBadge({ 
  status, 
  useEffectiveStatus = false,
  event,
  size = 'md',
  showIcon = true,
  className 
}: StatusBadgeProps) {
  // Oblicz efektywny status jeśli podano event i włączono tę opcję
  const displayStatus = useEffectiveStatus && event 
    ? getEffectiveStatus(event as any) 
    : status;
  
  const label = getStatusLabel(displayStatus);
  
  // Tailwind classes dla różnych statusów
  const statusStyles: Record<EventStatus, string> = {
    public: 'bg-green-500/20 text-green-400 border-green-500/30',
    pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    draft: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    hidden: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    closed: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  return (
    <span 
      className={clsx(
        'inline-flex items-center gap-1 rounded-full font-medium border',
        sizeClasses[size],
        statusStyles[displayStatus],
        className
      )}
    >
      {showIcon && <StatusIcon status={displayStatus} className={iconSizeClasses[size]} />}
      {label}
    </span>
  );
}

// ========================
// Dodatkowe warianty dla jasnego tła
// ========================

/**
 * StatusBadge dla jasnego tła (np. strona wydarzenia)
 */
export function StatusBadgeLight({ 
  status, 
  useEffectiveStatus = false,
  event,
  size = 'md',
  showIcon = true,
  className 
}: StatusBadgeProps) {
  const displayStatus = useEffectiveStatus && event 
    ? getEffectiveStatus(event as any) 
    : status;
  
  const label = getStatusLabel(displayStatus);
  
  const statusStyles: Record<EventStatus, string> = {
    public: 'bg-green-100 text-green-800 border-green-200',
    pending: 'bg-amber-100 text-amber-800 border-amber-200',
    draft: 'bg-gray-100 text-gray-800 border-gray-200',
    hidden: 'bg-purple-100 text-purple-800 border-purple-200',
    closed: 'bg-red-100 text-red-800 border-red-200',
  };

  return (
    <span 
      className={clsx(
        'inline-flex items-center gap-1 rounded-full font-medium border',
        sizeClasses[size],
        statusStyles[displayStatus],
        className
      )}
    >
      {showIcon && <StatusIcon status={displayStatus} className={iconSizeClasses[size]} />}
      {label}
    </span>
  );
}

// ========================
// Event State Badge
// ========================

interface EventStateBadgeProps {
  event: { 
    start_date: string; 
    end_date?: string; 
    status: EventStatus;
  };
  showDaysInfo?: boolean;
  className?: string;
}

/**
 * Badge pokazujący stan wydarzenia (nadchodzące/trwające/zakończone)
 */
export function EventStateBadge({ event, showDaysInfo = true, className }: EventStateBadgeProps) {
  const isExpired = isEventExpired(event);
  const isOngoing = isEventOngoing(event);
  const isUpcoming = isEventUpcoming(event);
  
  if (event.status === 'closed') {
    return (
      <span className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        'bg-red-100 text-red-800 border border-red-200',
        className
      )}>
        <Lock className="w-3 h-3" />
        Zamknięte
      </span>
    );
  }
  
  if (isOngoing) {
    return (
      <span className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        'bg-blue-100 text-blue-800 border border-blue-200',
        className
      )}>
        <Clock className="w-3 h-3 animate-pulse" />
        Trwa teraz
      </span>
    );
  }
  
  if (isExpired) {
    const daysSince = getDaysSinceEventEnded(event);
    return (
      <span className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        'bg-gray-100 text-gray-700 border border-gray-200',
        className
      )}>
        <XCircle className="w-3 h-3" />
        Zakończone
        {showDaysInfo && daysSince > 0 && (
          <span className="text-gray-500">({daysSince} dni temu)</span>
        )}
      </span>
    );
  }
  
  if (isUpcoming) {
    const daysUntil = getDaysUntilEvent(event);
    return (
      <span className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        'bg-emerald-100 text-emerald-800 border border-emerald-200',
        className
      )}>
        <AlertCircle className="w-3 h-3" />
        Nadchodzące
        {showDaysInfo && daysUntil > 0 && daysUntil <= 7 && (
          <span className="text-emerald-600">(za {daysUntil} {daysUntil === 1 ? 'dzień' : 'dni'})</span>
        )}
      </span>
    );
  }
  
  return null;
}

// ========================
// Status Menu Component
// ========================

interface StatusMenuProps {
  currentStatus: EventStatus;
  onStatusChange: (newStatus: EventStatus) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

const statusMenuOptions: { value: EventStatus; label: string; color: string }[] = [
  { value: 'public', label: 'Publiczne', color: 'text-green-400' },
  { value: 'draft', label: 'Szkic', color: 'text-gray-400' },
  { value: 'hidden', label: 'Ukryte', color: 'text-purple-400' },
  { value: 'closed', label: 'Zamknięte', color: 'text-red-400' },
];

/**
 * Menu dropdown do zmiany statusu wydarzenia
 */
export function StatusMenu({ 
  currentStatus, 
  onStatusChange, 
  isLoading = false,
  disabled = false 
}: StatusMenuProps) {
  return (
    <div className="flex flex-col gap-1">
      {statusMenuOptions.map((option) => (
        <button
          key={option.value}
          onClick={() => onStatusChange(option.value)}
          disabled={disabled || isLoading || currentStatus === option.value}
          className={clsx(
            'flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors',
            currentStatus === option.value
              ? 'bg-gray-700 text-white cursor-default'
              : 'hover:bg-gray-700/50 text-gray-300',
            (disabled || isLoading) && 'opacity-50 cursor-not-allowed'
          )}
        >
          <StatusIcon status={option.value} className={clsx('w-4 h-4', option.color)} />
          <span>{option.label}</span>
          {currentStatus === option.value && (
            <CheckCircle className="w-4 h-4 ml-auto text-green-400" />
          )}
        </button>
      ))}
    </div>
  );
}

export default StatusBadge;
