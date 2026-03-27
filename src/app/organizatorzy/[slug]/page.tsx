'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import { 
  Calendar, MapPin, Globe, Mail, Phone,
  Facebook, Instagram, Star, ChevronRight, ChevronLeft,
  Building2, Clock, ExternalLink, Edit, Crown, Medal,
  Tag, MessageCircle, Send, Trash2, Reply, Youtube, Twitter,
  Video
} from 'lucide-react';
import Link from 'next/link';
import { notFound, useParams, useSearchParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import { EventListItem } from '@/types';

// Types
interface Organizer {
  id: number;
  user_id: number;
  name: string;
  slug: string;
  description: string;
  logo: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  facebook: string | null;
  instagram: string | null;
  youtube: string | null;
  twitter: string | null;
  city: string;
  verified: boolean;
  events_count: number;
  upcoming_count: number;
  followers_count: number;
  ranking_position: number | null;
  review_stats: {
    avg_rating: number;
    total_reviews: number;
  };
  categories: Array<{ id: number; name: string }>;
  created_at: string;
  can_edit: boolean;
}

interface Review {
  id: number;
  user: {
    id: number;
    first_name: string;
    last_name: string;
  };
  rating: number;
  comment: string;
  organizer_response: string | null;
  response_at: string | null;
  created_at: string;
}

interface ReviewsResponse {
  count: number;
  total_pages: number;
  current_page: number;
  results: Review[];
  can_add_review: boolean;
  user_review: Review | null;
}

// Star Rating Input Component
function StarRatingInput({ 
  value, 
  onChange 
}: { 
  value: number; 
  onChange: (rating: number) => void;
}) {
  const [hoverValue, setHoverValue] = useState(0);

  return (
    <div className="flex flex-row-reverse justify-end gap-1">
      {[5, 4, 3, 2, 1].map((star) => (
        <button
          key={star}
          type="button"
          className="p-1 transition-colors"
          onMouseEnter={() => setHoverValue(star)}
          onMouseLeave={() => setHoverValue(0)}
          onClick={() => onChange(star)}
        >
          <Star
            className={`w-8 h-8 ${
              (hoverValue || value) >= star
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300'
            } transition-colors`}
          />
        </button>
      ))}
    </div>
  );
}

// Star Rating Display Component
function StarRating({ rating, size = 'md' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClasses[size]} ${
            star <= rating
              ? 'text-yellow-400 fill-yellow-400'
              : star - 0.5 <= rating
              ? 'text-yellow-400 fill-yellow-400/50'
              : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  );
}

// Ranking Badge Component
function RankingBadge({ position }: { position: number }) {
  if (position === 1) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-100 to-amber-100 rounded-xl">
        <Crown className="w-6 h-6 text-yellow-500" />
        <div>
          <p className="text-lg font-bold text-yellow-600">1. miejsce</p>
          <p className="text-xs text-yellow-600/80">w rankingu</p>
        </div>
      </div>
    );
  }
  if (position === 2) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-100 to-slate-100 rounded-xl">
        <Medal className="w-6 h-6 text-gray-400" />
        <div>
          <p className="text-lg font-bold text-gray-500">2. miejsce</p>
          <p className="text-xs text-gray-500/80">w rankingu</p>
        </div>
      </div>
    );
  }
  if (position === 3) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-100 to-orange-100 rounded-xl">
        <Medal className="w-6 h-6 text-amber-600" />
        <div>
          <p className="text-lg font-bold text-amber-700">3. miejsce</p>
          <p className="text-xs text-amber-700/80">w rankingu</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-xl">
      <span className="text-lg font-bold text-gray-600">#{position}</span>
      <p className="text-xs text-gray-500">w rankingu</p>
    </div>
  );
}

// Review Item Component
function ReviewItem({
  review,
  isOwner,
  isOrganizer,
  onDelete,
  onRespond,
}: {
  review: Review;
  isOwner: boolean;
  isOrganizer: boolean;
  onDelete: (id: number) => void;
  onRespond: (id: number, response: string) => void;
}) {
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initials = `${review.user.first_name.charAt(0)}${review.user.last_name.charAt(0)}`.toUpperCase();

  const handleSubmitResponse = async () => {
    if (!responseText.trim()) return;
    setIsSubmitting(true);
    await onRespond(review.id, responseText);
    setIsSubmitting(false);
    setShowResponseForm(false);
    setResponseText('');
  };

  return (
    <div className="border-b border-gray-100 py-5 last:border-b-0">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold text-sm">
            {initials}
          </div>
          <div>
            <h5 className="font-medium text-gray-900">
              {review.user.first_name} {review.user.last_name.charAt(0)}.
            </h5>
            <span className="text-sm text-gray-500">
              {format(parseISO(review.created_at), 'd.MM.yyyy', { locale: pl })}
            </span>
          </div>
        </div>
        <StarRating rating={review.rating} size="sm" />
      </div>

      <p className="text-gray-600 leading-relaxed mb-3 whitespace-pre-line">
        {review.comment}
      </p>

      {isOwner && (
        <div className="mb-3">
          <button
            onClick={() => {
              if (confirm('Czy na pewno chcesz usunąć swoją opinię?')) {
                onDelete(review.id);
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Usuń
          </button>
        </div>
      )}

      {/* Organizer Response */}
      {review.organizer_response && (
        <div className="mt-4 bg-blue-50 border-l-4 border-blue-600 rounded-r-lg p-4">
          <div className="flex items-center gap-2 mb-2 text-blue-800 font-semibold text-sm">
            <Reply className="w-4 h-4" />
            Odpowiedź organizatora
            {review.response_at && (
              <span className="font-normal text-blue-600/80">
                ({format(parseISO(review.response_at), 'd.MM.yyyy', { locale: pl })})
              </span>
            )}
          </div>
          <p className="text-gray-700 text-sm whitespace-pre-line">
            {review.organizer_response}
          </p>
        </div>
      )}

      {/* Response Form for Organizer */}
      {isOrganizer && !review.organizer_response && (
        <div className="mt-4">
          {showResponseForm ? (
            <div className="space-y-3">
              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Napisz odpowiedź na tę opinię..."
                className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                maxLength={1000}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSubmitResponse}
                  disabled={isSubmitting || !responseText.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Reply className="w-4 h-4" />
                  {isSubmitting ? 'Wysyłanie...' : 'Odpowiedz'}
                </button>
                <button
                  onClick={() => {
                    setShowResponseForm(false);
                    setResponseText('');
                  }}
                  className="px-4 py-2 text-gray-600 text-sm hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Anuluj
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowResponseForm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Reply className="w-4 h-4" />
              Odpowiedz
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Pagination Component
function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    
    // Always show first page
    pages.push(1);
    
    if (currentPage > 3) {
      pages.push('ellipsis');
    }
    
    // Pages around current
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      if (!pages.includes(i)) {
        pages.push(i);
      }
    }
    
    if (currentPage < totalPages - 2) {
      pages.push('ellipsis');
    }
    
    // Always show last page
    if (totalPages > 1 && !pages.includes(totalPages)) {
      pages.push(totalPages);
    }
    
    return pages;
  };

  return (
    <div className="flex justify-center items-center gap-1 mt-6 flex-wrap">
      {currentPage > 1 && (
        <button
          onClick={() => onPageChange(currentPage - 1)}
          className="p-2 text-blue-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      
      {getPageNumbers().map((page, index) => (
        page === 'ellipsis' ? (
          <span key={`ellipsis-${index}`} className="px-2 text-gray-500">...</span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`min-w-[36px] h-9 px-3 rounded-lg text-sm font-medium transition-colors ${
              page === currentPage
                ? 'bg-blue-800 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-blue-800 hover:text-white'
            }`}
          >
            {page}
          </button>
        )
      ))}
      
      {currentPage < totalPages && (
        <button
          onClick={() => onPageChange(currentPage + 1)}
          className="p-2 text-blue-800 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

export default function OrganizerProfilePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const slug = params.slug as string;
  const reviewPage = parseInt(searchParams.get('review_page') || '1', 10);
  
  const { user, isAuthenticated } = useAuth();
  
  // Form state
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  // Fetch organizer data
  const { data: organizer, isLoading: isLoadingOrganizer, error } = useQuery({
    queryKey: ['organizer', slug],
    queryFn: async () => {
      const response = await apiClient.get(`/organizers/${slug}/`);
      return response.data as Organizer;
    },
  });

  // Fetch organizer events
  const { data: eventsData, isLoading: isLoadingEvents } = useQuery({
    queryKey: ['organizer-events', slug],
    queryFn: async () => {
      const response = await apiClient.get(`/events/`, {
        params: { organizer: slug, page_size: 6, upcoming: true }
      });
      return response.data;
    },
    enabled: !!organizer,
  });

  // Fetch reviews
  const { data: reviewsData, isLoading: isLoadingReviews } = useQuery({
    queryKey: ['organizer-reviews', slug, reviewPage],
    queryFn: async () => {
      const response = await apiClient.get(`/organizers/${slug}/reviews/`, {
        params: { page: reviewPage }
      });
      return response.data as ReviewsResponse;
    },
    enabled: !!organizer,
  });

  // Add review mutation
  const addReviewMutation = useMutation({
    mutationFn: async (data: { rating: number; comment: string }) => {
      const response = await apiClient.post(`/organizers/${slug}/reviews/`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Opinia została dodana');
      queryClient.invalidateQueries({ queryKey: ['organizer-reviews', slug] });
      queryClient.invalidateQueries({ queryKey: ['organizer', slug] });
      setRating(0);
      setComment('');
    },
    onError: () => {
      toast.error('Nie udało się dodać opinii');
    },
  });

  // Delete review mutation
  const deleteReviewMutation = useMutation({
    mutationFn: async (reviewId: number) => {
      await apiClient.delete(`/organizers/${slug}/reviews/${reviewId}/`);
    },
    onSuccess: () => {
      toast.success('Opinia została usunięta');
      queryClient.invalidateQueries({ queryKey: ['organizer-reviews', slug] });
      queryClient.invalidateQueries({ queryKey: ['organizer', slug] });
    },
    onError: () => {
      toast.error('Nie udało się usunąć opinii');
    },
  });

  // Respond to review mutation
  const respondToReviewMutation = useMutation({
    mutationFn: async ({ reviewId, response }: { reviewId: number; response: string }) => {
      const res = await apiClient.post(`/organizers/${slug}/reviews/${reviewId}/respond/`, { response });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Odpowiedź została dodana');
      queryClient.invalidateQueries({ queryKey: ['organizer-reviews', slug] });
    },
    onError: () => {
      toast.error('Nie udało się dodać odpowiedzi');
    },
  });

  const handlePageChange = useCallback((page: number) => {
    router.push(`/organizatorzy/${slug}?review_page=${page}#opinie`, { scroll: false });
  }, [router, slug]);

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating || !comment.trim()) {
      toast.error('Wypełnij wszystkie pola');
      return;
    }
    addReviewMutation.mutate({ rating, comment });
  };

  const handleDeleteReview = (reviewId: number) => {
    deleteReviewMutation.mutate(reviewId);
  };

  const handleRespondToReview = (reviewId: number, response: string) => {
    respondToReviewMutation.mutate({ reviewId, response });
  };

  if (error) {
    notFound();
  }

  const events = eventsData?.results || [];
  const reviews = reviewsData?.results || [];
  const canAddReview = reviewsData?.can_add_review ?? false;
  const userReview = reviewsData?.user_review;
  const isOrganizer = organizer && user?.id === organizer.user_id;

  if (isLoadingOrganizer) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-blue-900 to-blue-800 py-12">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-32 h-32 bg-white/20 rounded-xl animate-pulse" />
              <div className="flex-1 space-y-3">
                <div className="h-8 bg-white/20 rounded w-1/3" />
                <div className="h-4 bg-white/20 rounded w-1/4" />
              </div>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-xl shadow-sm p-6 h-48 animate-pulse" />
            </div>
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl shadow-sm p-6 h-64 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!organizer) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 py-8 md:py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-start gap-6">
            {/* Logo with Verified Badge */}
            <div className="relative flex-shrink-0">
              <div className="w-28 h-28 md:w-32 md:h-32 rounded-xl overflow-hidden bg-white shadow-lg">
                {organizer.logo ? (
                  <img
                    src={organizer.logo}
                    alt={organizer.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100">
                    <Building2 className="w-12 h-12" />
                  </div>
                )}
              </div>
              {organizer.verified && (
                <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-2 rounded-full shadow-lg" title="Zweryfikowany organizator">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>

            {/* Organizer Info */}
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3 flex-wrap">
                    {organizer.name}
                    {organizer.verified && (
                      <span className="text-sm font-normal bg-green-500/20 text-green-200 px-3 py-1 rounded-full">
                        Zweryfikowany
                      </span>
                    )}
                  </h1>
                </div>

                {/* Edit Button (for owner) */}
                {isOrganizer && (
                  <Link
                    href="/profil"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    Edytuj profil
                  </Link>
                )}
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-4 mt-6">
                {organizer.ranking_position && (
                  <RankingBadge position={organizer.ranking_position} />
                )}
                <div className="px-4 py-2 bg-white/10 rounded-xl">
                  <p className="text-2xl font-bold text-white">{organizer.events_count}</p>
                  <p className="text-sm text-white/80">Wydarzeń</p>
                </div>
                <div className="px-4 py-2 bg-white/10 rounded-xl">
                  <p className="text-2xl font-bold text-white">{organizer.upcoming_count || 0}</p>
                  <p className="text-sm text-white/80">Nadchodzących</p>
                </div>
              </div>

              {/* Social Media Links */}
              <div className="flex flex-wrap gap-2 mt-6">
                {organizer.website && (
                  <a
                    href={organizer.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                    title="Strona internetowa"
                  >
                    <Globe className="w-5 h-5" />
                  </a>
                )}
                {organizer.facebook && (
                  <a
                    href={organizer.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    title="Facebook"
                  >
                    <Facebook className="w-5 h-5" />
                  </a>
                )}
                {organizer.instagram && (
                  <a
                    href={organizer.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg transition-colors"
                    title="Instagram"
                  >
                    <Instagram className="w-5 h-5" />
                  </a>
                )}
                {organizer.youtube && (
                  <a
                    href={organizer.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    title="YouTube"
                  >
                    <Youtube className="w-5 h-5" />
                  </a>
                )}
                {organizer.twitter && (
                  <a
                    href={organizer.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 bg-black hover:bg-gray-800 text-white rounded-lg transition-colors"
                    title="Twitter/X"
                  >
                    <Twitter className="w-5 h-5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar (Left Column) */}
          <aside className="lg:col-span-1 space-y-6">
            {/* About Card */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-blue-900 mb-4">
                <MessageCircle className="w-5 h-5" />
                O organizatorze
              </h3>
              <div className="prose prose-gray prose-sm max-w-none">
                <p className="text-gray-600 whitespace-pre-line leading-relaxed">
                  {organizer.description || 'Brak opisu.'}
                </p>
              </div>
            </div>

            {/* Contact Card */}
            {(organizer.email || organizer.phone || organizer.website) && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-blue-900 mb-4">
                  <Phone className="w-5 h-5" />
                  Kontakt
                </h3>
                <ul className="space-y-3">
                  {organizer.email && (
                    <li>
                      <a
                        href={`mailto:${organizer.email}`}
                        className="flex items-center gap-3 text-gray-600 hover:text-blue-600 transition-colors"
                      >
                        <Mail className="w-5 h-5 text-gray-400" />
                        <span className="text-sm">{organizer.email}</span>
                      </a>
                    </li>
                  )}
                  {organizer.phone && (
                    <li>
                      <a
                        href={`tel:${organizer.phone}`}
                        className="flex items-center gap-3 text-gray-600 hover:text-blue-600 transition-colors"
                      >
                        <Phone className="w-5 h-5 text-gray-400" />
                        <span className="text-sm">{organizer.phone}</span>
                      </a>
                    </li>
                  )}
                  {organizer.website && (
                    <li>
                      <a
                        href={organizer.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 text-gray-600 hover:text-blue-600 transition-colors"
                      >
                        <Globe className="w-5 h-5 text-gray-400" />
                        <span className="text-sm truncate flex items-center gap-1">
                          {organizer.website.replace(/^https?:\/\//, '').substring(0, 30)}
                          {organizer.website.length > 30 && '...'}
                          <ExternalLink className="w-3 h-3" />
                        </span>
                      </a>
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Categories Card */}
            {organizer.categories && organizer.categories.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-blue-900 mb-4">
                  <Tag className="w-5 h-5" />
                  Kategorie wydarzeń
                </h3>
                <div className="flex flex-wrap gap-2">
                  {organizer.categories.map((category) => (
                    <span
                      key={category.id}
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 text-sm rounded-full"
                    >
                      {category.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Member Since */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3 text-gray-600">
                <Clock className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Na platformie od</p>
                  <p className="font-medium text-gray-900">
                    {format(parseISO(organizer.created_at), 'LLLL yyyy', { locale: pl })}
                  </p>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content (Right Column) */}
          <main className="lg:col-span-2 space-y-6">
            {/* Upcoming Events Section */}
            <section className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="flex items-center gap-2 text-xl font-semibold text-blue-900">
                  <Calendar className="w-6 h-6" />
                  Nadchodzące wydarzenia
                </h2>
                {organizer.events_count > 6 && (
                  <Link
                    href={`/wydarzenia?organizer=${organizer.slug}`}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                  >
                    Zobacz wszystkie
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                )}
              </div>

              {isLoadingEvents ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-40 bg-gray-200 rounded-lg mb-2" />
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                    </div>
                  ))}
                </div>
              ) : events.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {events.map((event: EventListItem) => (
                    <Link
                      key={event.id}
                      href={`/wydarzenia/${event.slug}`}
                      className="group block bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-lg transition-all"
                    >
                      <div className="relative h-32">
                        {event.image_thumbnail ? (
                          <img
                            src={event.image_thumbnail}
                            alt={event.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                            <Calendar className="w-10 h-10" />
                          </div>
                        )}
                        {/* Date Badge */}
                        <div className="absolute top-3 left-3 bg-white rounded-lg px-2 py-1 shadow-md text-center">
                          <p className="text-lg font-bold text-blue-900 leading-none">
                            {format(parseISO(event.start_date), 'd')}
                          </p>
                          <p className="text-xs text-gray-500 uppercase">
                            {format(parseISO(event.start_date), 'MMM', { locale: pl })}
                          </p>
                        </div>
                        {event.is_promoted && (
                          <span className="absolute top-3 right-3 bg-amber-500 text-white text-xs px-2 py-1 rounded-full">
                            Promowane
                          </span>
                        )}
                      </div>
                      <div className="p-4">
                        <h4 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                          {event.title}
                        </h4>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {format(parseISO(event.start_date), 'HH:mm')}
                          </span>
                          {event.location ? (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {event.location.city}
                            </span>
                          ) : event.online_event && (
                            <span className="flex items-center gap-1 text-green-600">
                              <Video className="w-4 h-4" />
                              Online
                            </span>
                          )}
                        </div>
                        <div className="mt-3">
                          {event.event_type === 'free' ? (
                            <span className="text-green-600 font-medium text-sm">Bezpłatne</span>
                          ) : event.event_type === 'voluntary' ? (
                            <span className="text-amber-600 font-medium text-sm">Dobrowolna opłata</span>
                          ) : event.event_type === 'paid' ? (
                            <span className="text-blue-600 font-medium text-sm">Płatne</span>
                          ) : null}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg">Brak nadchodzących wydarzeń</p>
                </div>
              )}
            </section>

            {/* Reviews Section */}
            <section id="opinie" className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h2 className="flex items-center gap-2 text-xl font-semibold text-blue-900">
                  <Star className="w-6 h-6" />
                  Opinie o organizatorze
                </h2>
                <div className="flex items-center gap-3">
                  {organizer.review_stats.total_reviews > 0 ? (
                    <>
                      <StarRating rating={organizer.review_stats.avg_rating} />
                      <span className="text-xl font-bold text-gray-900">
                        {organizer.review_stats.avg_rating.toFixed(1)}
                      </span>
                      <span className="text-gray-500">
                        ({organizer.review_stats.total_reviews} {
                          organizer.review_stats.total_reviews === 1 ? 'opinia' :
                          organizer.review_stats.total_reviews < 5 ? 'opinie' : 'opinii'
                        })
                      </span>
                    </>
                  ) : (
                    <span className="text-gray-500">Brak opinii</span>
                  )}
                </div>
              </div>

              {/* Add Review Form */}
              {isAuthenticated ? (
                canAddReview ? (
                  <div className="bg-gray-50 rounded-xl p-6 mb-6">
                    <h4 className="flex items-center gap-2 font-semibold text-blue-900 mb-4">
                      <Edit className="w-5 h-5" />
                      Dodaj swoją opinię
                    </h4>
                    <form onSubmit={handleSubmitReview}>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Twoja ocena:
                        </label>
                        <StarRatingInput value={rating} onChange={setRating} />
                      </div>
                      <div className="mb-4">
                        <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
                          Twoja opinia:
                        </label>
                        <textarea
                          id="comment"
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          placeholder="Podziel się swoją opinią o tym organizatorze..."
                          className="w-full border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                          rows={4}
                          maxLength={1000}
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">Maksymalnie 1000 znaków</p>
                      </div>
                      <button
                        type="submit"
                        disabled={addReviewMutation.isPending || !rating || !comment.trim()}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        <Send className="w-4 h-4" />
                        {addReviewMutation.isPending ? 'Wysyłanie...' : 'Dodaj opinię'}
                      </button>
                    </form>
                  </div>
                ) : userReview ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-blue-800">
                    <p className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      Już dodałeś opinię o tym organizatorze.
                    </p>
                  </div>
                ) : null
              ) : (
                <div className="bg-gray-50 rounded-xl p-6 mb-6 text-center">
                  <p className="text-gray-600 mb-4 flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    Zaloguj się, aby dodać opinię
                  </p>
                  <Link
                    href={`/logowanie?next=/organizatorzy/${slug}#opinie`}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Zaloguj się
                  </Link>
                </div>
              )}

              {/* Reviews List */}
              {isLoadingReviews ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse py-4 border-b border-gray-100">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full" />
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-24" />
                          <div className="h-3 bg-gray-200 rounded w-16" />
                        </div>
                      </div>
                      <div className="h-16 bg-gray-200 rounded" />
                    </div>
                  ))}
                </div>
              ) : reviews.length > 0 ? (
                <>
                  <div className="divide-y divide-gray-100">
                    {reviews.map((review) => (
                      <ReviewItem
                        key={review.id}
                        review={review}
                        isOwner={user?.id === review.user.id}
                        isOrganizer={!!isOrganizer}
                        onDelete={handleDeleteReview}
                        onRespond={handleRespondToReview}
                      />
                    ))}
                  </div>
                  
                  {reviewsData && reviewsData.total_pages > 1 && (
                    <Pagination
                      currentPage={reviewsData.current_page}
                      totalPages={reviewsData.total_pages}
                      onPageChange={handlePageChange}
                    />
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg">Ten organizator nie ma jeszcze żadnych opinii.</p>
                  <p className="text-sm mt-1">Bądź pierwszy!</p>
                </div>
              )}
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
