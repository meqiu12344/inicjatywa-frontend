'use client';

import { useState, useEffect, KeyboardEvent, ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { 
  Calendar, MapPin, Clock, 
  Upload, X, Plus, Trash2, Info, ChevronLeft, ChevronRight,
  FileText, Tag, Users, Euro, AlertCircle, Check, 
  Heart, CreditCard, Gift, ExternalLink, Ticket, Sparkles, Globe, Lightbulb,
  Play, Square
} from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { eventsApi, categoriesApi } from '@/lib/api/events';
import { paymentsApi } from '@/lib/api/payments';
import { locationsApi } from '@/lib/api/locations';
import { useAuthStore, useHydration } from '@/stores/authStore';
import toast from 'react-hot-toast';
import { TicketType, Category } from '@/types';

// Dynamic import for CKEditor (uses window)
const CKEditorComponent = dynamic(
  () => import('@ckeditor/ckeditor5-react').then(mod => {
    const ClassicEditor = require('@ckeditor/ckeditor5-build-classic');
    const CKEditor = mod.CKEditor;
    // eslint-disable-next-line react/display-name
    return ({ data, onChange, onBlur, config }: any) => (
      <CKEditor editor={ClassicEditor as any} data={data} onChange={onChange} onBlur={onBlur} config={config} />
    );
  }),
  { ssr: false, loading: () => <div className="bg-gray-50 min-h-[500px] flex items-center justify-center text-gray-400">Ładowanie edytora...</div> }
);

// ==========================================
// TYPES
// ==========================================
interface EventFormData {
  title: string;
  description: string;
  category_ids: number[];
  event_type: 'free' | 'voluntary' | 'platform' | 'paid';
  is_permanent: boolean;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  available_from_date: string;
  available_from_time: string;
  available_to_date: string;
  available_to_time: string;
  location_address: string;
  location_city: string;
  location_postal_code: string;
  location_region: string;
  participant_limit: number | null;
  is_limited: boolean;
  is_fully_booked: boolean;
  ticket_price: number | null;
  ticket_url: string;
  online_event: boolean;
  online_link: string;
  needs_poster: boolean;
  tags: string[];
  ticket_types: Partial<TicketType>[];
  make_donation: boolean;
  donation_amount: number;
  ai_poster_amount: number;
}

const DONATION_AMOUNTS = [10, 20, 50, 100];
const AI_POSTER_AMOUNTS = [10, 15, 20, 30];
const TOTAL_STEPS = 7;

// ==========================================
// STYLES (matching Django exactly)
// ==========================================
const formStyles = `
  /* =========================
     SEKCJA WSPARCIA - DONACJE
     ========================= */
  .donation-options {
    display: flex;
    justify-content: center;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 1.5rem;
  }

  .donation-btn {
    background: #ffffff;
    border: 2px solid #007bff;
    color: #007bff;
    padding: 0.8rem 1.5rem;
    border-radius: 12px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 2px 4px rgba(0,0,0,0.08);
  }

  .donation-btn:hover {
    background: #007bff;
    color: white;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,123,255,0.3);
  }

  .donation-btn.selected {
    background: #007bff;
    color: white;
    box-shadow: 0 0 12px rgba(0, 123, 255, 0.5);
  }

  /* =========================
     AI PLAKAT
     ========================= */
  .ai-plakat-option {
    padding: 20px;
    border: 2px solid #e9ecef;
    border-radius: 12px;
    margin-bottom: 20px;
    background: linear-gradient(135deg, #fff9e6 0%, #fff 100%);
    transition: all 0.3s ease;
  }

  .ai-plakat-option:hover {
    border-color: #ffc107;
    box-shadow: 0 4px 12px rgba(255,193,7,0.15);
  }

  .ai-image-price-btn {
    border-color: #ffc107 !important;
    color: #856404;
    background: white;
    font-weight: 600;
    transition: all 0.3s ease;
  }

  .ai-image-price-btn:hover {
    background-color: #ffc107 !important;
    color: #000 !important;
    transform: translateY(-2px);
  }

  .ai-image-price-btn.selected {
    background: #ffc107 !important;
    color: #000 !important;
    box-shadow: 0 0 12px rgba(255,193,7,0.5);
  }

  /* =========================
     FORMULARZ - GŁÓWNE SEKCJE
     ========================= */
  .form-step-container {
    background: white;
    padding: 2rem;
    border-radius: 12px;
    margin-bottom: 1rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  }

  .form-step-header {
    color: #2c3e50;
    font-size: 1.75rem;
    font-weight: 700;
    margin-bottom: 1.5rem;
    padding-bottom: 0.75rem;
    border-bottom: 3px solid #007bff;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  /* Info Section - Podpowiedzi */
  .info-section {
    background: linear-gradient(135deg, #e3f2fd 0%, #f5f9ff 100%);
    border-left: 4px solid #007bff;
    padding: 1rem 1.25rem;
    border-radius: 8px;
    color: #1565c0;
    font-size: 0.95rem;
    line-height: 1.6;
    margin-bottom: 1.5rem;
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
  }

  /* =========================
     KATEGORIE
     ========================= */
  .categories-container {
    border: 2px solid #e0e0e0;
    border-radius: 12px;
    padding: 1.5rem;
    background: #fafafa;
    max-height: 400px;
    overflow-y: auto;
  }

  .category-option {
    padding: 0.75rem 1rem;
    margin-bottom: 0.5rem;
    border-radius: 8px;
    background: white;
    border: 2px solid #e9ecef;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .category-option:hover {
    background: #f0f8ff;
    border-color: #007bff;
    transform: translateX(4px);
  }

  .category-option.selected {
    background: #e3f2fd;
    border-color: #007bff;
  }

  .category-option.disabled {
    opacity: 0.5;
    pointer-events: none;
  }

  /* =========================
     TAGI
     ========================= */
  .tag-container {
    min-height: 60px;
    padding: 0.75rem;
    border: 2px dashed #e0e0e0;
    border-radius: 8px;
    background: #fafafa;
  }

  .tag-item {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
    color: white;
    padding: 0.5rem 0.75rem;
    border-radius: 20px;
    font-size: 0.9rem;
    font-weight: 500;
    box-shadow: 0 2px 4px rgba(0,123,255,0.3);
    margin: 0.25rem;
  }

  .tag-item .remove-tag {
    cursor: pointer;
    background: rgba(255,255,255,0.2);
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s ease;
  }

  .tag-item .remove-tag:hover {
    background: rgba(255,255,255,0.4);
  }

  /* =========================
     DATE-TIME SECTIONS
     ========================= */
  .date-time-section {
    background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
    border: 2px solid #e9ecef;
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.1rem;
    font-weight: 600;
    color: #495057;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 2px solid #dee2e6;
  }

  /* =========================
     EVENT TYPE OPTIONS
     ========================= */
  .event-type-option {
    padding: 1rem 1.25rem;
    border: 2px solid #e9ecef;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
    background: white;
    margin-bottom: 0.75rem;
  }

  .event-type-option:hover {
    border-color: #007bff;
    background: #f8f9ff;
  }

  .event-type-option.selected {
    border-color: #007bff;
    background: #e3f2fd;
  }

  /* =========================
     TICKET TYPES
     ========================= */
  .ticket-type-card {
    background: white;
    border: 2px solid #e9ecef;
    border-radius: 12px;
    padding: 1.25rem;
    margin-bottom: 1rem;
    transition: all 0.2s ease;
  }

  .ticket-type-card:hover {
    border-color: #dee2e6;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  }

  /* =========================
     NAVIGATION BUTTONS
     ========================= */
  .nav-button {
    border-radius: 10px;
    border: none;
    cursor: pointer;
    transition: all 0.3s ease;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    box-shadow: 0 2px 6px rgba(0,0,0,0.1);
    padding: 0.75rem 1.5rem;
    font-weight: 600;
  }

  .nav-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }

  .prev-button {
    background: #6c757d;
    color: white;
  }

  .prev-button:hover {
    background: #5a6268;
  }

  .next-button {
    background: #007bff;
    color: white;
  }

  .next-button:hover {
    background: #0056b3;
  }

  .submit-button {
    background: #28a745;
    color: white;
  }

  .submit-button:hover {
    background: #218838;
  }

  .pay-button {
    background: #ffc107;
    color: #212529;
  }

  .pay-button:hover {
    background: #e0a800;
  }

  /* =========================
     FORM INPUTS
     ========================= */
  .form-input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 1rem;
    color: #333;
    background: white;
    transition: all 0.3s ease;
    box-sizing: border-box;
  }

  .form-input:focus {
    border-color: #007bff;
    outline: none;
    box-shadow: 0 0 0 4px rgba(0,123,255,0.1);
  }

  .form-input::placeholder {
    color: #999;
  }

  .form-label {
    display: block;
    font-weight: 600;
    color: #2c3e50;
    margin-bottom: 0.5rem;
    font-size: 1rem;
  }

  .form-label-small {
    display: block;
    font-weight: 500;
    color: #666;
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
  }

  .error-text {
    color: #dc3545;
    font-size: 0.875rem;
    margin-top: 0.5rem;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  /* =========================
     CHECKBOX CUSTOM
     ========================= */
  .custom-checkbox {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: #f8f9fa;
    border-radius: 12px;
    border: 2px solid #e9ecef;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .custom-checkbox:hover {
    border-color: #007bff;
    background: #f0f8ff;
  }

  .custom-checkbox input[type="checkbox"] {
    width: 1.25rem;
    height: 1.25rem;
    cursor: pointer;
    accent-color: #007bff;
  }

  /* =========================
     RESPONSYWNOŚĆ
     ========================= */
  @media (max-width: 768px) {
    .form-step-container {
      padding: 1.5rem 1rem;
    }

    .form-step-header {
      font-size: 1.4rem;
    }

    .donation-btn {
      font-size: 1rem;
      padding: 0.7rem 1.2rem;
    }

    .nav-button {
      font-size: 1rem;
      padding: 0.75rem 1.5rem;
    }
  }
`;

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function CreateEventPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, user, profile } = useAuthStore();
  const hydrated = useHydration();
  const isOrganizer = user?.is_staff || profile?.role === 'organizer';
  
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [tagInput, setTagInput] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationResults, setLocationResults] = useState<any[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [locationType, setLocationType] = useState<'poland' | 'foreign'>('poland');
  
  // Location validation states
  const [isValidatingAddress, setIsValidatingAddress] = useState(false);
  const [isValidatingPostalCode, setIsValidatingPostalCode] = useState(false);
  const [addressValidationMessage, setAddressValidationMessage] = useState<{type: 'success' | 'error' | 'suggestion', message: string} | null>(null);
  const [postalCodeValidationMessage, setPostalCodeValidationMessage] = useState<{type: 'success' | 'error' | 'suggestion', message: string} | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://test.inicjatywakatolicka.pl';

  // Redirect if not authenticated or not organizer
  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.push('/logowanie?redirect=/wydarzenia/dodaj');
    } else if (hydrated && isAuthenticated && !isOrganizer) {
      router.push('/zostan-organizatorem');
    }
  }, [hydrated, isAuthenticated, isOrganizer, router]);

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.getCategories,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    trigger,
  } = useForm<EventFormData>({
    defaultValues: {
      title: '',
      description: '',
      category_ids: [],
      event_type: 'free',
      is_permanent: false,
      start_date: '',
      start_time: '10:00',
      end_date: '',
      end_time: '12:00',
      available_from_date: '',
      available_from_time: '09:00',
      available_to_date: '',
      available_to_time: '23:59',
      location_address: '',
      location_city: '',
      location_postal_code: '',
      location_region: '',
      participant_limit: null,
      is_limited: true,
      is_fully_booked: false,
      ticket_price: null,
      ticket_url: '',
      online_event: false,
      online_link: '',
      needs_poster: false,
      tags: [],
      ticket_types: [],
      make_donation: true,
      donation_amount: 0,
      ai_poster_amount: 10,
    },
  });

  const watchAll = watch();
  const watchEventType = watch('event_type');
  const watchOnlineEvent = watch('online_event');
  const watchIsLimited = watch('is_limited');
  const watchIsPermanent = watch('is_permanent');
  const watchNeedsPoster = watch('needs_poster');
  const watchMakeDonation = watch('make_donation');
  const watchDonationAmount = watch('donation_amount');
  const watchAiPosterAmount = watch('ai_poster_amount');
  const watchTicketTypes = watch('ticket_types');
  const watchCategoryIds = watch('category_ids');
  const watchTags = watch('tags');

  // Calculate amount to pay
  const amountToPay = watchNeedsPoster 
    ? watchAiPosterAmount 
    : (watchMakeDonation ? watchDonationAmount : 0);

  // Tag autocomplete
  useEffect(() => {
    if (tagInput.length < 2) {
      setTagSuggestions([]);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(`${API_BASE}/category/tag-autocomplete/?q=${encodeURIComponent(tagInput)}`);
        const data = await response.json();
        setTagSuggestions(data.results || []);
      } catch {
        setTagSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [tagInput, API_BASE]);

  // Location search
  useEffect(() => {
    if (!locationQuery || locationQuery.length < 3) {
      setLocationResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setIsSearchingLocation(true);
      try {
        // Use Nominatim directly instead of Django proxy
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationQuery)}&format=json&addressdetails=1&limit=5`,
          {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'CatholicEvents/1.0'
            }
          }
        );
        const data = await response.json();
        setLocationResults(Array.isArray(data) ? data : []);
      } catch {
        setLocationResults([]);
      } finally {
        setIsSearchingLocation(false);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [locationQuery]);

  // Polish postal code validation (XX-XXX format)
  const validatePolishPostalCode = (code: string): boolean => {
    if (!code) return true; // Empty is OK (optional)
    const polishPostalCodeRegex = /^\d{2}-\d{3}$/;
    return polishPostalCodeRegex.test(code);
  };

  // Format postal code as user types
  const formatPostalCode = (value: string): string => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    // Format as XX-XXX
    if (digits.length <= 2) {
      return digits;
    }
    return `${digits.slice(0, 2)}-${digits.slice(2, 5)}`;
  };

  // Create mutation - WITH PAYMENT
  const createWithPaymentMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      // Double-check authentication before attempting payment
      if (!isAuthenticated) {
        throw new Error('Musisz być zalogowany aby dokonać płatności');
      }

      if (!data.start_date || !data.start_time) {
        throw new Error('Data rozpoczęcia jest wymagana');
      }
      
      const startDateTime = `${data.start_date}T${data.start_time}`;
      const endDateTime = data.end_date && data.end_time && !data.is_permanent
        ? `${data.end_date}T${data.end_time}`
        : undefined;
      const availableFrom = data.available_from_date && data.available_from_time
        ? `${data.available_from_date}T${data.available_from_time}`
        : undefined;
      const availableTo = data.available_to_date && data.available_to_time
        ? `${data.available_to_date}T${data.available_to_time}`
        : undefined;

      const amount = data.needs_poster ? data.ai_poster_amount : data.donation_amount;
      const paymentType: 'donation' | 'ai_poster' = data.needs_poster ? 'ai_poster' : 'donation';

      const payload = {
        event_data: {
          title: data.title,
          description: data.description,
          start_date: startDateTime,
          end_date: endDateTime,
          is_permanent: data.is_permanent,
          location: !data.online_event ? {
            address: data.location_address,
            city: data.location_city,
            postal_code: data.location_postal_code,
            region: data.location_region,
          } : undefined,
          event_type: data.event_type,
          participant_limit: data.is_limited ? null : data.participant_limit,
          is_limited: data.is_limited,
          ticket_price: data.ticket_price,
          ticket_url: data.ticket_url || undefined,
          available_from: availableFrom,
          available_to: availableTo,
          online_event: data.online_event,
          online_link: data.online_link || undefined,
        },
        payment_type: paymentType,
        amount: amount,
        categories: data.category_ids,
        tags: data.tags,
        ticket_types: data.event_type === 'platform' ? data.ticket_types.map(tt => ({
          name: tt.name || '',
          price: tt.price || 0,
          quantity: tt.quantity || 100,
          description: tt.description,
          max_per_order: tt.max_per_order,
        })) : undefined,
      };

      return paymentsApi.createEventWithPayment(payload);
    },
    onSuccess: (response) => {
      toast.success('Wydarzenie utworzone! Przekierowuję do płatności Stripe...');
      // Redirect to Stripe checkout
      window.location.href = response.checkout_url;
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || error?.message || 'Nie udało się utworzyć wydarzenia';
      toast.error(message);
    },
  });

  // Create mutation - FREE (no payment)
  const createFreeMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      // Double-check authentication before attempting event creation
      if (!isAuthenticated) {
        throw new Error('Musisz być zalogowany aby dodać wydarzenie');
      }

      if (!data.start_date || !data.start_time) {
        throw new Error('Data rozpoczęcia jest wymagana');
      }
      
      const startDateTime = `${data.start_date}T${data.start_time}`;
      const endDateTime = data.end_date && data.end_time && !data.is_permanent
        ? `${data.end_date}T${data.end_time}`
        : undefined;
      const availableFrom = data.available_from_date && data.available_from_time
        ? `${data.available_from_date}T${data.available_from_time}`
        : undefined;
      const availableTo = data.available_to_date && data.available_to_time
        ? `${data.available_to_date}T${data.available_to_time}`
        : undefined;

      const payload = {
        event_data: {
          title: data.title,
          description: data.description,
          start_date: startDateTime,
          end_date: endDateTime,
          is_permanent: data.is_permanent,
          location: !data.online_event ? {
            address: data.location_address,
            city: data.location_city,
            postal_code: data.location_postal_code,
            region: data.location_region,
          } : undefined,
          event_type: data.event_type,
          participant_limit: data.is_limited ? null : data.participant_limit,
          is_limited: data.is_limited,
          ticket_price: data.ticket_price,
          ticket_url: data.ticket_url || undefined,
          available_from: availableFrom,
          available_to: availableTo,
          online_event: data.online_event,
          online_link: data.online_link || undefined,
        },
        categories: data.category_ids,
        tags: data.tags,
        ticket_types: data.event_type === 'platform' ? data.ticket_types.map(tt => ({
          name: tt.name || '',
          price: tt.price || 0,
          quantity: tt.quantity || 100,
          description: tt.description,
          max_per_order: tt.max_per_order,
        })) : undefined,
      };

      return paymentsApi.createEventFree(payload);
    },
    onSuccess: (response) => {
      toast.success(response.message || 'Wydarzenie zostało utworzone i czeka na zatwierdzenie!');
      queryClient.invalidateQueries({ queryKey: ['my-events'] });
      router.push('/moje-wydarzenia');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || error?.message || 'Nie udało się utworzyć wydarzenia';
      toast.error(message);
    },
  });

  // Handlers
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !watchTags.includes(trimmedTag)) {
      setValue('tags', [...watchTags, trimmedTag]);
    }
    setTagInput('');
    setTagSuggestions([]);
  };

  const removeTag = (index: number) => {
    setValue('tags', watchTags.filter((_, i) => i !== index));
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      addTag(tagInput);
    }
  };

  const toggleCategory = (categoryId: number) => {
    const current = watchCategoryIds || [];
    if (current.includes(categoryId)) {
      setValue('category_ids', current.filter(id => id !== categoryId));
    } else if (current.length < 3) {
      setValue('category_ids', [...current, categoryId]);
    }
  };

  const addTicketType = () => {
    const current = watchTicketTypes || [];
    setValue('ticket_types', [
      ...current,
      { name: '', price: 0, quantity: 100, description: '', max_per_order: 5 },
    ]);
  };

  const removeTicketType = (index: number) => {
    const current = watchTicketTypes || [];
    setValue('ticket_types', current.filter((_, i) => i !== index));
  };

  const selectLocation = (item: any) => {
    const address = item.address || {};
    const city = address.city || address.town || address.village || '';
    const street = [address.road, address.house_number].filter(Boolean).join(' ');
    const postal = address.postcode || '';
    const region = address.state || '';

    setValue('location_address', street);
    setValue('location_city', city);
    setValue('location_postal_code', postal);
    setValue('location_region', region);
    setLocationQuery(item.display_name || `${street}, ${city}`);
    setLocationResults([]);
  };

  const onSubmit = (data: EventFormData) => {
    // Ensure we're on the last step before submitting
    if (currentStep !== TOTAL_STEPS) {
      return;
    }

    // Check if user is authenticated
    if (!isAuthenticated) {
      toast.error('Musisz być zalogowany aby dodać wydarzenie');
      router.push('/logowanie?redirect=/wydarzenia/dodaj');
      return;
    }

    // Determine if payment is required
    const paymentAmount = data.needs_poster 
      ? data.ai_poster_amount 
      : (data.make_donation ? data.donation_amount : 0);

    if (paymentAmount > 0) {
      // Create event with payment - redirect to Stripe
      createWithPaymentMutation.mutate(data);
    } else {
      // Create free event - no payment needed
      createFreeMutation.mutate(data);
    }
  };

  // Check if any mutation is pending
  const isSubmitting = createWithPaymentMutation.isPending || createFreeMutation.isPending;

  // Location validation functions
  const validatePostalCode = async (postalCode: string): Promise<boolean> => {
    if (!postalCode || locationType !== 'poland') return true;

    setIsValidatingPostalCode(true);
    setPostalCodeValidationMessage(null);

    try {
      const result = await locationsApi.validatePostalCode(postalCode);
      
      if (!result.valid) {
        setPostalCodeValidationMessage({ type: 'error', message: result.error || 'Nieprawidłowy kod pocztowy' });
        setIsValidatingPostalCode(false);
        return false;
      }

      // Auto-fill city and region if provided and fields are empty
      if (result.city && !watchAll.location_city) {
        setValue('location_city', result.city);
      } else if (result.city && watchAll.location_city && result.city.toLowerCase() !== watchAll.location_city.toLowerCase()) {
        setPostalCodeValidationMessage({ 
          type: 'suggestion', 
          message: `Sugerowane miasto dla tego kodu: ${result.city}` 
        });
      }

      setPostalCodeValidationMessage({ type: 'success', message: 'Kod pocztowy zweryfikowany' });
      setIsValidatingPostalCode(false);
      return true;
    } catch (error) {
      setPostalCodeValidationMessage({ type: 'error', message: 'Błąd podczas walidacji kodu pocztowego' });
      setIsValidatingPostalCode(false);
      return false;
    }
  };

  const validateAddress = async (address: string, city: string): Promise<boolean> => {
    if (!address || !city) return true;

    setIsValidatingAddress(true);
    setAddressValidationMessage(null);

    // Normalize address - remove "ul." prefix
    const normalizedAddress = address.trim().replace(/^ul\.?\s*/i, '');

    try {
      const result = await locationsApi.validateAddress(normalizedAddress, city);
      
      if (!result.valid) {
        setAddressValidationMessage({ type: 'error', message: result.error || 'Nie znaleziono podanego adresu' });
        setIsValidatingAddress(false);
        return false;
      }

      // Suggest city if different
      if (result.city && result.city.toLowerCase() !== city.toLowerCase()) {
        setAddressValidationMessage({ 
          type: 'suggestion', 
          message: `Sugerowane miasto: ${result.city}` 
        });
      }

      // Auto-fill postal code if provided and field is empty
      if (result.postal_code && !watchAll.location_postal_code) {
        setValue('location_postal_code', result.postal_code);
        // Also validate the postal code
        validatePostalCode(result.postal_code);
      }

      setAddressValidationMessage({ type: 'success', message: 'Adres zweryfikowany' });
      setIsValidatingAddress(false);
      return true;
    } catch (error) {
      setAddressValidationMessage({ type: 'error', message: 'Błąd podczas walidacji adresu' });
      setIsValidatingAddress(false);
      return false;
    }
  };

  // Validation matching Django exactly
  const validateCurrentStep = async (): Promise<boolean> => {
    switch (currentStep) {
      case 1:
        const titleValid = await trigger(['title']);
        if (!titleValid) {
          if (errors.title?.message) {
            toast.error(String(errors.title.message));
          }
          return false;
        }
        return true;
      case 2:
        const startValid = await trigger(['start_date', 'start_time']);
        if (!startValid) {
          const firstError = errors.start_date || errors.start_time;
          if (firstError?.message) {
            toast.error(String(firstError.message));
          }
          return false;
        }
        
        // Validate dates not in past
        const startDate = new Date(`${watchAll.start_date}T${watchAll.start_time}`);
        if (startDate < new Date()) {
          toast.error('Data i godzina rozpoczęcia nie może być w przeszłości.');
          return false;
        }
        
        // Validate end date if not permanent
        if (!watchIsPermanent) {
          const endValid = await trigger(['end_date', 'end_time']);
          if (!endValid) {
            const firstError = errors.end_date || errors.end_time;
            if (firstError?.message) {
              toast.error(String(firstError.message));
            }
            return false;
          }
          
          const endDate = new Date(`${watchAll.end_date}T${watchAll.end_time}`);
          if (endDate < new Date()) {
            toast.error('Data i godzina zakończenia nie może być w przeszłości.');
            return false;
          }
          if (endDate <= startDate) {
            toast.error('Data i godzina zakończenia musi być późniejsza niż data rozpoczęcia.');
            return false;
          }
        }
        return true;
      case 3:
        if (watchCategoryIds.length === 0) {
          toast.error('Wybierz przynajmniej jedną kategorię');
          return false;
        }
        return true;
      case 4:
        if (watchOnlineEvent) {
          const linkValid = await trigger(['online_link']);
          if (!linkValid) {
            if (errors.online_link?.message) {
              toast.error(String(errors.online_link.message));
            }
            return false;
          }
          return true;
        }
        
        const cityValid = await trigger(['location_city']);
        if (!cityValid) {
          if (errors.location_city?.message) {
            toast.error(String(errors.location_city.message));
          }
          return false;
        }
        
        // Validate Polish postal code format (only for Poland)
        if (locationType === 'poland' && watchAll.location_postal_code) {
          if (!validatePolishPostalCode(watchAll.location_postal_code)) {
            toast.error('Niepoprawny format kodu pocztowego. Użyj formatu XX-XXX (np. 00-001)');
            return false;
          }
        }
        return true;
      case 5:
        // Validate participant limit (if not unlimited)
        if (!watchIsLimited && watchAll.participant_limit) {
          const limit = Number(watchAll.participant_limit);
          if (isNaN(limit) || !Number.isInteger(limit) || limit <= 0) {
            toast.error('Podaj poprawny limit uczestników (liczba całkowita większa od zera) lub zaznacz brak limitu.');
            return false;
          }
        }

        // Validate platform ticket types
        if (watchEventType === 'platform') {
          if (!watchTicketTypes || watchTicketTypes.length === 0) {
            toast.error('Musisz dodać co najmniej jeden typ biletu dla wydarzenia z biletami przez platformę.');
            return false;
          }
          // Validate each ticket type
          for (let i = 0; i < watchTicketTypes.length; i++) {
            const tt = watchTicketTypes[i];
            if (!tt.name?.trim()) {
              toast.error(`Bilet #${i + 1}: Nazwa jest wymagana`);
              return false;
            }
            if (tt.price === undefined || tt.price < 0) {
              toast.error(`Bilet #${i + 1}: Cena musi być większa lub równa 0`);
              return false;
            }
            if (!tt.quantity || tt.quantity < 1) {
              toast.error(`Bilet #${i + 1}: Ilość musi być co najmniej 1`);
              return false;
            }
          }
        }

        // Validate paid external tickets
        if (watchEventType === 'paid') {
          // Validate ticket price (optional, but if provided must be > 0)
          if (watchAll.ticket_price !== null && watchAll.ticket_price !== undefined) {
            const price = Number(watchAll.ticket_price);
            if (isNaN(price) || price <= 0) {
              toast.error('Wprowadź prawidłową cenę biletu (wartość większa od zera) lub pozostaw puste.');
              return false;
            }
          }

          // Validate ticket URL (required)
          if (!watchAll.ticket_url?.trim()) {
            toast.error('Podaj link do zakupu biletów.');
            return false;
          }
          
          // Validate URL format
          if (!/^https?:\/\/.+/.test(watchAll.ticket_url)) {
            toast.error('Podaj prawidłowy URL (musi zaczynać się od http:// lub https://).');
            return false;
          }

          // Validate ticket availability dates (required for paid events)
          if (!watchAll.available_from_date || !watchAll.available_from_time) {
            toast.error('Pole "Bilety dostępne od" jest wymagane dla wydarzeń płatnych.');
            return false;
          }
          
          if (!watchAll.available_to_date || !watchAll.available_to_time) {
            toast.error('Pole "Bilety dostępne do" jest wymagane dla wydarzeń płatnych.');
            return false;
          }

          // Parse and validate dates
          const availableFrom = new Date(`${watchAll.available_from_date}T${watchAll.available_from_time}`);
          const availableTo = new Date(`${watchAll.available_to_date}T${watchAll.available_to_time}`);
          const now = new Date();

          // Check if dates are in the past
          if (availableFrom < now) {
            toast.error('Data rozpoczęcia sprzedaży nie może być w przeszłości.');
            return false;
          }

          if (availableTo < now) {
            toast.error('Data zakończenia sprzedaży nie może być w przeszłości.');
            return false;
          }

          // Check if end date is before start date
          if (availableTo < availableFrom) {
            toast.error('Data zakończenia sprzedaży nie może być wcześniejsza niż data rozpoczęcia.');
            return false;
          }
        }
        
        return true;
      case 6:
        // Manual validation for description since it's controlled by CKEditor
        const description = watchAll.description?.trim() || '';
        if (!description || description === '<p></p>' || description === '') {
          toast.error('Opis jest wymagany');
          return false;
        }
        return true;
      case 7:
        if (watchMakeDonation && watchDonationAmount <= 0 && !watchNeedsPoster) {
          toast.error('Wybierz kwotę darowizny przed przejściem do płatności.');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const nextStep = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent any default form submission
    e?.preventDefault();
    e?.stopPropagation();
    
    const isValid = await validateCurrentStep();
    
    if (isValid && currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = (e?: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent any default form submission
    e?.preventDefault();
    e?.stopPropagation();
    
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (!hydrated || !isAuthenticated) {
    return null;
  }

  const steps = [
    { id: 1, name: 'Podstawowe', icon: FileText },
    { id: 2, name: 'Termin', icon: Calendar },
    { id: 3, name: 'Kategoria', icon: Tag },
    { id: 4, name: 'Lokalizacja', icon: MapPin },
    { id: 5, name: 'Uczestnicy', icon: Users },
    { id: 6, name: 'Opis', icon: FileText },
    { id: 7, name: 'Wsparcie', icon: Heart },
  ];

  const progressPercent = (currentStep / TOTAL_STEPS) * 100;

  return (
    <div className="min-h-screen bg-gray-50 py-8 text-black">
      {/* Inject custom styles */}
      <style dangerouslySetInnerHTML={{ __html: formStyles }} />

      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Calendar className="w-16 h-16 mx-auto text-blue-600 mb-4" />
          <h1 className="text-3xl font-bold text-gray-900">
            Dodaj <span className="text-blue-600">wydarzenie</span>
          </h1>
          <p className="text-gray-600 mt-2">Wypełnij formularz krok po kroku, aby dodać swoje wydarzenie.</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-4">
            <div 
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          
          {/* Step Indicators */}
          <div className="flex justify-between flex-wrap gap-2">
            {steps.map((step) => {
              const StepIcon = step.icon;
              const isActive = step.id === currentStep;
              const isCompleted = step.id < currentStep;
              
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => step.id <= currentStep && setCurrentStep(step.id)}
                  className={`
                    flex flex-col items-center gap-1 p-2 rounded-lg transition-all
                    ${isActive ? 'bg-blue-100 text-blue-700' : ''}
                    ${isCompleted ? 'text-blue-600' : 'text-gray-400'}
                    ${step.id <= currentStep ? 'cursor-pointer hover:bg-blue-50' : 'cursor-not-allowed'}
                  `}
                  disabled={step.id > currentStep}
                >
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center
                    ${isActive ? 'bg-blue-600 text-white' : ''}
                    ${isCompleted ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'}
                  `}>
                    {isCompleted ? <Check className="w-4 h-4" /> : <span className="text-sm font-medium">{step.id}</span>}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${isActive ? 'text-blue-700' : ''}`}>
                    {step.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form */}
        <form 
          onSubmit={(e) => {
            if (currentStep !== TOTAL_STEPS) {
              e.preventDefault();
              return;
            }
            handleSubmit(onSubmit)(e);
          }}
        >
          <div className="form-step-container">
            
            {/* ===== STEP 1: Basic Info ===== */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h3 className="form-step-header">
                  <Info className="w-6 h-6 text-blue-600" />
                  Podstawowe informacje
                </h3>

                {/* Title */}
                <div>
                  <label className="form-label">Nazwa wydarzenia</label>
                  <input
                    {...register('title', { required: 'Nazwa wydarzenia jest wymagana' })}
                    className="form-input"
                    placeholder="Nazwa wydarzenia"
                  />
                  {errors.title && (
                    <p className="error-text">
                      <AlertCircle className="w-4 h-4" />
                      {errors.title.message}
                    </p>
                  )}
                </div>

                {/* AI Poster Option */}
                <div className="ai-plakat-option">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      {...register('needs_poster')}
                      className="mt-1 w-5 h-5 rounded"
                    />
                    <div>
                      <span className="font-bold text-gray-900 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-500" />
                        Nie masz plakatu? Zostaw to nam!
                      </span>
                      <p className="text-sm text-gray-600 mt-1">
                        Jeśli zaznaczysz tę opcję, nie musisz przejmować się plakatem, zrobimy to za ciebie! 
                        Nasi ludzie stworzą spersonalizowany plakat pod twoje wydarzenie.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Manual Image Upload or AI Poster Selection */}
                {!watchNeedsPoster ? (
                  <div>
                    <label className="form-label">Zdjęcie główne wydarzenia</label>
                    <p className="text-sm text-gray-500 mb-3">
                      Wybierz zdjęcie, które najlepiej reprezentuje Twoje wydarzenie.
                    </p>
                    
                    {imagePreview ? (
                      <div className="relative">
                        <img
                          src={imagePreview}
                          alt="Podgląd"
                          className="w-full max-h-72 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50/30 transition-all">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-12 h-12 text-gray-400 mb-4" />
                          <p className="mb-2 text-sm text-gray-500">
                            <span className="font-semibold">Kliknij, aby przesłać</span> lub przeciągnij i upuść
                          </p>
                          <p className="text-xs text-gray-500">PNG, JPG, WEBP (max 5MB)</p>
                        </div>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/jpeg, image/png, image/webp"
                          onChange={handleImageChange}
                        />
                      </label>
                    )}
                  </div>
                ) : (
                  <div className="p-5 bg-blue-50 border border-blue-200 rounded-xl">
                    <h4 className="font-semibold text-blue-900 mb-3">Przykładowe plakaty</h4>
                    
                    <p className="text-red-600 font-semibold text-sm mb-2">
                      <AlertCircle className="w-4 h-4 inline mr-1" />
                      OSTRZEŻENIE: Plakat zostanie stworzony w ciągu 4-5 dni roboczych.
                    </p>
                    <p className="text-sm text-gray-600 mb-4">
                      Do tego czasu Twoje wydarzenie będzie posiadało status <strong>Oczekującego</strong> i nie będzie widoczne publicznie. 
                      Po akceptacji plakatu status zmieni się na <strong>Opublikowane</strong>.
                    </p>
                    
                    {/* AI Poster Amount Selection */}
                    <div className="mt-4">
                      <label className="block text-sm font-semibold text-gray-700 mb-3 text-center">
                        Wybierz kwotę za stworzenie plakatu:
                      </label>
                      <div className="donation-options">
                        {AI_POSTER_AMOUNTS.map((amount) => (
                          <button
                            key={amount}
                            type="button"
                            onClick={() => setValue('ai_poster_amount', amount)}
                            className={`ai-image-price-btn px-6 py-3 rounded-xl border-2 ${
                              watchAiPosterAmount === amount ? 'selected' : ''
                            }`}
                          >
                            {amount} zł
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ===== STEP 2: Date/Time ===== */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h3 className="form-step-header">
                  <Calendar className="w-6 h-6 text-blue-600" />
                  Termin wydarzenia
                </h3>

                <div className="info-section">
                  <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <span>Dokładne określenie daty i czasu pomoże uczestnikom zaplanować udział w wydarzeniu.</span>
                </div>

                {/* Start Date/Time */}
                <div className="date-time-section">
                  <div className="section-title">
                    <Play className="w-5 h-5 text-blue-600" />
                    <span>Data i godzina rozpoczęcia</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label-small">Data rozpoczęcia *</label>
                      <input
                        type="date"
                        {...register('start_date', { required: 'Data jest wymagana' })}
                        className="form-input"
                      />
                      {errors.start_date && (
                        <p className="error-text">{errors.start_date.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="form-label-small">Godzina rozpoczęcia *</label>
                      <input
                        type="time"
                        {...register('start_time', { required: 'Godzina jest wymagana' })}
                        className="form-input"
                      />
                    </div>
                  </div>
                </div>

                {/* Permanent Event Toggle */}
                <label className="custom-checkbox">
                  <input
                    type="checkbox"
                    {...register('is_permanent')}
                  />
                  <div>
                    <span className="font-semibold text-gray-900">Wydarzenie trwa cały czas</span>
                    <p className="text-sm text-gray-500">(Zaznacz, jeśli wydarzenie nie ma konkretnej daty zakończenia)</p>
                  </div>
                </label>

                {/* End Date/Time */}
                {!watchIsPermanent && (
                  <div className="date-time-section">
                    <div className="section-title">
                      <Square className="w-5 h-5 text-gray-600" />
                      <span>Data i godzina zakończenia</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="form-label-small">Data zakończenia</label>
                        <input
                          type="date"
                          {...register('end_date', {
                            required: !watchIsPermanent ? 'Data zakończenia jest wymagana' : false
                          })}
                          className="form-input"
                        />
                        {errors.end_date && (
                          <p className="error-text">
                            <AlertCircle className="w-4 h-4" />
                            {errors.end_date.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="form-label-small">Godzina zakończenia</label>
                        <input
                          type="time"
                          {...register('end_time', {
                            required: !watchIsPermanent ? 'Godzina zakończenia jest wymagana' : false
                          })}
                          className="form-input"
                        />
                        {errors.end_time && (
                          <p className="error-text">
                            <AlertCircle className="w-4 h-4" />
                            {errors.end_time.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ===== STEP 3: Categories & Tags ===== */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h3 className="form-step-header">
                  <Tag className="w-6 h-6 text-blue-600" />
                  Kategoria i tagi
                </h3>

                <div className="info-section">
                  <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <span>Odpowiednia kategoryzacja zwiększa szansę, że Twoje wydarzenie zostanie zauważone przez właściwych odbiorców.</span>
                </div>

                {/* Categories */}
                <div>
                  <label className="form-label">Kategorie</label>
                  <p className="text-sm text-gray-500 mb-3 flex items-center gap-1">
                    <Info className="w-4 h-4" />
                    Możesz wybrać maksymalnie 3 kategorie
                  </p>
                  
                  <div className="categories-container">
                    <div className="flex items-center gap-2 font-semibold text-gray-700 mb-4 pb-3 border-b-2 border-gray-200">
                      <Tag className="w-4 h-4 text-blue-600" />
                      <span>Dostępne kategorie</span>
                    </div>
                    {categories
                      .filter((cat: Category) => cat.name.toLowerCase() !== 'top10' && cat.name.toLowerCase() !== 'polecane')
                      .map((category: Category) => {
                        const isSelected = watchCategoryIds.includes(category.id);
                        const isDisabled = !isSelected && watchCategoryIds.length >= 3;
                        
                        return (
                          <div
                            key={category.id}
                            onClick={() => !isDisabled && toggleCategory(category.id)}
                            className={`category-option ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              disabled={isDisabled}
                              className="w-5 h-5 rounded"
                            />
                            <span className="font-medium text-gray-700">{category.name}</span>
                          </div>
                        );
                      })}
                  </div>
                  {watchCategoryIds.length === 0 && (
                    <p className="error-text mt-2">Wybierz przynajmniej jedną kategorię</p>
                  )}
                </div>

                {/* Tags */}
                <div>
                  <label className="form-label flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Tagi (słowa kluczowe)
                  </label>
                  
                  {/* Tags display */}
                  <div className="tag-container mb-3">
                    {watchTags.length === 0 ? (
                      <p className="text-gray-400 italic">Dodane tagi pojawią się tutaj</p>
                    ) : (
                      <div className="flex flex-wrap">
                        {watchTags.map((tag, index) => (
                          <span key={index} className="tag-item">
                            {tag}
                            <span
                              onClick={() => removeTag(index)}
                              className="remove-tag"
                            >
                              ×
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Tag input */}
                  <div className="relative">
                    <div className="flex rounded-lg overflow-hidden border-2 border-gray-200 focus-within:border-blue-500">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleTagKeyDown}
                        placeholder="Wpisz tag i naciśnij Enter"
                        className="flex-1 px-4 py-3 border-0 focus:ring-0 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => tagInput.trim() && addTag(tagInput)}
                        className="px-4 bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    
                    {/* Tag suggestions */}
                    {tagSuggestions.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                        {tagSuggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => addTag(suggestion)}
                            className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-2 flex items-center gap-1">
                    <Info className="w-4 h-4" />
                    Podaj znaczniki rozdzielone przecinkami, wielowyrazowe w cudzysłowie, np. &quot;muzyka klasyczna&quot;
                  </p>
                </div>
              </div>
            )}

            {/* ===== STEP 4: Location ===== */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <h3 className="form-step-header">
                  <MapPin className="w-6 h-6 text-blue-600" />
                  Lokalizacja
                </h3>

                <div className="info-section">
                  <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <span>Określ miejsce, w którym odbędzie się Twoje wydarzenie.</span>
                </div>

                {/* Online Event Toggle */}
                <label className="custom-checkbox">
                  <input
                    type="checkbox"
                    {...register('online_event')}
                  />
                  <Globe className="w-6 h-6 text-blue-500" />
                  <div>
                    <span className="font-semibold text-gray-900">Wydarzenie online</span>
                    <p className="text-sm text-gray-500">Zaznacz tę opcję, jeśli wydarzenie odbywa się online.</p>
                  </div>
                </label>

                {/* Online Link */}
                {watchOnlineEvent && (
                  <div>
                    <label className="form-label">Link do wydarzenia online *</label>
                    <input
                      {...register('online_link', {
                        required: watchOnlineEvent ? 'Link do wydarzenia online jest wymagany' : false
                      })}
                      className="form-input"
                      placeholder="https://..."
                    />
                    {errors.online_link && (
                      <p className="error-text">
                        <AlertCircle className="w-4 h-4" />
                        {errors.online_link.message}
                      </p>
                    )}
                    <p className="text-sm text-gray-500 mt-2">Podaj link, pod którym odbędzie się wydarzenie online.</p>
                  </div>
                )}

                {/* Physical Location */}
                {!watchOnlineEvent && (
                  <>
                    {/* Location Type */}
                    <div className="flex gap-4 justify-center mb-6">
                      <label className={`
                        flex flex-col items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all flex-1 max-w-xs
                        ${locationType === 'poland' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}
                      `}>
                        <input
                          type="radio"
                          name="locationType"
                          value="poland"
                          checked={locationType === 'poland'}
                          onChange={() => setLocationType('poland')}
                          className="hidden"
                        />
                        <MapPin className="w-6 h-6 text-blue-500" />
                        <span className="font-medium text-sm">Lokalizacja w Polsce</span>
                      </label>
                      <label className={`
                        flex flex-col items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all flex-1 max-w-xs
                        ${locationType === 'foreign' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}
                      `}>
                        <input
                          type="radio"
                          name="locationType"
                          value="foreign"
                          checked={locationType === 'foreign'}
                          onChange={() => setLocationType('foreign')}
                          className="hidden"
                        />
                        <Globe className="w-6 h-6 text-blue-500" />
                        <span className="font-medium text-sm">Lokalizacja zagraniczna</span>
                      </label>
                    </div>

                    {/* Location Search */}
                    <div className="relative">
                      <label className="form-label">Wyszukaj adres</label>
                      <input
                        value={locationQuery}
                        onChange={(e) => setLocationQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') setLocationResults([]);
                        }}
                        className="form-input"
                        placeholder="np. ul. Długa 5, Kraków"
                      />
                      {isSearchingLocation && (
                        <div className="absolute right-3 top-10 text-sm text-gray-400">Szukam...</div>
                      )}
                      
                      {locationResults.length > 0 && (
                        <>
                          <div className="fixed inset-0 z-[5]" onClick={() => setLocationResults([])} />
                          <div className="absolute z-10 mt-1 w-full bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-64 overflow-auto">
                            <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
                              <span className="text-xs text-gray-500">Wybierz adres</span>
                              <button
                                type="button"
                                onClick={() => setLocationResults([])}
                                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
                              >
                                ✕
                              </button>
                            </div>
                            {locationResults.map((item, index) => (
                              <button
                                key={index}
                                type="button"
                                onClick={() => selectLocation(item)}
                                className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm border-b last:border-b-0"
                              >
                                {item.display_name}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Location Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="md:col-span-2">
                        <label className="form-label-small">Adres</label>
                        <input
                          {...register('location_address')}
                          className="form-input"
                          placeholder="np. ul. Kościelna 12"
                          onBlur={(e) => {
                            const address = e.target.value.trim();
                            const city = watchAll.location_city?.trim();
                            if (locationType === 'poland' && address && city) {
                              validateAddress(address, city);
                            }
                          }}
                        />
                        {isValidatingAddress && (
                          <p className="text-sm text-blue-600 mt-1 flex items-center gap-1">
                            <span className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                            Weryfikacja adresu...
                          </p>
                        )}
                        {addressValidationMessage && (
                          <p className={`text-sm mt-1 ${
                            addressValidationMessage.type === 'success' ? 'text-green-600' :
                            addressValidationMessage.type === 'error' ? 'text-red-600' :
                            'text-yellow-600'
                          }`}>
                            {addressValidationMessage.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="form-label-small">Miasto *</label>
                        <input
                          {...register('location_city', {
                            required: !watchOnlineEvent ? 'Miasto jest wymagane' : false
                          })}
                          className="form-input"
                          placeholder="np. Kraków"
                          onBlur={(e) => {
                            const city = e.target.value.trim();
                            const address = watchAll.location_address?.trim();
                            if (locationType === 'poland' && address && city) {
                              validateAddress(address, city);
                            }
                          }}
                        />
                        {errors.location_city && (
                          <p className="error-text">
                            <AlertCircle className="w-4 h-4" />
                            {errors.location_city.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="form-label-small">Kod pocztowy {locationType === 'poland' && '(XX-XXX)'}</label>
                        <input
                          {...register('location_postal_code', {
                            onChange: (e) => {
                              if (locationType === 'poland') {
                                const formatted = formatPostalCode(e.target.value);
                                setValue('location_postal_code', formatted);
                              }
                            },
                            validate: (value) => {
                              if (locationType === 'poland' && value && !validatePolishPostalCode(value)) {
                                return 'Niepoprawny format kodu (XX-XXX)';
                              }
                              return true;
                            }
                          })}
                          className="form-input"
                          placeholder={locationType === 'poland' ? 'np. 31-001' : 'np. 10115'}
                          maxLength={locationType === 'poland' ? 6 : 10}
                          onBlur={(e) => {
                            const postalCode = e.target.value.trim();
                            if (locationType === 'poland' && postalCode && validatePolishPostalCode(postalCode)) {
                              validatePostalCode(postalCode);
                            }
                          }}
                        />
                        {isValidatingPostalCode && (
                          <p className="text-sm text-blue-600 mt-1 flex items-center gap-1">
                            <span className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                            Weryfikacja kodu pocztowego...
                          </p>
                        )}
                        {postalCodeValidationMessage && (
                          <p className={`text-sm mt-1 ${
                            postalCodeValidationMessage.type === 'success' ? 'text-green-600' :
                            postalCodeValidationMessage.type === 'error' ? 'text-red-600' :
                            'text-yellow-600'
                          }`}>
                            {postalCodeValidationMessage.message}
                          </p>
                        )}
                        {locationType === 'poland' && !isValidatingPostalCode && !postalCodeValidationMessage && (
                          <p className="text-xs text-gray-500 mt-1">Format: XX-XXX (np. 00-001, 31-456)</p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ===== STEP 5: Participants & Tickets ===== */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <h3 className="form-step-header">
                  <Users className="w-6 h-6 text-blue-600" />
                  Limit uczestników i opłaty
                </h3>

                <div className="info-section">
                  <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <span>Jasno określone zasady uczestnictwa pomogą w sprawnej organizacji wydarzenia.</span>
                </div>

                {/* Participant Limit Card */}
                <div className="bg-gray-50 rounded-xl p-5 border-2 border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-4">Limit uczestników</h4>
                  
                  <label className="custom-checkbox mb-4">
                    <input
                      type="checkbox"
                      {...register('is_limited')}
                    />
                    <span className="font-medium text-gray-900">Brak limitu uczestników</span>
                  </label>

                  {!watchIsLimited && (
                    <div>
                      <label className="form-label-small">Limit uczestników</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          {...register('participant_limit', { valueAsNumber: true })}
                          className="form-input flex-1"
                          placeholder="np. 100"
                        />
                        <div className="px-3 py-3 bg-gray-100 rounded-lg border-2 border-gray-200">
                          <Users className="w-5 h-5 text-gray-500" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Event Type / Tickets Card */}
                <div className="bg-gray-50 rounded-xl p-5 border-2 border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-4">Opłaty</h4>
                  <p className="text-gray-600 mb-4">Rodzaj wydarzenia:</p>
                  
                  <div className="space-y-3">
                    {/* Free */}
                    <div
                      onClick={() => setValue('event_type', 'free')}
                      className={`event-type-option ${watchEventType === 'free' ? 'selected' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          checked={watchEventType === 'free'}
                          onChange={() => {}}
                          className="mt-1 w-5 h-5"
                        />
                        <div>
                          <span className="font-medium text-gray-900 flex items-center gap-2">
                            <Gift className="w-5 h-5 text-green-500" />
                            Wydarzenie darmowe
                          </span>
                          <p className="text-sm text-gray-500 mt-1">Wstęp bezpłatny dla wszystkich</p>
                        </div>
                      </div>
                    </div>

                    {/* Voluntary */}
                    <div
                      onClick={() => setValue('event_type', 'voluntary')}
                      className={`event-type-option ${watchEventType === 'voluntary' ? 'selected' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          checked={watchEventType === 'voluntary'}
                          onChange={() => {}}
                          className="mt-1 w-5 h-5"
                        />
                        <div>
                          <span className="font-medium text-gray-900 flex items-center gap-2">
                            <Heart className="w-5 h-5 text-red-500" />
                            Dobrowolna opłata
                          </span>
                          <p className="text-sm text-gray-500 mt-1">Uczestnicy mogą wesprzeć wydarzenie dowolną kwotą</p>
                        </div>
                      </div>
                    </div>

                    {/* Platform Tickets */}
                    <div
                      onClick={() => setValue('event_type', 'platform')}
                      className={`event-type-option ${watchEventType === 'platform' ? 'selected' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          checked={watchEventType === 'platform'}
                          onChange={() => {}}
                          className="mt-1 w-5 h-5"
                        />
                        <div>
                          <span className="font-medium text-gray-900 flex items-center gap-2">
                            <Ticket className="w-5 h-5 text-blue-500" />
                            Bilety przez naszą platformę
                          </span>
                          <p className="text-sm text-gray-500 mt-1">Sprzedawaj bilety bezpośrednio przez nasz system (prowizja 10%, min. 2 PLN)</p>
                        </div>
                      </div>
                    </div>

                    {/* External Tickets */}
                    <div
                      onClick={() => setValue('event_type', 'paid')}
                      className={`event-type-option ${watchEventType === 'paid' ? 'selected' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          checked={watchEventType === 'paid'}
                          onChange={() => {}}
                          className="mt-1 w-5 h-5"
                        />
                        <div>
                          <span className="font-medium text-gray-900 flex items-center gap-2">
                            <ExternalLink className="w-5 h-5 text-gray-500" />
                            Bilety zewnętrzne
                          </span>
                          <p className="text-sm text-gray-500 mt-1">Podaj link do zewnętrznego serwisu sprzedaży biletów (np. eBilet, Eventim)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  {watchEventType === 'platform' && (
                    <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      <Info className="w-4 h-4 mt-0.5" />
                      <span>
                        Jeśli sprzedasz bilety przez platformę, nie będziesz mógł później zmienić rodzaju wydarzenia.
                      </span>
                    </div>
                  )}
                </div>

                {/* Platform Tickets */}
                {watchEventType === 'platform' && (
                  <div className="bg-gray-50 rounded-xl p-5 border-2 border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Euro className="w-5 h-5 text-blue-500" />
                        Typy biletów
                      </h4>
                      <button
                        type="button"
                        onClick={addTicketType}
                        className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-green-600 border-2 border-green-600 rounded-lg hover:bg-green-50 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Dodaj typ biletu
                      </button>
                    </div>

                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                      <p className="text-sm text-blue-800">
                        <Info className="w-4 h-4 inline mr-1" />
                        Dodaj typy biletów, które chcesz sprzedawać. Możesz dodać wiele typów (np. Normalny, VIP, Ulgowy).
                      </p>
                    </div>

                    {(!watchTicketTypes || watchTicketTypes.length === 0) ? (
                      <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                        <Euro className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                        <p className="text-gray-500">Dodaj przynajmniej jeden typ biletu</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {watchTicketTypes.map((_, index) => (
                          <div key={index} className="ticket-type-card">
                            <div className="flex justify-between items-center mb-4">
                              <h5 className="font-medium text-gray-900">Typ biletu #{index + 1}</h5>
                              <button
                                type="button"
                                onClick={() => removeTicketType(index)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="form-label-small">Nazwa biletu *</label>
                                <input
                                  {...register(`ticket_types.${index}.name` as const)}
                                  className="form-input"
                                  placeholder="np. Bilet normalny"
                                />
                              </div>
                              <div>
                                <label className="form-label-small">Cena (PLN) *</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  {...register(`ticket_types.${index}.price` as const, { valueAsNumber: true })}
                                  className="form-input"
                                  placeholder="0.00"
                                />
                              </div>
                              <div>
                                <label className="form-label-small">Ilość *</label>
                                <input
                                  type="number"
                                  {...register(`ticket_types.${index}.quantity` as const, { valueAsNumber: true })}
                                  className="form-input"
                                  placeholder="100"
                                />
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                              <div>
                                <label className="form-label-small">Opis (opcjonalnie)</label>
                                <input
                                  {...register(`ticket_types.${index}.description` as const)}
                                  className="form-input"
                                  placeholder="Krótki opis tego typu biletu"
                                />
                              </div>
                              <div>
                                <label className="form-label-small">Max na zamówienie</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="10"
                                  {...register(`ticket_types.${index}.max_per_order` as const, { valueAsNumber: true })}
                                  className="form-input"
                                  placeholder="5"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* External Tickets */}
                {watchEventType === 'paid' && (
                  <div className="bg-gray-50 rounded-xl p-5 border-2 border-gray-200 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="form-label-small">Cena biletu (orientacyjna)</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.01"
                            {...register('ticket_price', { valueAsNumber: true })}
                            className="form-input flex-1"
                            placeholder="0.00"
                          />
                          <span className="text-gray-500 font-medium">PLN</span>
                        </div>
                      </div>
                      <div>
                        <label className="form-label-small">Link do zakupu biletów *</label>
                        <div className="flex items-center gap-2">
                          <input
                            {...register('ticket_url')}
                            className="form-input flex-1"
                            placeholder="https://..."
                          />
                          <div className="px-3 py-3 bg-gray-100 rounded-lg border-2 border-gray-200">
                            <ExternalLink className="w-5 h-5 text-gray-500" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Ticket Availability Dates */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="date-time-section">
                        <div className="section-title">
                          <Clock className="w-4 h-4 text-blue-500" />
                          <span>Bilety dostępne od</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="date"
                            {...register('available_from_date')}
                            className="form-input"
                          />
                          <input
                            type="time"
                            {...register('available_from_time')}
                            className="form-input"
                          />
                        </div>
                      </div>
                      <div className="date-time-section">
                        <div className="section-title">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span>Bilety dostępne do</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="date"
                            {...register('available_to_date')}
                            className="form-input"
                          />
                          <input
                            type="time"
                            {...register('available_to_time')}
                            className="form-input"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ===== STEP 6: Description ===== */}
            {currentStep === 6 && (
              <div className="space-y-6">
                <h3 className="form-step-header">
                  <FileText className="w-6 h-6 text-blue-600" />
                  Opis wydarzenia
                </h3>

                <div className="info-section">
                  <Lightbulb className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <span>Szczegółowy opis pomoże uczestnikom lepiej zrozumieć, czego mogą się spodziewać na wydarzeniu.</span>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <Info className="w-4 h-4 inline mr-1" />
                    Prosimy korzystać z <strong>przycisku dodawania odnośników</strong>, aby wstawiać linki. 
                    Wklejanie linków jako zwykły tekst może być mniej czytelne dla uczestników.
                  </p>
                </div>

                <div>
                  <label className="form-label">Pełny opis wydarzenia *</label>
                  <div className="bg-white border-2 border-gray-300 rounded-lg overflow-hidden min-h-[500px] ck-editor-large">
                    <CKEditorComponent
                      data={watchAll.description || ''}
                      onChange={(event: any, editor: any) => {
                        const data = editor.getData();
                        setValue('description', data);
                      }}
                      onBlur={() => trigger('description')}
                      config={{
                        toolbar: [
                          'heading',
                          '|',
                          'bold', 'italic', 'link', 'bulletedList', 'numberedList',
                          '|',
                          'blockQuote', 'insertTable',
                          '|',
                          'undo', 'redo'
                        ]
                      }}
                    />
                  </div>
                  {errors.description && (
                    <p className="error-text">
                      <AlertCircle className="w-4 h-4" />
                      {errors.description.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ===== STEP 7: Support/Donation ===== */}
            {currentStep === 7 && (
              <div className="space-y-6">
                {/* Show AI Poster Summary if selected */}
                {watchNeedsPoster ? (
                  <div className="space-y-6">
                    <h3 className="form-step-header text-amber-600" style={{ borderColor: '#ffc107' }}>
                      <Sparkles className="w-6 h-6" />
                      Podsumowanie zapłaty za stworzenie plakatu
                    </h3>

                    <p className="text-gray-600 text-center">
                      Wybrałeś/aś opcję stworzenia plakatu wydarzenia przez naszych specjalistów. 
                      Zostanie ona zrealizowana w ciągu 4-5 dni roboczych. 
                      Po dokonaniu płatności Twoje wydarzenie otrzyma status <strong>Oczekującego</strong>.
                    </p>

                    <div className="p-8 bg-gradient-to-br from-amber-50 to-white border-2 border-amber-300 rounded-2xl text-center">
                      <h4 className="text-lg text-gray-600 mb-2">Wybrana kwota za plakat:</h4>
                      <p className="text-5xl font-bold text-amber-500">{watchAiPosterAmount} zł</p>
                    </div>

                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        <Info className="w-4 h-4 inline mr-1" />
                        Po kliknięciu &quot;Przejdź do płatności&quot; formularz zostanie zapisany i zostaniesz przeniesiony/a do systemu płatności.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <h3 className="form-step-header">
                      <Heart className="w-6 h-6 text-red-500" />
                      Wesprzyj Inicjatywę Katolicką
                    </h3>

                    <div className="p-6 bg-gradient-to-br from-red-50 to-white border border-red-200 rounded-2xl text-center">
                      <Heart className="w-12 h-12 text-red-500 mx-auto mb-4" />
                      <p className="text-gray-700 mb-2">
                        Dziękujemy za dodanie wydarzenia! Twoje zaangażowanie pomaga budować społeczność wierzących.
                      </p>
                      <p className="text-gray-600">
                        Możesz wesprzeć dalszy rozwój naszej platformy poprzez dobrowolną darowiznę.
                      </p>
                    </div>

                    {/* Donation Checkbox */}
                    <label className="custom-checkbox">
                      <input
                        type="checkbox"
                        {...register('make_donation')}
                      />
                      <span className="font-medium text-gray-900">
                        Tak, chcę wesprzeć Inicjatywę Katolicką
                      </span>
                    </label>

                    {/* Donation Amounts */}
                    {watchMakeDonation && (
                      <div className="space-y-4">
                        <label className="block text-sm font-semibold text-gray-700 text-center">
                          Wybierz kwotę darowizny:
                        </label>
                        <div className="donation-options">
                          {DONATION_AMOUNTS.map((amount) => (
                            <button
                              key={amount}
                              type="button"
                              onClick={() => setValue('donation_amount', amount)}
                              className={`donation-btn ${watchDonationAmount === amount ? 'selected' : ''}`}
                            >
                              {amount} zł
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Summary Card */}
                <div className="p-6 bg-gray-50 rounded-xl border-2 border-gray-200 space-y-4">
                  <h4 className="font-semibold text-gray-900 text-lg">Podsumowanie wydarzenia</h4>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Tytuł:</span>
                      <p className="font-medium text-gray-900">{watchAll.title || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Data:</span>
                      <p className="font-medium text-gray-900">
                        {watchAll.start_date ? format(new Date(watchAll.start_date), 'dd.MM.yyyy', { locale: pl }) : '-'}
                        {watchAll.start_time && `, ${watchAll.start_time}`}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Miejsce:</span>
                      <p className="font-medium text-gray-900">
                        {watchAll.online_event ? 'Online' : (watchAll.location_city || '-')}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Typ:</span>
                      <p className="font-medium text-gray-900">
                        {watchEventType === 'free' && 'Bezpłatne'}
                        {watchEventType === 'voluntary' && 'Dobrowolna opłata'}
                        {watchEventType === 'platform' && 'Bilety przez platformę'}
                        {watchEventType === 'paid' && 'Bilety zewnętrzne'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Warning */}
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800">Przed opublikowaniem</p>
                    <p className="text-sm text-yellow-700 mt-1">
                      Po utworzeniu wydarzenie zostanie przesłane do weryfikacji. 
                      Otrzymasz powiadomienie gdy zostanie zaakceptowane.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={prevStep}
                className={`nav-button prev-button ${currentStep === 1 ? 'invisible' : ''}`}
              >
                <ChevronLeft className="w-5 h-5" />
                Poprzedni krok
              </button>

              {currentStep < TOTAL_STEPS ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="nav-button next-button"
                >
                  Następny krok
                  <ChevronRight className="w-5 h-5" />
                </button>
              ) : amountToPay > 0 ? (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="nav-button pay-button"
                >
                  <CreditCard className="w-5 h-5" />
                  {isSubmitting ? 'Przetwarzanie...' : `Zapłać ${amountToPay} zł i dodaj wydarzenie`}
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="nav-button submit-button"
                >
                  <Check className="w-5 h-5" />
                  {isSubmitting ? 'Tworzenie...' : 'Opublikuj wydarzenie'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
