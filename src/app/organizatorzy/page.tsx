'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Building2, Search, Calendar, Star, Users,
  ChevronDown, ChevronLeft, ChevronRight, Grid, List,
  Crown, Medal, Award, BadgeCheck, ArrowUpDown
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { apiClient } from '@/lib/api/client';

interface Organizer {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
  description: string | null;
  verified: boolean;
  events_count: number;
  average_rating: number | null;
  ratings_count: number;
  ranking_position?: number;
  created_at: string;
}

interface OrganizersResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Organizer[];
}

type SortOption = 'events' | 'rating' | 'newest';

export default function OrganizersListPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('events');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Fetch organizers
  const { data, isLoading, error } = useQuery<OrganizersResponse>({
    queryKey: ['organizers', searchQuery, sortBy, currentPage],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        page: currentPage,
        page_size: pageSize,
      };
      if (searchQuery) params.search = searchQuery;
      
      // Map sort options to API ordering
      switch (sortBy) {
        case 'events':
          params.ordering = '-events_count';
          break;
        case 'rating':
          params.ordering = '-average_rating';
          break;
        case 'newest':
          params.ordering = '-created_at';
          break;
      }
      
      const response = await apiClient.get('/organizers/', { params });
      return response.data;
    },
  });

  const organizers = data?.results || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Filter organizers by search query (client-side for immediate feedback)
  const filteredOrganizers = useMemo(() => {
    if (!searchQuery.trim()) return organizers;
    const query = searchQuery.toLowerCase();
    return organizers.filter(org => 
      org.name.toLowerCase().includes(query)
    );
  }, [organizers, searchQuery]);

  // Get ranking badge for top 3
  const getRankingBadge = (position: number) => {
    switch (position) {
      case 1:
        return (
          <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-white rounded-full text-xs font-bold shadow-sm">
            <Crown className="w-3.5 h-3.5" />
            <span>#1</span>
          </div>
        );
      case 2:
        return (
          <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800 rounded-full text-xs font-bold shadow-sm">
            <Medal className="w-3.5 h-3.5" />
            <span>#2</span>
          </div>
        );
      case 3:
        return (
          <div className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-full text-xs font-bold shadow-sm">
            <Award className="w-3.5 h-3.5" />
            <span>#3</span>
          </div>
        );
      default:
        return position <= 10 ? (
          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
            #{position}
          </span>
        ) : null;
    }
  };

  // Render star rating
  const renderStars = (rating: number | null, count: number) => {
    const displayRating = rating || 0;
    const fullStars = Math.floor(displayRating);
    const hasHalfStar = displayRating % 1 >= 0.5;
    
    return (
      <div className="flex items-center gap-1.5">
        <div className="flex items-center">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${
                i < fullStars
                  ? 'text-yellow-400 fill-yellow-400'
                  : i === fullStars && hasHalfStar
                  ? 'text-yellow-400 fill-yellow-400/50'
                  : 'text-gray-300'
              }`}
            />
          ))}
        </div>
        <span className="text-sm text-gray-600">
          {displayRating > 0 ? displayRating.toFixed(1) : '-'}
        </span>
        <span className="text-sm text-gray-400">({count})</span>
      </div>
    );
  };

  // Truncate description
  const truncateDescription = (text: string | null, maxLength: number = 100) => {
    if (!text) return 'Brak opisu';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '...';
  };

  // Handle search with debounce reset of page
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  // Handle sort change
  const handleSortChange = (value: SortOption) => {
    setSortBy(value);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Organizatorzy wydarzeń</h1>
          </div>
          <p className="text-gray-600 ml-13">
            Poznaj organizatorów katolickich wydarzeń. Sprawdź ich oceny i historię wydarzeń.
          </p>
        </div>

        {/* Filters Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Szukaj po nazwie organizatora..."
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              {/* Sort Dropdown */}
              <div className="relative min-w-[200px]">
                <ArrowUpDown className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value as SortOption)}
                  className="w-full pl-11 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all cursor-pointer"
                >
                  <option value="events">Według liczby wydarzeń</option>
                  <option value="rating">Według oceny</option>
                  <option value="newest">Najnowsi</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              {/* View Mode Toggle */}
              <div className="flex bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-3 transition-all ${
                    viewMode === 'grid' 
                      ? 'bg-primary-600 text-white' 
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                  title="Widok siatki"
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-3 transition-all ${
                    viewMode === 'list' 
                      ? 'bg-primary-600 text-white' 
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                  title="Widok listy"
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Results count */}
          {!isLoading && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Znaleziono <span className="font-semibold text-gray-700">{totalCount}</span> organizatorów
              </p>
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'space-y-4'
          }>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 bg-gray-200 rounded-xl flex-shrink-0" />
                  <div className="flex-1">
                    <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-2/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl border border-red-100 p-12 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Wystąpił błąd</h3>
            <p className="text-gray-500">Nie udało się pobrać listy organizatorów. Spróbuj ponownie później.</p>
          </div>
        ) : filteredOrganizers.length > 0 ? (
          <>
            {/* Grid View */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredOrganizers.map((organizer, index) => {
                  const rankingPosition = (currentPage - 1) * pageSize + index + 1;
                  return (
                    <div
                      key={organizer.id}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-primary-200 transition-all duration-300 overflow-hidden group"
                    >
                      <div className="p-6">
                        {/* Header with Logo and Ranking */}
                        <div className="flex items-start gap-4 mb-4">
                          {/* Logo */}
                          <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-50 flex-shrink-0 border border-gray-100">
                            {organizer.logo ? (
                              <Image
                                src={organizer.logo}
                                alt={organizer.name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Building2 className="w-10 h-10 text-gray-300" />
                              </div>
                            )}
                          </div>

                          {/* Name and Badge */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h3 className="font-bold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-2 leading-tight">
                                {organizer.name}
                              </h3>
                              {sortBy === 'events' && getRankingBadge(rankingPosition)}
                            </div>
                            {organizer.verified && (
                              <div className="flex items-center gap-1 text-blue-600">
                                <BadgeCheck className="w-4 h-4" />
                                <span className="text-xs font-medium">Zweryfikowany</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Rating */}
                        <div className="mb-3">
                          {renderStars(organizer.average_rating, organizer.ratings_count)}
                        </div>

                        {/* Events Count */}
                        <div className="flex items-center gap-2 text-gray-600 mb-3">
                          <Calendar className="w-4 h-4" />
                          <span className="text-sm">
                            <span className="font-semibold">{organizer.events_count}</span> wydarzeń
                          </span>
                        </div>

                        {/* Description */}
                        <p className="text-sm text-gray-500 line-clamp-2 mb-4">
                          {truncateDescription(organizer.description, 80)}
                        </p>

                        {/* Action Button */}
                        <Link
                          href={`/organizatorzy/${organizer.slug}`}
                          className="block w-full py-2.5 px-4 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white text-center rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                          Zobacz profil
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* List View */
              <div className="space-y-4">
                {filteredOrganizers.map((organizer, index) => {
                  const rankingPosition = (currentPage - 1) * pageSize + index + 1;
                  return (
                    <div
                      key={organizer.id}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-primary-200 transition-all duration-300 p-6 group"
                    >
                      <div className="flex flex-col md:flex-row md:items-center gap-4">
                        {/* Logo */}
                        <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-50 flex-shrink-0 border border-gray-100">
                          {organizer.logo ? (
                            <Image
                              src={organizer.logo}
                              alt={organizer.name}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Building2 className="w-12 h-12 text-gray-300" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                              {organizer.name}
                            </h3>
                            {organizer.verified && (
                              <div className="flex items-center gap-1 text-blue-600">
                                <BadgeCheck className="w-4 h-4" />
                                <span className="text-xs font-medium">Zweryfikowany</span>
                              </div>
                            )}
                            {sortBy === 'events' && getRankingBadge(rankingPosition)}
                          </div>

                          <div className="flex flex-wrap items-center gap-4 mb-2">
                            {renderStars(organizer.average_rating, organizer.ratings_count)}
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <Calendar className="w-4 h-4" />
                              <span className="text-sm">
                                <span className="font-semibold">{organizer.events_count}</span> wydarzeń
                              </span>
                            </div>
                          </div>

                          <p className="text-sm text-gray-500 line-clamp-2">
                            {truncateDescription(organizer.description, 150)}
                          </p>
                        </div>

                        {/* Action */}
                        <div className="flex-shrink-0">
                          <Link
                            href={`/organizatorzy/${organizer.slug}`}
                            className="inline-flex items-center justify-center py-2.5 px-6 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-xl font-medium transition-all duration-200 shadow-sm hover:shadow-md whitespace-nowrap"
                          >
                            Zobacz profil
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-sm text-gray-500">
                  Strona {currentPage} z {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-1 px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Poprzednia</span>
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-10 h-10 rounded-xl font-medium transition-all ${
                            currentPage === pageNum
                              ? 'bg-primary-600 text-white shadow-md'
                              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="flex items-center gap-1 px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <span className="hidden sm:inline">Następna</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Empty State */
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Brak wyników</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              {searchQuery
                ? `Nie znaleziono organizatorów pasujących do "${searchQuery}"`
                : 'Brak organizatorów do wyświetlenia. Sprawdź ponownie później.'
              }
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 px-6 py-2 bg-primary-50 text-primary-600 rounded-xl font-medium hover:bg-primary-100 transition-colors"
              >
                Wyczyść wyszukiwanie
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
