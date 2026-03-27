'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, MapPin, Clock, Calendar as CalendarIcon, Plus, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { eventsApi } from '@/lib/api/events';
import { EventListItem } from '@/types';

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  
  // Pobierz wydarzenia dla bieżącego miesiąca
  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['events', 'calendar', format(currentMonth, 'yyyy-MM')],
    queryFn: () => eventsApi.getEvents({
      date_from: format(monthStart, 'yyyy-MM-dd'),
      date_to: format(monthEnd, 'yyyy-MM-dd'),
      page_size: 100,
    }),
  });

  // Deduplicate events by ID
  const events = useMemo(() => {
    const results = eventsData?.results || [];
    const seen = new Set<number>();
    return results.filter(event => {
      if (seen.has(event.id)) return false;
      seen.add(event.id);
      return true;
    });
  }, [eventsData]);

  // Grupuj wydarzenia według daty
  const eventsByDate = events.reduce((acc: Record<string, EventListItem[]>, event) => {
    const dateStr = event.start_date.split('T')[0];
    if (!acc[dateStr]) {
      acc[dateStr] = [];
    }
    acc[dateStr].push(event);
    return acc;
  }, {});

  // Generuj dni miesiąca
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Dodaj dni z poprzedniego miesiąca dla wyrównania
  const startDayOfWeek = monthStart.getDay();
  const paddingDays = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

  const previousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  // Wydarzenia dla wybranego dnia
  const selectedDayEvents = selectedDate 
    ? eventsByDate[format(selectedDate, 'yyyy-MM-dd')] || []
    : [];

  // Nazwy dni tygodnia
  const dayNames = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];

  // Funkcja do określenia koloru wskaźnika na podstawie liczby wydarzeń
  const getEventIndicator = (count: number) => {
    if (count === 0) return null;
    if (count === 1) return 'bg-amber-500';
    if (count <= 3) return 'bg-emerald-500';
    return 'bg-rose-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Nagłówek strony */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-3">
              <CalendarIcon className="w-8 h-8 md:w-10 md:h-10 text-amber-500" />
              Kalendarz wydarzeń
            </h1>
            <p className="text-slate-400 mt-2">Przeglądaj wydarzenia katolickie w kalendarzu</p>
          </div>
          <Link
            href="/wydarzenia/dodaj"
            className="inline-flex items-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold rounded-xl transition-all shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40"
          >
            <Plus className="w-5 h-5" />
            Dodaj wydarzenie
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Kalendarz */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-700/50 p-4 md:p-6">
              {/* Nagłówek miesiąca z nawigacją */}
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={previousMonth}
                  className="p-2 md:p-3 hover:bg-slate-700/50 rounded-xl transition-all text-slate-400 hover:text-white"
                  aria-label="Poprzedni miesiąc"
                >
                  <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                </button>
                <h2 className="text-xl md:text-2xl font-bold text-white capitalize">
                  {format(currentMonth, 'LLLL yyyy', { locale: pl })}
                </h2>
                <button
                  onClick={nextMonth}
                  className="p-2 md:p-3 hover:bg-slate-700/50 rounded-xl transition-all text-slate-400 hover:text-white"
                  aria-label="Następny miesiąc"
                >
                  <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
                </button>
              </div>

              {/* Dni tygodnia */}
              <div className="grid grid-cols-7 mb-2">
                {dayNames.map((day, index) => (
                  <div 
                    key={day} 
                    className={`text-center text-xs md:text-sm font-semibold py-2 md:py-3 ${
                      index >= 5 ? 'text-amber-500/80' : 'text-slate-400'
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Siatka dni miesiąca */}
              <div className="grid grid-cols-7 gap-1 md:gap-2">
                {/* Puste miejsca na dni poprzedniego miesiąca */}
                {Array.from({ length: paddingDays }).map((_, i) => (
                  <div key={`padding-${i}`} className="aspect-square" />
                ))}

                {days.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const dayEvents = eventsByDate[dateStr] || [];
                  const eventCount = dayEvents.length;
                  const isSelected = isSameDay(day, selectedDate);
                  const isToday = isSameDay(day, new Date());
                  const dayOfWeek = day.getDay();
                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                  const indicatorColor = getEventIndicator(eventCount);

                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDate(day)}
                      className={`
                        aspect-square p-1 rounded-xl relative transition-all duration-200 flex flex-col items-center justify-center
                        ${isSelected 
                          ? 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/30 scale-105 z-10' 
                          : isToday 
                            ? 'bg-slate-700 text-white ring-2 ring-amber-500/50' 
                            : 'hover:bg-slate-700/50 text-slate-300'
                        }
                        ${isWeekend && !isSelected ? 'text-amber-400/80' : ''}
                      `}
                    >
                      <span className={`text-sm md:text-base font-medium ${isSelected ? 'font-bold' : ''}`}>
                        {format(day, 'd')}
                      </span>
                      
                      {/* Wskaźnik wydarzeń */}
                      {eventCount > 0 && (
                        <div className="absolute bottom-1 md:bottom-1.5 left-1/2 -translate-x-1/2">
                          {eventCount <= 3 ? (
                            <div className="flex gap-0.5">
                              {dayEvents.slice(0, 3).map((_, i) => (
                                <span
                                  key={i}
                                  className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full ${
                                    isSelected ? 'bg-slate-900' : 'bg-amber-500'
                                  }`}
                                />
                              ))}
                            </div>
                          ) : (
                            <span className={`
                              text-[10px] md:text-xs font-bold px-1 md:px-1.5 py-0.5 rounded-full
                              ${isSelected ? 'bg-slate-900/30 text-slate-900' : 'bg-amber-500/20 text-amber-400'}
                            `}>
                              {eventCount}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legenda */}
              <div className="mt-6 pt-4 border-t border-slate-700/50">
                <h4 className="text-sm font-semibold text-slate-400 mb-3">Legenda:</h4>
                <div className="flex flex-wrap items-center gap-4 md:gap-6 text-xs md:text-sm text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500" />
                    <span>Wydarzenie</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded ring-2 ring-amber-500/50 bg-slate-700" />
                    <span>Dzisiaj</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500 shadow-lg shadow-amber-500/30" />
                    <span>Wybrany dzień</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    </div>
                    <span>Liczba wydarzeń</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Panel wydarzeń dla wybranego dnia */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-700/50 p-4 md:p-6 sticky top-24">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-700/50">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
                  <CalendarIcon className="w-5 h-5 md:w-6 md:h-6 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-white">
                    {format(selectedDate, 'd MMMM', { locale: pl })}
                  </h3>
                  <p className="text-sm text-slate-400 capitalize">
                    {format(selectedDate, 'EEEE, yyyy', { locale: pl })}
                  </p>
                </div>
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse p-4 bg-slate-700/30 rounded-xl">
                      <div className="h-4 bg-slate-600 rounded w-3/4 mb-3" />
                      <div className="h-3 bg-slate-600 rounded w-1/2 mb-2" />
                      <div className="h-3 bg-slate-600 rounded w-2/3" />
                    </div>
                  ))}
                </div>
              ) : selectedDayEvents.length > 0 ? (
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
                  {selectedDayEvents.map((event) => (
                    <Link
                      key={event.id}
                      href={`/wydarzenia/${event.slug}`}
                      className="block p-4 bg-slate-700/30 hover:bg-slate-700/50 rounded-xl border border-slate-600/30 hover:border-amber-500/30 transition-all group"
                    >
                      <h4 className="font-semibold text-white line-clamp-2 group-hover:text-amber-400 transition-colors">
                        {event.title}
                      </h4>
                      
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <Clock className="w-4 h-4 text-amber-500/70" />
                          <span>
                            {format(parseISO(event.start_date), 'HH:mm', { locale: pl })}
                          </span>
                        </div>
                        
                        {event.location && (
                          <div className="flex items-center gap-2 text-sm text-slate-400">
                            <MapPin className="w-4 h-4 text-amber-500/70" />
                            <span className="line-clamp-1">{event.location.city}</span>
                          </div>
                        )}
                      </div>

                      {event.category && (
                        <span className="inline-block mt-3 px-2 py-1 bg-amber-500/20 text-amber-400 text-xs font-medium rounded-lg">
                          {event.category.name}
                        </span>
                      )}

                      <div className="mt-3 pt-3 border-t border-slate-600/30 flex items-center justify-between">
                        <span className="text-xs text-amber-500 font-medium group-hover:underline flex items-center gap-1">
                          Zobacz więcej
                          <ExternalLink className="w-3 h-3" />
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 md:py-12">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-700/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <CalendarIcon className="w-8 h-8 md:w-10 md:h-10 text-slate-500" />
                  </div>
                  <p className="text-slate-400 font-medium">Brak wydarzeń w tym dniu</p>
                  <p className="text-slate-500 text-sm mt-1">Wybierz inny dzień lub dodaj wydarzenie</p>
                  <Link
                    href="/wydarzenia/dodaj"
                    className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-slate-700/50 hover:bg-amber-500/20 text-slate-300 hover:text-amber-400 text-sm font-medium rounded-lg transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Dodaj wydarzenie
                  </Link>
                </div>
              )}

              {selectedDayEvents.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-700/50 text-center">
                  <span className="text-sm text-slate-400">
                    Łącznie <span className="text-amber-400 font-semibold">{selectedDayEvents.length}</span> {selectedDayEvents.length === 1 ? 'wydarzenie' : selectedDayEvents.length < 5 ? 'wydarzenia' : 'wydarzeń'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Lista wszystkich wydarzeń w miesiącu */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-white">
              Wszystkie wydarzenia w{' '}
              <span className="text-amber-400 capitalize">
                {format(currentMonth, 'LLLL yyyy', { locale: pl })}
              </span>
            </h2>
            <span className="text-slate-400 text-sm">
              {events.length} {events.length === 1 ? 'wydarzenie' : events.length < 5 ? 'wydarzenia' : 'wydarzeń'}
            </span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-slate-800/80 rounded-xl p-4 animate-pulse border border-slate-700/50">
                  <div className="h-4 bg-slate-700 rounded w-3/4 mb-3" />
                  <div className="h-3 bg-slate-700 rounded w-1/2 mb-2" />
                  <div className="h-3 bg-slate-700 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : events.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map((event) => (
                <Link
                  key={event.id}
                  href={`/wydarzenia/${event.slug}`}
                  className="bg-slate-800/80 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50 hover:border-amber-500/30 transition-all shadow-lg hover:shadow-amber-500/5 group"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-amber-500/20 to-amber-600/10 rounded-xl flex flex-col items-center justify-center border border-amber-500/20">
                      <span className="text-[10px] text-amber-400/80 uppercase font-semibold">
                        {format(parseISO(event.start_date), 'MMM', { locale: pl })}
                      </span>
                      <span className="text-xl font-bold text-amber-400">
                        {format(parseISO(event.start_date), 'd')}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white line-clamp-2 group-hover:text-amber-400 transition-colors">
                        {event.title}
                      </h3>
                      <div className="mt-2 space-y-1">
                        <p className="text-sm text-slate-400 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-500/70" />
                          {format(parseISO(event.start_date), 'HH:mm', { locale: pl })}
                        </p>
                        {event.location && (
                          <p className="text-sm text-slate-400 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-amber-500/70" />
                            <span className="line-clamp-1">{event.location.city}</span>
                          </p>
                        )}
                      </div>
                      {event.category && (
                        <span className="inline-block mt-2 px-2 py-0.5 bg-amber-500/10 text-amber-400 text-xs font-medium rounded">
                          {event.category.name}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-slate-800/50 rounded-2xl border border-slate-700/50">
              <div className="w-20 h-20 bg-slate-700/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CalendarIcon className="w-10 h-10 text-slate-500" />
              </div>
              <p className="text-slate-400 font-medium text-lg">Brak wydarzeń w tym miesiącu</p>
              <p className="text-slate-500 text-sm mt-2">Zmień miesiąc lub dodaj nowe wydarzenie</p>
              <Link
                href="/wydarzenia/dodaj"
                className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold rounded-xl transition-all shadow-lg shadow-amber-500/25"
              >
                <Plus className="w-5 h-5" />
                Dodaj wydarzenie
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
