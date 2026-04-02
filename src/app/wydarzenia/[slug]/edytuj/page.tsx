'use client';

import { useState, useEffect, KeyboardEvent, ChangeEvent, use } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { 
  Calendar, MapPin, Clock, 
  Upload, X, Plus, Trash2, Info, ChevronLeft, ChevronRight,
  FileText, Tag, Users, Euro, AlertCircle, Check, 
  ExternalLink, Ticket, Globe, Lightbulb, Gift, Heart, Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import { eventsApi, categoriesApi } from '@/lib/api/events';
import { useAuthStore, useHydration } from '@/stores/authStore';
import toast from 'react-hot-toast';
import { TicketType, Category, Event } from '@/types';

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
  tags: string[];
  ticket_types: Partial<TicketType>[];
}

const TOTAL_STEPS = 6; // Reduced from 7 - no donation/AI poster step for editing

export default function EditEventPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();
  const hydrated = useHydration();
  
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [tagInput, setTagInput] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [locationQuery, setLocationQuery] = useState('');
  const [locationResults, setLocationResults] = useState<any[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [locationType, setLocationType] = useState<'poland' | 'foreign'>('poland');
  const [eventId, setEventId] = useState<number | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

  // Fetch event data
  const { data: event, isLoading: isLoadingEvent, error: eventError } = useQuery({
    queryKey: ['event', resolvedParams.slug],
    queryFn: () => eventsApi.getEvent(resolvedParams.slug),
    enabled: isAuthenticated,
  });

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
    reset,
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
      tags: [],
      ticket_types: [],
    },
  });

  const watchAll = watch();
  const watchEventType = watch('event_type');
  const watchOnlineEvent = watch('online_event');
  const watchIsLimited = watch('is_limited');
  const watchIsPermanent = watch('is_permanent');
  const watchTicketTypes = watch('ticket_types');
  const watchCategoryIds = watch('category_ids');
  const watchTags = watch('tags');

  // Redirect if not authenticated
  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.push(`/logowanie?redirect=/wydarzenia/${resolvedParams.slug}/edytuj`);
    }
  }, [hydrated, isAuthenticated, router, resolvedParams.slug]);

  // Check authorization - only owner or admin can edit
  useEffect(() => {
    if (event && user) {
      const isOwner = event.user?.id === user.id;
      const isAdmin = user.is_staff;
      
      if (!isOwner && !isAdmin) {
        toast.error('Nie masz uprawnień do edycji tego wydarzenia');
        router.push(`/wydarzenia/${resolvedParams.slug}`);
      }
    }
  }, [event, user, router, resolvedParams.slug]);

  // Populate form with event data
  useEffect(() => {
    if (event) {
      setEventId(event.id);
      
      // Parse dates
      const startDate = event.start_date ? new Date(event.start_date) : null;
      const endDate = event.end_date ? new Date(event.end_date) : null;
      const availableFrom = event.available_from ? new Date(event.available_from) : null;
      const availableTo = event.available_to ? new Date(event.available_to) : null;

      // Set image preview if exists
      if (event.image) {
        setImagePreview(event.image);
      }

      // Set location query for display
      if (event.location) {
        const locationParts = [
          event.location.address,
          event.location.city,
        ].filter(Boolean);
        setLocationQuery(locationParts.join(', '));
      }

      // Reset form with event data
      reset({
        title: event.title || '',
        description: event.description || '',
        category_ids: event.categories?.map((c: Category) => c.id) || [],
        event_type: event.event_type || 'free',
        is_permanent: event.is_permanent || false,
        start_date: startDate ? format(startDate, 'yyyy-MM-dd') : '',
        start_time: startDate ? format(startDate, 'HH:mm') : '10:00',
        end_date: endDate ? format(endDate, 'yyyy-MM-dd') : '',
        end_time: endDate ? format(endDate, 'HH:mm') : '12:00',
        available_from_date: availableFrom ? format(availableFrom, 'yyyy-MM-dd') : '',
        available_from_time: availableFrom ? format(availableFrom, 'HH:mm') : '09:00',
        available_to_date: availableTo ? format(availableTo, 'yyyy-MM-dd') : '',
        available_to_time: availableTo ? format(availableTo, 'HH:mm') : '23:59',
        location_address: event.location?.address || '',
        location_city: event.location?.city || '',
        location_postal_code: event.location?.postal_code || '',
        location_region: event.location?.region || '',
        participant_limit: event.participant_limit || null,
        is_limited: event.is_limited ?? true,
        is_fully_booked: event.is_fully_booked || false,
        ticket_price: event.ticket_price || null,
        ticket_url: event.ticket_url || '',
        online_event: event.online_event || false,
        online_link: event.online_link || '',
        tags: event.tags?.map((t: { name: string }) => t.name) || [],
        ticket_types: [], // Will be populated separately if needed
      });
    }
  }, [event, reset]);

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
        const response = await fetch(`${API_BASE}/nominatim/?q=${encodeURIComponent(locationQuery)}`);
        const data = await response.json();
        setLocationResults(Array.isArray(data) ? data : []);
      } catch {
        setLocationResults([]);
      } finally {
        setIsSearchingLocation(false);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [locationQuery, API_BASE]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      if (!eventId) {
        throw new Error('Brak ID wydarzenia');
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

      const eventData = {
        title: data.title,
        description: data.description,
        categories: data.category_ids,
        event_type: data.event_type,
        is_permanent: data.is_permanent,
        start_date: startDateTime,
        end_date: endDateTime,
        location: !data.online_event ? {
          address: data.location_address,
          city: data.location_city,
          postal_code: data.location_postal_code,
          region: data.location_region,
        } : undefined,
        participant_limit: data.is_limited ? undefined : data.participant_limit,
        is_limited: data.is_limited,
        is_fully_booked: data.is_fully_booked,
        ticket_price: data.ticket_price || undefined,
        ticket_url: data.ticket_url || undefined,
        available_from: availableFrom,
        available_to: availableTo,
        online_event: data.online_event,
        online_link: data.online_link || undefined,
        tags: data.tags,
        ticket_types: data.event_type === 'platform' ? data.ticket_types.map(tt => ({
          name: tt.name || '',
          price: tt.price || 0,
          quantity: tt.quantity || 100,
          description: tt.description,
          max_per_order: tt.max_per_order,
        })) : undefined,
      };
      
      return eventsApi.updateEvent(eventId, eventData);
    },
    onSuccess: async (data) => {
      toast.success('Wydarzenie zostało zaktualizowane!');
      queryClient.invalidateQueries({ queryKey: ['event', resolvedParams.slug] });
      queryClient.invalidateQueries({ queryKey: ['my-events'] });
      router.push(`/wydarzenia/${data.slug}`);
    },
    onError: () => {
      toast.error('Nie udało się zaktualizować wydarzenia');
    },
  });

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
    updateMutation.mutate(data);
  };

  const validateCurrentStep = async (): Promise<boolean> => {
    switch (currentStep) {
      case 1:
        return await trigger(['title']);
      case 2:
        return await trigger(['start_date', 'start_time']);
      case 3:
        return watchCategoryIds.length > 0;
      case 4:
        if (watchOnlineEvent) {
          return await trigger(['online_link']);
        }
        return await trigger(['location_city']);
      case 5:
        if (watchEventType === 'platform' && (!watchTicketTypes || watchTicketTypes.length === 0)) {
          toast.error('Dodaj przynajmniej jeden typ biletu');
          return false;
        }
        return true;
      case 6:
        return await trigger(['description']);
      default:
        return true;
    }
  };

  const nextStep = async () => {
    const isValid = await validateCurrentStep();
    if (isValid && currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Loading state
  if (isLoadingEvent) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary-500 mx-auto mb-4" />
          <p className="text-gray-600">Ładowanie wydarzenia...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (eventError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Nie udało się załadować wydarzenia</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-primary-500 text-black rounded-lg hover:bg-primary-600"
          >
            Wróć
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const steps = [
    { id: 1, name: 'Podstawowe', icon: FileText },
    { id: 2, name: 'Termin', icon: Calendar },
    { id: 3, name: 'Kategoria', icon: Tag },
    { id: 4, name: 'Lokalizacja', icon: MapPin },
    { id: 5, name: 'Uczestnicy', icon: Users },
    { id: 6, name: 'Opis', icon: FileText },
  ];

  const progressPercent = (currentStep / TOTAL_STEPS) * 100;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Calendar className="w-16 h-16 mx-auto text-primary-500 mb-4" />
          <h1 className="text-3xl font-bold text-gray-900">
            Edytuj <span className="text-primary-500">wydarzenie</span>
          </h1>
          <p className="text-gray-600 mt-2">Wprowadź zmiany w swoim wydarzeniu.</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-4">
            <div 
              className="h-full bg-primary-500 transition-all duration-300"
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
                    ${isActive ? 'bg-primary-100 text-primary-700' : ''}
                    ${isCompleted ? 'text-primary-600' : 'text-gray-400'}
                    ${step.id <= currentStep ? 'cursor-pointer hover:bg-primary-50' : 'cursor-not-allowed'}
                  `}
                  disabled={step.id > currentStep}
                >
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center
                    ${isActive ? 'bg-primary-500 text-black' : ''}
                    ${isCompleted ? 'bg-primary-100 text-primary-600' : 'bg-gray-100'}
                  `}>
                    {isCompleted ? <Check className="w-4 h-4" /> : <span className="text-sm font-medium">{step.id}</span>}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${isActive ? 'text-primary-700' : ''}`}>
                    {step.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
            
            {/* ===== STEP 1: Basic Info ===== */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 pb-4 border-b-2 border-primary-500">
                  <Info className="w-6 h-6 text-primary-500" />
                  Podstawowe informacje
                </h2>

                {/* Title */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nazwa wydarzenia *
                  </label>
                  <input
                    {...register('title', { required: 'Nazwa wydarzenia jest wymagana' })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-0 transition-colors"
                    placeholder="Nazwa wydarzenia"
                  />
                  {errors.title && (
                    <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.title.message}
                    </p>
                  )}
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Zdjęcie główne wydarzenia
                  </label>
                  <p className="text-sm text-gray-500 mb-3">
                    Wybierz zdjęcie, które najlepiej reprezentuje Twoje wydarzenie.
                  </p>
                  
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Podgląd"
                        className="w-full h-64 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute top-3 right-3 p-2 bg-red-500 text-black rounded-full hover:bg-red-600 shadow-lg"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-500 hover:bg-primary-50/30 transition-all">
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
              </div>
            )}

            {/* ===== STEP 2: Date/Time ===== */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 pb-4 border-b-2 border-primary-500">
                  <Calendar className="w-6 h-6 text-primary-500" />
                  Termin wydarzenia
                </h2>

                <div className="p-4 bg-blue-50 border-l-4 border-primary-500 rounded-r-lg">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-primary-800">
                      Dokładne określenie daty i czasu pomoże uczestnikom zaplanować udział w wydarzeniu.
                    </p>
                  </div>
                </div>

                {/* Start Date/Time */}
                <div className="p-5 bg-gray-50 border-2 border-gray-200 rounded-xl">
                  <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <Clock className="w-4 h-4 text-primary-600" />
                    </span>
                    Data i godzina rozpoczęcia
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">
                        Data rozpoczęcia *
                      </label>
                      <input
                        type="date"
                        {...register('start_date', { required: 'Data jest wymagana' })}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-0"
                      />
                      {errors.start_date && (
                        <p className="mt-1 text-sm text-red-500">{errors.start_date.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">
                        Godzina rozpoczęcia *
                      </label>
                      <input
                        type="time"
                        {...register('start_time', { required: 'Godzina jest wymagana' })}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-0"
                      />
                    </div>
                  </div>
                </div>

                {/* Permanent Event Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
                  <label htmlFor="is_permanent" className="cursor-pointer">
                    <span className="font-medium text-gray-900">Wydarzenie trwa cały czas</span>
                    <p className="text-sm text-gray-500">Zaznacz, jeśli wydarzenie nie ma konkretnej daty zakończenia</p>
                  </label>
                  <input
                    type="checkbox"
                    id="is_permanent"
                    {...register('is_permanent')}
                    className="w-6 h-6 text-primary-500 rounded focus:ring-primary-500"
                  />
                </div>

                {/* End Date/Time */}
                {!watchIsPermanent && (
                  <div className="p-5 bg-gray-50 border-2 border-gray-200 rounded-xl">
                    <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <span className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <Clock className="w-4 h-4 text-gray-600" />
                      </span>
                      Data i godzina zakończenia
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          Data zakończenia
                        </label>
                        <input
                          type="date"
                          {...register('end_date')}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          Godzina zakończenia
                        </label>
                        <input
                          type="time"
                          {...register('end_time')}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-0"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ===== STEP 3: Categories & Tags ===== */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 pb-4 border-b-2 border-primary-500">
                  <Tag className="w-6 h-6 text-primary-500" />
                  Kategoria i tagi
                </h2>

                <div className="p-4 bg-blue-50 border-l-4 border-primary-500 rounded-r-lg">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-primary-800">
                      Odpowiednia kategoryzacja zwiększa szansę, że Twoje wydarzenie zostanie zauważone przez właściwych odbiorców.
                    </p>
                  </div>
                </div>

                {/* Categories */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Kategorie *
                  </label>
                  <p className="text-sm text-gray-500 mb-3">
                    <Info className="w-4 h-4 inline mr-1" />
                    Możesz wybrać maksymalnie 3 kategorie
                  </p>
                  
                  <div className="border-2 border-gray-200 rounded-xl p-4 max-h-96 overflow-y-auto bg-gray-50">
                    <div className="space-y-2">
                      {categories
                        .filter((cat: Category) => cat.name.toLowerCase() !== 'top10' && cat.name.toLowerCase() !== 'polecane')
                        .map((category: Category) => {
                          const isSelected = watchCategoryIds.includes(category.id);
                          const isDisabled = !isSelected && watchCategoryIds.length >= 3;
                          
                          return (
                            <label
                              key={category.id}
                              className={`
                                flex items-center gap-3 p-3 bg-white border-2 rounded-lg cursor-pointer transition-all
                                ${isSelected ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'}
                                ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                              `}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => !isDisabled && toggleCategory(category.id)}
                                disabled={isDisabled}
                                className="w-5 h-5 text-primary-500 rounded focus:ring-primary-500"
                              />
                              <span className="font-medium text-gray-700">{category.name}</span>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                  {watchCategoryIds.length === 0 && (
                    <p className="mt-2 text-sm text-red-500">Wybierz przynajmniej jedną kategorię</p>
                  )}
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Tag className="w-4 h-4 inline mr-1" />
                    Tagi (słowa kluczowe)
                  </label>
                  
                  {/* Tags display */}
                  <div className="min-h-[60px] p-3 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 mb-3">
                    {watchTags.length === 0 ? (
                      <p className="text-gray-400 italic">Dodane tagi pojawią się tutaj</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {watchTags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-primary-500 to-primary-600 text-black rounded-full text-sm font-medium shadow-sm"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => removeTag(index)}
                              className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/40 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Tag input */}
                  <div className="relative">
                    <div className="flex">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleTagKeyDown}
                        placeholder="Wpisz tag i naciśnij Enter"
                        className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-l-lg focus:border-primary-500 focus:ring-0"
                      />
                      <button
                        type="button"
                        onClick={() => tagInput.trim() && addTag(tagInput)}
                        className="px-4 bg-primary-500 text-black rounded-r-lg hover:bg-primary-600 transition-colors"
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
                  <p className="text-sm text-gray-500 mt-2">
                    <Info className="w-4 h-4 inline mr-1" />
                    Podaj znaczniki rozdzielone przecinkami, wielowyrazowe w cudzysłowie
                  </p>
                </div>
              </div>
            )}

            {/* ===== STEP 4: Location ===== */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 pb-4 border-b-2 border-primary-500">
                  <MapPin className="w-6 h-6 text-primary-500" />
                  Lokalizacja
                </h2>

                <div className="p-4 bg-blue-50 border-l-4 border-primary-500 rounded-r-lg">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-primary-800">
                      Określ miejsce, w którym odbędzie się Twoje wydarzenie.
                    </p>
                  </div>
                </div>

                {/* Online Event Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
                  <label htmlFor="online_event" className="cursor-pointer flex items-center gap-3">
                    <Globe className="w-6 h-6 text-primary-500" />
                    <div>
                      <span className="font-medium text-gray-900">Wydarzenie online</span>
                      <p className="text-sm text-gray-500">Zaznacz, jeśli wydarzenie odbywa się online</p>
                    </div>
                  </label>
                  <input
                    type="checkbox"
                    id="online_event"
                    {...register('online_event')}
                    className="w-6 h-6 text-primary-500 rounded focus:ring-primary-500"
                  />
                </div>

                {/* Online Link */}
                {watchOnlineEvent && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Link do wydarzenia online *
                    </label>
                    <input
                      {...register('online_link', { 
                        required: watchOnlineEvent ? 'Link jest wymagany dla wydarzenia online' : false 
                      })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-0"
                      placeholder="https://..."
                    />
                    {errors.online_link && (
                      <p className="mt-1 text-sm text-red-500">{errors.online_link.message}</p>
                    )}
                  </div>
                )}

                {/* Physical Location */}
                {!watchOnlineEvent && (
                  <>
                    {/* Location Type */}
                    <div className="flex gap-4 justify-center">
                      <label className={`
                        flex flex-col items-center gap-2 p-4 border-2 rounded-xl cursor-pointer transition-all flex-1 max-w-xs
                        ${locationType === 'poland' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'}
                      `}>
                        <input
                          type="radio"
                          name="locationType"
                          value="poland"
                          checked={locationType === 'poland'}
                          onChange={() => setLocationType('poland')}
                          className="sr-only"
                        />
                        <MapPin className="w-6 h-6 text-primary-500" />
                        <span className="font-medium text-sm">Lokalizacja w Polsce</span>
                      </label>
                      <label className={`
                        flex flex-col items-center gap-2 p-4 border-2 rounded-xl cursor-pointer transition-all flex-1 max-w-xs
                        ${locationType === 'foreign' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'}
                      `}>
                        <input
                          type="radio"
                          name="locationType"
                          value="foreign"
                          checked={locationType === 'foreign'}
                          onChange={() => setLocationType('foreign')}
                          className="sr-only"
                        />
                        <Globe className="w-6 h-6 text-primary-500" />
                        <span className="font-medium text-sm">Lokalizacja zagraniczna</span>
                      </label>
                    </div>

                    {/* Location Search */}
                    <div className="relative">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Wyszukaj adres
                      </label>
                      <input
                        value={locationQuery}
                        onChange={(e) => setLocationQuery(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-0"
                        placeholder="np. ul. Długa 5, Kraków"
                      />
                      {isSearchingLocation && (
                        <div className="absolute right-3 top-10 text-sm text-gray-400">Szukam...</div>
                      )}
                      
                      {locationResults.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-white border-2 border-gray-200 rounded-lg shadow-lg max-h-64 overflow-auto">
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
                      )}
                    </div>

                    {/* Location Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          Adres *
                        </label>
                        <input
                          {...register('location_address')}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-0"
                          placeholder="np. ul. Kościelna 12"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          Miasto *
                        </label>
                        <input
                          {...register('location_city', { 
                            required: !watchOnlineEvent ? 'Miasto jest wymagane' : false 
                          })}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-0"
                          placeholder="np. Kraków"
                        />
                        {errors.location_city && (
                          <p className="mt-1 text-sm text-red-500">{errors.location_city.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          Kod pocztowy
                        </label>
                        <input
                          {...register('location_postal_code')}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-0"
                          placeholder="np. 31-001"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ===== STEP 5: Participants & Tickets ===== */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 pb-4 border-b-2 border-primary-500">
                  <Users className="w-6 h-6 text-primary-500" />
                  Limit uczestników i opłaty
                </h2>

                <div className="p-4 bg-blue-50 border-l-4 border-primary-500 rounded-r-lg">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-primary-800">
                      Jasno określone zasady uczestnictwa pomogą w sprawnej organizacji wydarzenia.
                    </p>
                  </div>
                </div>

                {/* Participant Limit */}
                <div className="p-5 bg-gray-50 rounded-xl border-2 border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-4">Limit uczestników</h3>
                  
                  <div className="flex items-center justify-between mb-4 p-3 bg-white rounded-lg border border-gray-200">
                    <label htmlFor="is_limited" className="cursor-pointer">
                      <span className="font-medium text-gray-900">Brak limitu uczestników</span>
                    </label>
                    <input
                      type="checkbox"
                      id="is_limited"
                      {...register('is_limited')}
                      className="w-5 h-5 text-primary-500 rounded focus:ring-primary-500"
                    />
                  </div>

                  {!watchIsLimited && (
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-2">
                        Limit uczestników
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          {...register('participant_limit', { valueAsNumber: true })}
                          className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-0"
                          placeholder="np. 100"
                        />
                        <Users className="w-6 h-6 text-gray-400" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Event Type / Tickets */}
                <div className="p-5 bg-gray-50 rounded-xl border-2 border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-4">Rodzaj wydarzenia</h3>
                  
                  <div className="space-y-3">
                    <label className={`
                      flex items-start gap-3 p-4 bg-white border-2 rounded-xl cursor-pointer transition-all
                      ${watchEventType === 'free' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-green-300'}
                    `}>
                      <input
                        type="radio"
                        value="free"
                        {...register('event_type')}
                        className="mt-1 w-5 h-5 text-green-500"
                      />
                      <div>
                        <span className="font-medium text-gray-900 flex items-center gap-2">
                          <Gift className="w-5 h-5 text-green-500" />
                          Wydarzenie darmowe
                        </span>
                        <p className="text-sm text-gray-500 mt-1">Wstęp bezpłatny dla wszystkich</p>
                      </div>
                    </label>

                    <label className={`
                      flex items-start gap-3 p-4 bg-white border-2 rounded-xl cursor-pointer transition-all
                      ${watchEventType === 'voluntary' ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-red-300'}
                    `}>
                      <input
                        type="radio"
                        value="voluntary"
                        {...register('event_type')}
                        className="mt-1 w-5 h-5 text-red-500"
                      />
                      <div>
                        <span className="font-medium text-gray-900 flex items-center gap-2">
                          <Heart className="w-5 h-5 text-red-500" />
                          Dobrowolna opłata
                        </span>
                        <p className="text-sm text-gray-500 mt-1">Uczestnicy mogą wesprzeć wydarzenie dowolną kwotą</p>
                      </div>
                    </label>

                    <label className={`
                      flex items-start gap-3 p-4 bg-white border-2 rounded-xl cursor-pointer transition-all
                      ${watchEventType === 'platform' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-primary-300'}
                    `}>
                      <input
                        type="radio"
                        value="platform"
                        {...register('event_type')}
                        className="mt-1 w-5 h-5 text-primary-500"
                      />
                      <div>
                        <span className="font-medium text-gray-900 flex items-center gap-2">
                          <Ticket className="w-5 h-5 text-primary-500" />
                          Bilety przez naszą platformę
                        </span>
                        <p className="text-sm text-gray-500 mt-1">Sprzedawaj bilety bezpośrednio przez nasz system (prowizja 10%, min. 2 PLN)</p>
                      </div>
                    </label>

                    <label className={`
                      flex items-start gap-3 p-4 bg-white border-2 rounded-xl cursor-pointer transition-all
                      ${watchEventType === 'paid' ? 'border-gray-500 bg-gray-100' : 'border-gray-200 hover:border-gray-400'}
                    `}>
                      <input
                        type="radio"
                        value="paid"
                        {...register('event_type')}
                        className="mt-1 w-5 h-5 text-gray-500"
                      />
                      <div>
                        <span className="font-medium text-gray-900 flex items-center gap-2">
                          <ExternalLink className="w-5 h-5 text-gray-500" />
                          Bilety zewnętrzne
                        </span>
                        <p className="text-sm text-gray-500 mt-1">Podaj link do zewnętrznego serwisu sprzedaży biletów</p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Platform Tickets */}
                {watchEventType === 'platform' && (
                  <div className="p-5 bg-gray-50 rounded-xl border-2 border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Euro className="w-5 h-5 text-primary-500" />
                        Typy biletów
                      </h3>
                      <button
                        type="button"
                        onClick={addTicketType}
                        className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-green-600 border-2 border-green-600 rounded-lg hover:bg-green-50 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Dodaj typ
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
                          <div key={index} className="p-4 bg-white border-2 border-gray-200 rounded-xl">
                            <div className="flex justify-between items-center mb-4">
                              <h4 className="font-medium text-gray-900">Typ biletu #{index + 1}</h4>
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
                                <label className="block text-sm font-medium text-gray-600 mb-1">
                                  Nazwa biletu *
                                </label>
                                <input
                                  {...register(`ticket_types.${index}.name` as const)}
                                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-0"
                                  placeholder="np. Bilet normalny"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">
                                  Cena (PLN) *
                                </label>
                                <input
                                  type="number"
                                  step="0.01"
                                  {...register(`ticket_types.${index}.price` as const, { valueAsNumber: true })}
                                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-0"
                                  placeholder="0.00"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-600 mb-1">
                                  Ilość *
                                </label>
                                <input
                                  type="number"
                                  {...register(`ticket_types.${index}.quantity` as const, { valueAsNumber: true })}
                                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-0"
                                  placeholder="100"
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
                  <div className="p-5 bg-gray-50 rounded-xl border-2 border-gray-200 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          Cena biletu (orientacyjna)
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.01"
                            {...register('ticket_price', { valueAsNumber: true })}
                            className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-0"
                            placeholder="0.00"
                          />
                          <span className="text-gray-500 font-medium">PLN</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">
                          Link do zakupu biletów *
                        </label>
                        <input
                          {...register('ticket_url', {
                            required: watchEventType === 'paid' ? 'Link do biletów jest wymagany' : false
                          })}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-0"
                          placeholder="https://..."
                        />
                        {errors.ticket_url && (
                          <p className="mt-1 text-sm text-red-500">{errors.ticket_url.message}</p>
                        )}
                      </div>
                    </div>

                    {/* Ticket Availability Dates */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-white rounded-lg border border-gray-200">
                        <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-primary-500" />
                          Bilety dostępne od
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="date"
                            {...register('available_from_date')}
                            className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-0"
                          />
                          <input
                            type="time"
                            {...register('available_from_time')}
                            className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-0"
                          />
                        </div>
                      </div>
                      <div className="p-4 bg-white rounded-lg border border-gray-200">
                        <h4 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-500" />
                          Bilety dostępne do
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="date"
                            {...register('available_to_date')}
                            className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-0"
                          />
                          <input
                            type="time"
                            {...register('available_to_time')}
                            className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-0"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ===== STEP 6: Description (Final Step) ===== */}
            {currentStep === 6 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2 pb-4 border-b-2 border-primary-500">
                  <FileText className="w-6 h-6 text-primary-500" />
                  Opis wydarzenia
                </h2>

                <div className="p-4 bg-blue-50 border-l-4 border-primary-500 rounded-r-lg">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-primary-800">
                      Szczegółowy opis pomoże uczestnikom lepiej zrozumieć, czego mogą się spodziewać na wydarzeniu.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <Info className="w-4 h-4 inline mr-1" />
                    Prosimy korzystać z <strong>przycisku dodawania odnośników</strong>, aby wstawiać linki. 
                    Wklejanie linków jako zwykły tekst może być mniej czytelne dla uczestników.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Pełny opis wydarzenia *
                  </label>
                  <textarea
                    {...register('description', { required: 'Opis jest wymagany' })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-0 min-h-[300px]"
                    placeholder="Opisz szczegółowo swoje wydarzenie..."
                  />
                  {errors.description && (
                    <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.description.message}
                    </p>
                  )}
                </div>

                {/* Summary Card */}
                <div className="p-6 bg-gray-50 rounded-xl border-2 border-gray-200 space-y-4">
                  <h3 className="font-semibold text-gray-900 text-lg">Podsumowanie wydarzenia</h3>
                  
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

                {/* Info Notice */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
                  <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-800">Zapisywanie zmian</p>
                    <p className="text-sm text-blue-700 mt-1">
                      Po zapisaniu zmiany zostaną natychmiast zastosowane do Twojego wydarzenia.
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
                className={`
                  flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all
                  ${currentStep === 1 
                    ? 'invisible' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }
                `}
              >
                <ChevronLeft className="w-5 h-5" />
                Poprzedni krok
              </button>

              {currentStep < TOTAL_STEPS ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex items-center gap-2 px-6 py-3 bg-primary-500 text-black rounded-xl font-medium hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/30"
                >
                  Następny krok
                  <ChevronRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="flex items-center gap-2 px-6 py-3 bg-green-500 text-black rounded-xl font-medium hover:bg-green-600 transition-all shadow-lg shadow-green-500/30 disabled:opacity-50"
                >
                  <Check className="w-5 h-5" />
                  {updateMutation.isPending ? 'Zapisywanie...' : 'Zapisz zmiany'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
