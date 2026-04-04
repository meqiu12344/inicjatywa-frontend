'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { format, addDays, startOfWeek, endOfMonth } from 'date-fns';
import { pl } from 'date-fns/locale';
import { 
  Search, MapPin, Calendar, X, 
  SlidersHorizontal, Grid, List, ArrowUpDown,
  Wifi, Tag, Loader2, RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { eventsApi, categoriesApi } from '@/lib/api/events';
import { EventCard, EventCardSkeleton } from '@/components/events/EventCard';
import { usePromotionImpressions } from '@/hooks/usePromotionTracking';
import type { EventListItem, EventFilters, EventType } from '@/types';

// Date presets
const getDatePresets = () => {
  const today = new Date();
  const tomorrow = addDays(today, 1);
  const weekendStart = startOfWeek(today, { weekStartsOn: 1 });
  const saturday = addDays(weekendStart, 5);
  const sunday = addDays(weekendStart, 6);
  const monthEnd = endOfMonth(today);

  return [
    {
      label: 'Dziś',
      value: 'today',
      dateFrom: format(today, 'yyyy-MM-dd'),
      dateTo: format(today, 'yyyy-MM-dd'),
    },
    {
      label: 'Jutro',
      value: 'tomorrow',
      dateFrom: format(tomorrow, 'yyyy-MM-dd'),
      dateTo: format(tomorrow, 'yyyy-MM-dd'),
    },
    {
      label: 'Ten weekend',
      value: 'weekend',
      dateFrom: format(saturday, 'yyyy-MM-dd'),
      dateTo: format(sunday, 'yyyy-MM-dd'),
    },
    {
      label: 'Ten miesiąc',
      value: 'month',
      dateFrom: format(today, 'yyyy-MM-dd'),
      dateTo: format(monthEnd, 'yyyy-MM-dd'),
    },
  ];
};

// Sort options
const sortOptions = [
  { value: 'start_date', label: 'Data (najwcześniej)' },
  { value: '-start_date', label: 'Data (najpóźniej)' },
  { value: '-created_at', label: 'Najnowsze' },
];

// Event type options
const eventTypeOptions: { value: EventType | ''; label: string }[] = [
  { value: '', label: 'Wszystkie typy' },
  { value: 'free', label: 'Bezpłatne' },
  { value: 'platform', label: 'Bilety przez platformę' },
  { value: 'paid', label: 'Bilety zewnętrzne' },
  { value: 'voluntary', label: 'Dobrowolna wpłata' },
];

// Polish cities
const cities = [
  'Warszawa', 'Kraków', 'Łódź', 'Wrocław', 'Poznań', 'Gdańsk', 
  'Szczecin', 'Bydgoszcz', 'Lublin', 'Białystok', 'Katowice', 
  'Gdynia', 'Częstochowa', 'Radom', 'Sosnowiec', 'Toruń',
  'Kielce', 'Rzeszów', 'Gliwice', 'Zabrze', 'Olsztyn', 'Opole'
];

function SearchPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Initialize state from URL params
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [selectedCity, setSelectedCity] = useState(searchParams.get('city') || '');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    searchParams.get('categories')?.split(',').filter(Boolean) || []
  );
  const [dateFrom, setDateFrom] = useState(searchParams.get('date_from') || '');
  const [dateTo, setDateTo] = useState(searchParams.get('date_to') || '');
  const [datePreset, setDatePreset] = useState(searchParams.get('preset') || '');
  const [eventType, setEventType] = useState<EventType | ''>(
    (searchParams.get('event_type') as EventType) || ''
  );
  const [onlineOnly, setOnlineOnly] = useState(searchParams.get('online') === 'true');
  const [ordering, setOrdering] = useState(searchParams.get('ordering') || 'start_date');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [citySearch, setCitySearch] = useState('');
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  const datePresets = useMemo(() => getDatePresets(), []);

  // Get categories
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.getCategories,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Build filters object
  const filters: EventFilters = useMemo(() => ({
    search: query || undefined,
    city: selectedCity || undefined,
    categories: selectedCategories.length > 0 
      ? selectedCategories.map(s => parseInt(s)).filter(n => !isNaN(n))
      : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    event_type: eventType || undefined,
    online: onlineOnly || undefined,
    ordering: ordering,
    page: page,
    page_size: 12,
  }), [query, selectedCity, selectedCategories, dateFrom, dateTo, eventType, onlineOnly, ordering, page]);

  // Search events
  const { data: searchResults, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['search', filters],
    queryFn: () => eventsApi.getEvents(filters),
  });

  // Deduplicate events by ID
  const events = useMemo(() => {
    const results = searchResults?.results || [];
    const seen = new Set<number>();
    return results.filter(event => {
      if (seen.has(event.id)) return false;
      seen.add(event.id);
      return true;
    });
  }, [searchResults]);

  usePromotionImpressions(events);
  
  const totalCount = searchResults?.count || 0;
  const totalPages = Math.ceil(totalCount / 12);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (selectedCity) params.set('city', selectedCity);
    if (selectedCategories.length > 0) params.set('categories', selectedCategories.join(','));
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    if (datePreset) params.set('preset', datePreset);
    if (eventType) params.set('event_type', eventType);
    if (onlineOnly) params.set('online', 'true');
    if (ordering !== 'start_date') params.set('ordering', ordering);
    if (page > 1) params.set('page', page.toString());

    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [query, selectedCity, selectedCategories, dateFrom, dateTo, datePreset, eventType, onlineOnly, ordering, page, pathname, router]);

  // Apply date preset
  const applyDatePreset = useCallback((preset: typeof datePresets[0]) => {
    setDatePreset(preset.value);
    setDateFrom(preset.dateFrom);
    setDateTo(preset.dateTo);
    setPage(1);
  }, []);

  // Clear date preset
  const clearDatePreset = useCallback(() => {
    setDatePreset('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }, []);

  // Toggle category
  const toggleCategory = useCallback((categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
    setPage(1);
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setQuery('');
    setSelectedCity('');
    setSelectedCategories([]);
    setDateFrom('');
    setDateTo('');
    setDatePreset('');
    setEventType('');
    setOnlineOnly(false);
    setOrdering('start_date');
    setPage(1);
  }, []);

  const hasActiveFilters = query || selectedCity || selectedCategories.length > 0 || 
    dateFrom || dateTo || eventType || onlineOnly;

  // Filter cities based on search
  const filteredCities = useMemo(() => {
    if (!citySearch) return cities;
    return cities.filter(city => 
      city.toLowerCase().includes(citySearch.toLowerCase())
    );
  }, [citySearch]);

  // Handle search form submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    refetch();
  };

  // Get category name by ID
  const getCategoryName = (id: string) => {
    return categories?.find(c => c.id.toString() === id)?.name || id;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Search Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Znajdź wydarzenia katolickie
            </h1>
            <p className="text-primary-100 text-lg">
              Odkryj rekolekcje, pielgrzymki, koncerty i spotkania w Twojej okolicy
            </p>
          </div>

          {/* Main Search Bar */}
          <form onSubmit={handleSearch} className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-2 md:p-3">
              <div className="flex flex-col md:flex-row gap-2 md:gap-3">
                {/* Text search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Szukaj wydarzeń, rekolekcji, pielgrzymek..."
                    className="w-full pl-12 pr-4 py-3.5 text-lg border-0 focus:ring-2 focus:ring-primary-500 rounded-xl bg-slate-50 focus:bg-white transition-colors"
                  />
                </div>

                {/* City dropdown */}
                <div className="relative md:min-w-[200px]">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
                  <div className="relative">
                    <input
                      type="text"
                      value={citySearch || selectedCity}
                      onChange={(e) => {
                        setCitySearch(e.target.value);
                        setShowCityDropdown(true);
                      }}
                      onFocus={() => setShowCityDropdown(true)}
                      placeholder="Miasto"
                      className="w-full pl-12 pr-10 py-3.5 text-lg border-0 focus:ring-0 rounded-xl bg-slate-50 focus:bg-white transition-colors"
                    />
                    {selectedCity && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCity('');
                          setCitySearch('');
                          setPage(1);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  {showCityDropdown && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setShowCityDropdown(false)} 
                      />
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-slate-200 max-h-60 overflow-y-auto z-20">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCity('');
                            setCitySearch('');
                            setShowCityDropdown(false);
                            setPage(1);
                          }}
                          className="w-full px-4 py-2.5 text-left text-slate-500 hover:bg-slate-50"
                        >
                          Wszystkie miasta
                        </button>
                        {filteredCities.map(city => (
                          <button
                            key={city}
                            type="button"
                            onClick={() => {
                              setSelectedCity(city);
                              setCitySearch('');
                              setShowCityDropdown(false);
                              setPage(1);
                            }}
                            className="w-full px-4 py-2.5 text-left hover:bg-slate-50"
                          >
                            {city}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Search button */}
                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 px-8 py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors"
                >
                  <Search className="w-5 h-5" />
                  <span className="hidden md:inline">Szukaj</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 py-3 overflow-x-auto scrollbar-hide">
            {/* Date Presets */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {datePresets.map(preset => (
                <button
                  key={preset.value}
                  onClick={() => datePreset === preset.value ? clearDatePreset() : applyDatePreset(preset)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    datePreset === preset.value
                      ? 'bg-primary-100 text-primary-700 ring-1 ring-primary-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="h-6 w-px bg-slate-200 flex-shrink-0" />

            {/* More Filters Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                showFilters || hasActiveFilters
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Więcej filtrów
              {hasActiveFilters && (
                <span className="w-5 h-5 rounded-full bg-primary-600 text-white text-xs flex items-center justify-center">
                  {[query, selectedCity, selectedCategories.length > 0, dateFrom || dateTo, eventType, onlineOnly].filter(Boolean).length}
                </span>
              )}
            </button>

            {/* Online Toggle */}
            <button
              onClick={() => { setOnlineOnly(!onlineOnly); setPage(1); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                onlineOnly
                  ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Wifi className="w-4 h-4" />
              Online
            </button>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <>
                <div className="h-6 w-px bg-slate-200 flex-shrink-0" />
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Wyczyść filtry
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Extended Filters Panel */}
      {showFilters && (
        <div className="bg-slate-50 border-b border-slate-200">
          <div className="container mx-auto px-4 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Categories */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  <Tag className="w-4 h-4 inline mr-2" />
                  Kategorie
                </label>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                  {categories?.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => toggleCategory(cat.id.toString())}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        selectedCategories.includes(cat.id.toString())
                          ? 'bg-primary-100 text-primary-700 ring-1 ring-primary-200'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {cat.name}
                      {selectedCategories.includes(cat.id.toString()) && (
                        <X className="w-3 h-3 ml-1 inline" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Event Type */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  Typ wydarzenia
                </label>
                <div className="space-y-2">
                  {eventTypeOptions.map(option => (
                    <label
                      key={option.value}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="eventType"
                        checked={eventType === option.value}
                        onChange={() => { setEventType(option.value); setPage(1); }}
                        className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-slate-600">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Zakres dat
                </label>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Od</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => { setDateFrom(e.target.value); setDatePreset(''); setPage(1); }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Do</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => { setDateTo(e.target.value); setDatePreset(''); setPage(1); }}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Sort */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">
                  <ArrowUpDown className="w-4 h-4 inline mr-2" />
                  Sortowanie
                </label>
                <select
                  value={ordering}
                  onChange={(e) => { setOrdering(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                >
                  {sortOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Section */}
      <div className="container mx-auto px-4 py-8">
        {/* Results Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-slate-900">
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Szukam...
                </span>
              ) : (
                <>
                  Znaleziono <span className="text-primary-600">{totalCount}</span> wydarzeń
                </>
              )}
            </h2>
            {isFetching && !isLoading && (
              <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Sort on mobile */}
            <select
              value={ordering}
              onChange={(e) => { setOrdering(e.target.value); setPage(1); }}
              className="md:hidden px-3 py-2 rounded-lg border border-slate-200 text-sm"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* View mode toggle */}
            <div className="flex border border-slate-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2.5 transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-primary-50 text-primary-600' 
                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                }`}
                title="Widok siatki"
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2.5 transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-primary-50 text-primary-600' 
                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                }`}
                title="Widok listy"
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Active Filters Tags */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mb-6">
            {query && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-full text-sm font-medium">
                <Search className="w-3.5 h-3.5" />
                &quot;{query}&quot;
                <button onClick={() => { setQuery(''); setPage(1); }} className="hover:text-primary-900">
                  <X className="w-4 h-4" />
                </button>
              </span>
            )}
            {selectedCity && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-full text-sm font-medium">
                <MapPin className="w-3.5 h-3.5" />
                {selectedCity}
                <button onClick={() => { setSelectedCity(''); setPage(1); }} className="hover:text-primary-900">
                  <X className="w-4 h-4" />
                </button>
              </span>
            )}
            {selectedCategories.map(catId => (
              <span 
                key={catId}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-full text-sm font-medium"
              >
                <Tag className="w-3.5 h-3.5" />
                {getCategoryName(catId)}
                <button onClick={() => toggleCategory(catId)} className="hover:text-primary-900">
                  <X className="w-4 h-4" />
                </button>
              </span>
            ))}
            {datePreset && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-full text-sm font-medium">
                <Calendar className="w-3.5 h-3.5" />
                {datePresets.find(p => p.value === datePreset)?.label}
                <button onClick={clearDatePreset} className="hover:text-primary-900">
                  <X className="w-4 h-4" />
                </button>
              </span>
            )}
            {!datePreset && (dateFrom || dateTo) && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-full text-sm font-medium">
                <Calendar className="w-3.5 h-3.5" />
                {dateFrom && `od ${format(new Date(dateFrom), 'd MMM', { locale: pl })}`}
                {dateFrom && dateTo && ' – '}
                {dateTo && `do ${format(new Date(dateTo), 'd MMM', { locale: pl })}`}
                <button onClick={() => { setDateFrom(''); setDateTo(''); setPage(1); }} className="hover:text-primary-900">
                  <X className="w-4 h-4" />
                </button>
              </span>
            )}
            {eventType && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-700 rounded-full text-sm font-medium">
                {eventTypeOptions.find(o => o.value === eventType)?.label}
                <button onClick={() => { setEventType(''); setPage(1); }} className="hover:text-primary-900">
                  <X className="w-4 h-4" />
                </button>
              </span>
            )}
            {onlineOnly && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium">
                <Wifi className="w-3.5 h-3.5" />
                Tylko online
                <button onClick={() => { setOnlineOnly(false); setPage(1); }} className="hover:text-emerald-900">
                  <X className="w-4 h-4" />
                </button>
              </span>
            )}
          </div>
        )}

        {/* Results Grid/List */}
        {isLoading ? (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            : 'space-y-4'
          }>
            {[...Array(8)].map((_, i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        ) : events.length > 0 ? (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {events.map((event: EventListItem) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {events.map((event: EventListItem) => (
                  <EventListItemCard key={event.id} event={event} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-12 flex justify-center">
                <nav className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Poprzednia
                  </button>
                  
                  {/* Page numbers */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .map((p, idx, arr) => (
                      <span key={p} className="flex items-center">
                        {idx > 0 && arr[idx - 1] !== p - 1 && (
                          <span className="px-2 text-slate-400">...</span>
                        )}
                        <button
                          onClick={() => setPage(p)}
                          className={`w-10 h-10 rounded-lg font-medium transition-colors ${
                            p === page
                              ? 'bg-primary-600 text-white'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {p}
                        </button>
                      </span>
                    ))
                  }
                  
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Następna
                  </button>
                </nav>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-100 flex items-center justify-center">
              <Search className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-3">
              Brak wyników
            </h3>
            <p className="text-slate-500 mb-6 max-w-md mx-auto">
              Nie znaleziono wydarzeń spełniających podane kryteria. 
              Spróbuj zmienić filtry lub wyszukaj coś innego.
            </p>
            {hasActiveFilters && (
              <button 
                onClick={clearFilters} 
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Wyczyść filtry i szukaj ponownie
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// List view event card
function EventListItemCard({ event }: { event: EventListItem }) {
  const formattedDate = format(new Date(event.start_date), 'd MMMM yyyy, HH:mm', { locale: pl });
  
  const promotionBadges = {
    gold: { label: 'Wyróżnione', className: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-900' },
    silver: { label: 'Promowane', className: 'bg-gradient-to-r from-slate-300 to-slate-400 text-slate-800' },
    bronze: { label: 'Promowane', className: 'bg-gradient-to-r from-orange-300 to-orange-400 text-orange-900' },
  };

  return (
    <Link
      href={`/wydarzenia/${event.slug}`}
      className="block bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md hover:border-slate-200 transition-all group"
    >
      <div className="flex flex-col sm:flex-row">
        {/* Image */}
        <div className="relative sm:w-48 md:w-56 h-40 sm:h-auto flex-shrink-0">
          {event.image_thumbnail ? (
            <Image
              src={event.image_thumbnail}
              alt={event.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 640px) 100vw, 224px"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
              <Calendar className="w-10 h-10 text-primary-400" />
            </div>
          )}
          
          {/* Promotion badge */}
          {event.promotion_level && (
            <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-semibold ${promotionBadges[event.promotion_level].className}`}>
              {promotionBadges[event.promotion_level].label}
            </div>
          )}
          
          {/* Online badge */}
          {event.online_event && (
            <div className="absolute top-2 right-2 px-2 py-1 bg-emerald-500 text-white rounded-full text-xs font-semibold flex items-center gap-1">
              <Wifi className="w-3 h-3" />
              Online
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between">
          <div>
            {/* Categories */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {event.categories.slice(0, 3).map(cat => (
                <span 
                  key={cat.id}
                  className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium"
                >
                  {cat.name}
                </span>
              ))}
            </div>
            
            {/* Title */}
            <h3 className="font-semibold text-lg text-slate-900 group-hover:text-primary-600 transition-colors line-clamp-2 mb-2">
              {event.title}
            </h3>
          </div>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {formattedDate}
            </span>
            {event.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                {event.location.city}
                {event.location.region && `, ${event.location.region}`}
              </span>
            )}
            {event.event_type === 'free' && (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                Bezpłatne
              </span>
            )}
            {event.event_type === 'voluntary' && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                Dobrowolna wpłata
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

// Main export with Suspense boundary
export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 py-12">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center mb-8">
              <div className="h-10 w-64 mx-auto bg-white/20 rounded-lg animate-pulse mb-3" />
              <div className="h-6 w-96 mx-auto bg-white/10 rounded-lg animate-pulse" />
            </div>
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-2xl shadow-xl p-6 h-20 animate-pulse" />
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}
