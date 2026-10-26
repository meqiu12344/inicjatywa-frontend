import { useEffect, useRef } from 'react';

/**
 * Skąd użytkownik otworzył wydarzenie: adres listy (filtry są w URL) i pozycja przewinięcia.
 * Dzięki temu „Powrót” na stronie wydarzenia wraca dokładnie do przeglądanych wyników.
 */
const KEY = 'ik:event-return';

export interface ReturnContext {
  // Ścieżka listy z parametrami, np. /szukaj?region=Śląskie&categories=3
  href: string;
  scrollY: number;
  eventId: number;
  // true zaraz po kliknięciu karty — strona wydarzenia wie, że poprzedni wpis historii to ta lista.
  fresh?: boolean;
  // true po kliknięciu „Powrót” — lista raz przewinie się do scrollY.
  restore?: boolean;
}

function read(): ReturnContext | null {
  try {
    const value = JSON.parse(window.sessionStorage.getItem(KEY) || 'null');
    // Tylko ścieżki tego serwisu — nigdy adres zewnętrzny.
    const valid = value && typeof value.href === 'string' && value.href.startsWith('/') && !value.href.startsWith('//');
    return valid ? value : null;
  } catch {
    return null;
  }
}

function write(value: ReturnContext): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // Prywatny tryb lub zablokowane dane strony — powrót działa wtedy jak dotąd.
  }
}

export function currentListingHref(): string {
  return `${window.location.pathname}${window.location.search}`;
}

export function rememberReturnContext(eventId: number): void {
  if (typeof window === 'undefined') return;
  write({ href: currentListingHref(), scrollY: Math.round(window.scrollY), eventId, fresh: true });
}

/** Kontekst powrotu dla otwartego wydarzenia; `fromList` — wejście prosto z listy w tej karcie. */
export function takeReturnContext(eventId: number): { context: ReturnContext; fromList: boolean } | null {
  const context = read();
  if (!context || context.eventId !== eventId) return null;
  if (context.fresh) write({ ...context, fresh: false });
  return { context, fromList: Boolean(context.fresh) };
}

export function markScrollRestore(context: ReturnContext): void {
  write({ ...context, fresh: false, restore: true });
}

/** Jednorazowo: pozycja do przywrócenia, gdy użytkownik wrócił z wydarzenia na tę samą listę. */
export function takeScrollRestore(href: string): number | null {
  const context = read();
  if (!context?.restore || context.href !== href) return null;
  write({ ...context, restore: false });
  return context.scrollY;
}

/** Lista przewija się do miejsca, z którego otwarto wydarzenie, gdy tylko wyniki są na stronie. */
export function useRestoreListingScroll(ready: boolean): void {
  const done = useRef(false);
  useEffect(() => {
    if (done.current || !ready || typeof window === 'undefined') return;
    done.current = true;
    const top = takeScrollRestore(currentListingHref());
    if (top !== null) requestAnimationFrame(() => window.scrollTo({ top }));
  }, [ready]);
}

/** Etykieta przycisku powrotu zależnie od listy, z której przyszedł użytkownik. */
export function returnLabel(href: string): string {
  if (href.startsWith('/szukaj')) return 'Powrót do wyników';
  if (href.startsWith('/kalendarz')) return 'Powrót do kalendarza';
  if (href.startsWith('/organizatorzy')) return 'Powrót do organizatora';
  return 'Powrót do wydarzeń';
}
