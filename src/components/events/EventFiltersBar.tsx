'use client';

import { useState, useCallback } from 'react';
import { Search, MapPin, Calendar, Filter, X, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import type { EventFilters, Category } from '@/types';

interface EventFiltersBarProps {
  filters: EventFilters;
  onFiltersChange: (filters: EventFilters) => void;
  categories?: Category[];
  cities?: string[];
}

export function EventFiltersBar({
  filters,
  onFiltersChange,
  categories = [],
  cities = [],
}: EventFiltersBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const updateFilter = useCallback(
    (key: keyof EventFilters, value: string | number | boolean | undefined) => {
      const newFilters = { ...filters, [key]: value, page: 1 };
      if (value === '' || value === undefined) {
        delete newFilters[key];
      }
      onFiltersChange(newFilters);
    },
    [filters, onFiltersChange]
  );

  const clearFilters = useCallback(() => {
    onFiltersChange({});
  }, [onFiltersChange]);

  const hasActiveFilters = Object.keys(filters).some(
    (key) => key !== 'page' && key !== 'page_size' && filters[key as keyof EventFilters]
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
      {/* Main filter row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Szukaj wydarzeń..."
            value={filters.search || ''}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="input pl-10"
          />
        </div>

        {/* City select */}
        <div className="relative sm:w-48">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <select
            value={filters.city || ''}
            onChange={(e) => updateFilter('city', e.target.value)}
            className="input pl-10 appearance-none cursor-pointer"
          >
            <option value="">Wszystkie miasta</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>

        {/* Date filter button */}
        <button
          onClick={() => setShowDatePicker(!showDatePicker)}
          className={clsx(
            'btn-secondary sm:w-48 justify-start',
            (filters.date_from || filters.date_to) && 'ring-2 ring-primary-500'
          )}
        >
          <Calendar className="w-4 h-4" />
          <span>
            {filters.date_from
              ? `Od ${filters.date_from}`
              : filters.date_to
              ? `Do ${filters.date_to}`
              : 'Wybierz datę'}
          </span>
        </button>

        {/* More filters button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={clsx('btn-secondary', isExpanded && 'bg-primary-50 text-primary-600')}
        >
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">Filtry</span>
          {hasActiveFilters && (
            <span className="w-5 h-5 bg-primary-600 text-white rounded-full text-xs flex items-center justify-center">
              {Object.keys(filters).filter(
                (k) => k !== 'page' && k !== 'page_size' && filters[k as keyof EventFilters]
              ).length}
            </span>
          )}
        </button>
      </div>

      {/* Date picker dropdown */}
      {showDatePicker && (
        <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="label">Od daty</label>
              <input
                type="date"
                value={filters.date_from || ''}
                onChange={(e) => updateFilter('date_from', e.target.value)}
                className="input"
              />
            </div>
            <div className="flex-1">
              <label className="label">Do daty</label>
              <input
                type="date"
                value={filters.date_to || ''}
                onChange={(e) => updateFilter('date_to', e.target.value)}
                className="input"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  updateFilter('date_from', undefined);
                  updateFilter('date_to', undefined);
                  setShowDatePicker(false);
                }}
                className="btn-ghost"
              >
                Wyczyść
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expanded filters */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Category */}
            <div>
              <label className="label">Kategoria</label>
              <select
                value={filters.category || ''}
                onChange={(e) => updateFilter('category', e.target.value ? Number(e.target.value) : undefined)}
                className="input"
              >
                <option value="">Wszystkie kategorie</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Event type */}
            <div>
              <label className="label">Typ wydarzenia</label>
              <select
                value={filters.event_type || ''}
                onChange={(e) => updateFilter('event_type', e.target.value || undefined)}
                className="input"
              >
                <option value="">Wszystkie typy</option>
                <option value="free">Darmowe</option>
                <option value="voluntary">Dobrowolna opłata</option>
                <option value="platform">Bilety przez platformę</option>
                <option value="paid">Płatne</option>
              </select>
            </div>

            {/* Online filter */}
            <div>
              <label className="label">Format</label>
              <select
                value={filters.online === true ? 'online' : filters.online === false ? 'offline' : ''}
                onChange={(e) => {
                  const val = e.target.value;
                  updateFilter('online', val === 'online' ? true : val === 'offline' ? false : undefined);
                }}
                className="input"
              >
                <option value="">Wszystkie formaty</option>
                <option value="offline">Stacjonarne</option>
                <option value="online">Online</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="label">Sortowanie</label>
              <select
                value={filters.ordering || ''}
                onChange={(e) => updateFilter('ordering', e.target.value || undefined)}
                className="input"
              >
                <option value="">Domyślne</option>
                <option value="start_date">Data (rosnąco)</option>
                <option value="-start_date">Data (malejąco)</option>
                <option value="title">Alfabetycznie (A-Z)</option>
                <option value="-title">Alfabetycznie (Z-A)</option>
                <option value="-created_at">Najnowsze</option>
              </select>
            </div>
          </div>

          {/* Clear all button */}
          {hasActiveFilters && (
            <div className="mt-4 flex justify-end">
              <button onClick={clearFilters} className="btn-ghost text-red-600 hover:bg-red-50">
                <X className="w-4 h-4" />
                Wyczyść wszystkie filtry
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
