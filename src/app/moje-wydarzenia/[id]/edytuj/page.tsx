'use client';

import { useEffect, useState } from 'react';
import { use } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Save, Ticket, BarChart3, ArrowLeft, AlertTriangle, MapPin, Globe, ExternalLink, Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { eventsApi } from '@/lib/api/events';
import { apiClient } from '@/lib/api/client';
import { locationsApi } from '@/lib/api/locations';
import { useAuthStore } from '@/stores/authStore';
import dynamic from 'next/dynamic';
import { 
  STATUS_CHOICES, 
  EVENT_TYPE_CHOICES,
  isEventEditable,
  shouldAutoClose,
  shouldAutoReopen,
  getEffectiveStatus,
  getAllowedStatusTransitions
} from '@/lib/eventUtils';
import { StatusBadge } from '@/components/StatusBadge';
import type { EventStatus, EventType } from '@/types';

const CKEditorWrapper = dynamic(() => import('@/components/CKEditorWrapper'), { ssr: false });

interface EditEventFormData {
  title: string;
  description: string;
  event_type: EventType;
  status: EventStatus;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  available_from_date: string;
  available_from_time: string;
  available_to_date: string;
  available_to_time: string;
  is_permanent: boolean;
  online_event: boolean;
  online_link: string;
  location_address: string;
  location_city: string;
  location_postal_code: string;
  location_region: string;
  ticket_price: number | null;
  ticket_url: string;
  participant_limit: number | null;
  is_limited: boolean;
  is_fully_booked: boolean;
  meta_description: string;
}

interface Props {
  params: Promise<{ id: string }>;
}

export default function EditEventPage({ params }: Props) {
  const resolvedParams = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'basic' | 'tickets' | 'stats'>('basic');
  const [description, setDescription] = useState('');
  const [locationType, setLocationType] = useState<'poland' | 'foreign'>('poland');
  const [locationQuery, setLocationQuery] = useState('');
  const [locationResults, setLocationResults] = useState<any[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [isValidatingAddress, setIsValidatingAddress] = useState(false);
  const [isValidatingPostalCode, setIsValidatingPostalCode] = useState(false);
  const [addressValidationMessage, setAddressValidationMessage] = useState<{
    type: 'success' | 'error' | 'suggestion';
    message: string;
  } | null>(null);
  const [postalCodeValidationMessage, setPostalCodeValidationMessage] = useState<{
    type: 'success' | 'error' | 'suggestion';
    message: string;
  } | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const eventId = Number(resolvedParams.id);

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventsApi.getEvent(eventId),
    enabled: !!eventId,
  });

  const { data: ticketTypes } = useQuery({
    queryKey: ['ticket-types', eventId],
    queryFn: async () => {
      const response = await apiClient.get(`/tickets/event/${eventId}/types/`);
      return response.data?.ticket_types || [];
    },
    enabled: !!eventId,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EditEventFormData>({
    defaultValues: {
      title: '',
      description: '',
      event_type: 'free',
      status: 'draft',
      start_date: '',
      start_time: '10:00',
      end_date: '',
      end_time: '12:00',
      available_from_date: '',
      available_from_time: '',
      available_to_date: '',
      available_to_time: '',
      is_permanent: false,
      online_event: false,
      online_link: '',
      location_address: '',
      location_city: '',
      location_postal_code: '',
      location_region: '',
      ticket_price: null,
      ticket_url: '',
      participant_limit: null,
      is_limited: false,
      is_fully_booked: false,
      meta_description: '',
    },
  });

  const watchEventType = watch('event_type');
  const watchOnlineEvent = watch('online_event');
  const watchFullyBooked = watch('is_fully_booked');
  const watchAll = watch();
  const isTicketsDisabled = watchEventType !== 'platform';
  const hasSoldTickets = (ticketTypes || []).some((t: any) => (t.quantity_sold ?? 0) > 0);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/logowanie?redirect=/moje-wydarzenia');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!event) return;
    const start = new Date(event.start_date);
    const end = event.end_date ? new Date(event.end_date) : null;
    const rawAvailableFrom = (event as any).available_from ?? (event as any).available_from_date ?? '';
    const rawAvailableTo = (event as any).available_to ?? (event as any).available_to_date ?? '';
    const availableFromDate = typeof rawAvailableFrom === 'string' && rawAvailableFrom
      ? rawAvailableFrom.slice(0, 10)
      : '';
    const availableFromTime = typeof rawAvailableFrom === 'string' && rawAvailableFrom.includes('T')
      ? rawAvailableFrom.slice(11, 16)
      : (typeof (event as any).available_from_time === 'string' ? (event as any).available_from_time : '');
    const availableToDate = typeof rawAvailableTo === 'string' && rawAvailableTo
      ? rawAvailableTo.slice(0, 10)
      : '';
    const availableToTime = typeof rawAvailableTo === 'string' && rawAvailableTo.includes('T')
      ? rawAvailableTo.slice(11, 16)
      : (typeof (event as any).available_to_time === 'string' ? (event as any).available_to_time : '');
    const country = event.location?.country?.toLowerCase();
    const isPoland = !country || ['pl', 'poland', 'polska'].includes(country);
    setDescription(event.description);
    setLocationType(isPoland ? 'poland' : 'foreign');
    // Set existing image as preview
    if (event.image) {
      setImagePreview(event.image);
    }
    if (event.location?.address || event.location?.city) {
      setLocationQuery(
        [event.location?.address, event.location?.city].filter(Boolean).join(', ')
      );
    }
    reset({
      title: event.title,
      description: event.description,
      event_type: event.event_type,
      status: event.status || 'draft',
      start_date: start.toISOString().slice(0, 10),
      start_time: start.toISOString().slice(11, 16),
      end_date: end ? end.toISOString().slice(0, 10) : '',
      end_time: end ? end.toISOString().slice(11, 16) : '12:00',
      available_from_date: availableFromDate,
      available_from_time: availableFromTime,
      available_to_date: availableToDate,
      available_to_time: availableToTime,
      is_permanent: event.is_permanent,
      online_event: event.online_event,
      online_link: event.online_link || '',
      location_address: event.location?.address || '',
      location_city: event.location?.city || '',
      location_postal_code: event.location?.postal_code || '',
      location_region: event.location?.region || '',
      ticket_price: event.ticket_price !== undefined && event.ticket_price !== null ? Number(event.ticket_price) : null,
      ticket_url: event.ticket_url || '',
      participant_limit: event.participant_limit || null,
      is_limited: event.is_limited,
      is_fully_booked: event.is_fully_booked,
      meta_description: event.meta_description || '',
    });
  }, [event, reset]);

  useEffect(() => {
    if (activeTab === 'tickets' && watchEventType !== 'platform') {
      setActiveTab('basic');
    }
  }, [activeTab, watchEventType]);

  useEffect(() => {
    if (watchEventType !== 'paid') {
      setValue('ticket_url', '');
      setValue('ticket_price', null);
      setValue('available_from_date', '');
      setValue('available_from_time', '');
      setValue('available_to_date', '');
      setValue('available_to_time', '');
    }
  }, [watchEventType, setValue]);

  useEffect(() => {
    if (!locationQuery || locationQuery.length < 3) {
      setLocationResults([]);
      return;
    }

    const controller = new AbortController();
    setIsSearchingLocation(true);

    fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationQuery)}&format=json&addressdetails=1&limit=5`,
      {
        headers: { 'Accept-Language': 'pl' },
        signal: controller.signal,
      }
    )
      .then((response) => response.json())
      .then((data) => {
        setLocationResults(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setLocationResults([]);
      })
      .finally(() => {
        setIsSearchingLocation(false);
      });

    return () => controller.abort();
  }, [locationQuery]);

  const validatePolishPostalCode = (code: string): boolean => {
    return /^\d{2}-\d{3}$/.test(code.trim());
  };

  const formatPostalCode = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}-${digits.slice(2, 5)}`;
  };

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

      if (result.city && !watchAll.location_city) {
        setValue('location_city', result.city);
      } else if (result.city && watchAll.location_city && result.city.toLowerCase() !== watchAll.location_city.toLowerCase()) {
        setPostalCodeValidationMessage({
          type: 'suggestion',
          message: `Sugerowane miasto dla tego kodu: ${result.city}`,
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

    const normalizedAddress = address.trim().replace(/^ul\.?\s*/i, '');

    try {
      const result = await locationsApi.validateAddress(normalizedAddress, city);

      if (!result.valid) {
        setAddressValidationMessage({ type: 'error', message: result.error || 'Nie znaleziono podanego adresu' });
        setIsValidatingAddress(false);
        return false;
      }

      if (result.city && result.city.toLowerCase() !== city.toLowerCase()) {
        setAddressValidationMessage({
          type: 'suggestion',
          message: `Sugerowane miasto: ${result.city}`,
        });
      }

      if (result.postal_code && !watchAll.location_postal_code) {
        setValue('location_postal_code', result.postal_code);
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

  // Handle image change
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Plik jest za duży. Maksymalny rozmiar to 5MB.');
      return;
    }
    
    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Nieprawidłowy format. Dozwolone: JPG, PNG, WEBP');
      return;
    }
    
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  // Upload image mutation
  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      return eventsApi.uploadImage(eventId, file);
    },
    onSuccess: (data) => {
      setImagePreview(data.image);
      setImageFile(null);
      toast.success('Zdjęcie zostało zaktualizowane');
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
    },
    onError: () => {
      toast.error('Nie udało się przesłać zdjęcia');
    },
  });

  // Remove image
  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const updateMutation = useMutation({
    mutationFn: async (data: EditEventFormData) => {
      const payload = {
        title: data.title,
        description: description,
        event_type: data.event_type,
        status: data.status,
        is_permanent: data.is_permanent,
        start_date: `${data.start_date}T${data.start_time}`,
        end_date: data.end_date ? `${data.end_date}T${data.end_time}` : null,
        available_from: (data.available_from_date && data.available_from_time)
          ? `${data.available_from_date}T${data.available_from_time}`
          : null,
        available_to: (data.available_to_date && data.available_to_time)
          ? `${data.available_to_date}T${data.available_to_time}`
          : null,
        online_event: data.online_event,
        online_link: data.online_event ? (data.online_link || undefined) : undefined,
        location: !data.online_event ? {
          address: data.location_address || undefined,
          city: data.location_city,
          postal_code: data.location_postal_code || undefined,
          region: data.location_region || undefined,
        } : undefined,
        ticket_price: data.ticket_price || undefined,
        ticket_url: data.ticket_url || undefined,
        participant_limit: data.is_fully_booked ? null : data.participant_limit,
        is_limited: !data.is_fully_booked && !!data.participant_limit,
        is_fully_booked: data.is_fully_booked,
        meta_description: data.meta_description || undefined,
      };
      try {
        const result = await eventsApi.updateEvent(eventId, payload);
        return result;
      } catch (err) {
        throw err;
      }
    },
    onSuccess: (data) => {
      // Inwaliduj cache dla tego wydarzenia
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['events', 'detail', event?.slug] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      
      toast.success('Wydarzenie zostało zapisane!');
      // Małe opóźnienie, żeby toast był widoczny przed przekierowaniem
      setTimeout(() => {
        router.push(`/wydarzenia/${event?.slug}`);
      }, 500);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.detail || 
                      error?.response?.data?.message ||
                      JSON.stringify(error?.response?.data) ||
                      'Nie udało się zapisać zmian';
      toast.error(message);
    },
  });

  const onSubmit = (data: EditEventFormData) => {
    updateMutation.mutate(data);
  };

  if (!isAuthenticated) return null;

  const backHref = event?.slug
    ? `/wydarzenia/${event.slug}`
    : '/moje-wydarzenia';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="flex items-center gap-3 mb-6">
          <Link href={backHref} className="btn-secondary">
            <ArrowLeft className="w-4 h-4" />
            Wróć
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Edytuj wydarzenie</h1>
        </div>

        {isLoading || !event ? (
          <div className="card p-6">Ładowanie...</div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm">
              <nav className="flex border-b">
                {[
                  { id: 'basic', label: 'Dane podstawowe' },
                  { id: 'tickets', label: 'Bilety' },
                  { id: 'stats', label: 'Statystyki' },
                ].map((tab) => {
                  const isDisabled = tab.id === 'tickets' && isTicketsDisabled;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => {
                        if (!isDisabled) {
                          setActiveTab(tab.id as typeof activeTab);
                        }
                      }}
                      className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === tab.id
                          ? 'border-primary-500 text-primary-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </nav>

              {activeTab === 'basic' && (
                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tytuł</label>
                    <input {...register('title')} className="input w-full" />
                  </div>

                  {/* Image Upload Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Zdjęcie wydarzenia
                    </label>
                    <div className="mt-2">
                      {imagePreview ? (
                        <div className="relative">
                          <img
                            src={imagePreview}
                            alt="Podgląd wydarzenia"
                            className="w-full max-w-md h-48 object-cover rounded-lg border border-gray-200"
                          />
                          <div className="absolute top-2 right-2 flex gap-2">
                            {imageFile && (
                              <button
                                type="button"
                                onClick={() => uploadImageMutation.mutate(imageFile)}
                                disabled={uploadImageMutation.isPending}
                                className="p-2 bg-green-500 text-black rounded-full hover:bg-green-600 shadow-lg disabled:opacity-50"
                                title="Zapisz zdjęcie"
                              >
                                {uploadImageMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Save className="w-4 h-4" />
                                )}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={removeImage}
                              className="p-2 bg-red-500 text-black rounded-full hover:bg-red-600 shadow-lg"
                              title="Usuń zdjęcie"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          {imageFile && (
                            <p className="mt-2 text-sm text-amber-600">
                              Kliknij zielony przycisk, aby zapisać nowe zdjęcie
                            </p>
                          )}
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full max-w-md h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-500 hover:bg-primary-50/30 transition-all">
                          <div className="flex flex-col items-center justify-center py-6">
                            <Upload className="w-10 h-10 text-gray-400 mb-3" />
                            <p className="mb-1 text-sm text-gray-500">
                              <span className="font-semibold">Kliknij</span> lub przeciągnij zdjęcie
                            </p>
                            <p className="text-xs text-gray-400">PNG, JPG, WEBP (max 5MB)</p>
                          </div>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleImageChange}
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Opis</label>
                    <CKEditorWrapper
                      value={description}
                      onChange={(data: string) => setDescription(data)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Rodzaj wydarzenia</label>
                      <select
                        {...register('event_type')}
                        className="input w-full"
                        disabled={event?.event_type === 'platform' && hasSoldTickets}
                      >
                        {EVENT_TYPE_CHOICES.map(({ value, label }) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                      {event?.event_type === 'platform' && hasSoldTickets && (
                        <p className="text-xs text-amber-700 mt-2">
                          Nie możesz zmienić rodzaju wydarzenia, ponieważ bilety zostały już sprzedane.
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <select {...register('status')} className="input w-full">
                        {STATUS_CHOICES.map(({ value, label }) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                      {/* Ostrzeżenie o automatycznej zmianie statusu */}
                      {event && shouldAutoClose(event) && watch('status') !== 'closed' && (
                        <div className="mt-2 flex items-start gap-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
                          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                          <p className="text-xs text-amber-700">
                            Data zakończenia minęła. Wydarzenie zostanie automatycznie zamknięte przy zapisie.
                          </p>
                        </div>
                      )}
                      {event && shouldAutoReopen(event) && event.status === 'closed' && (
                        <div className="mt-2 flex items-start gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                          <AlertTriangle className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                          <p className="text-xs text-blue-700">
                            Data rozpoczęcia jest w przyszłości. Możesz ponownie opublikować wydarzenie.
                          </p>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Meta opis (SEO)</label>
                      <input {...register('meta_description')} className="input w-full" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Data rozpoczęcia</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="date" {...register('start_date')} className="input w-full" />
                        <input type="time" {...register('start_time')} className="input w-full" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Data zakończenia</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="date" {...register('end_date')} className="input w-full" />
                        <input type="time" {...register('end_time')} className="input w-full" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h3 className="font-medium text-gray-900">Wydarzenie online</h3>
                        <p className="text-sm text-gray-500">Uczestnicy dołączają przez link</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" {...register('online_event')} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500" />
                      </label>
                    </div>
                    {watchOnlineEvent && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Link online</label>
                        <input {...register('online_link')} className="input w-full" />
                      </div>
                    )}
                  </div>

                  {!watchOnlineEvent && (
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setLocationType('poland')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                            locationType === 'poland'
                              ? 'border-primary-500 bg-primary-50 text-primary-700'
                              : 'border-gray-200 text-gray-600'
                          }`}
                        >
                          <MapPin className="w-4 h-4" />
                          Polska
                        </button>
                        <button
                          type="button"
                          onClick={() => setLocationType('foreign')}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                            locationType === 'foreign'
                              ? 'border-primary-500 bg-primary-50 text-primary-700'
                              : 'border-gray-200 text-gray-600'
                          }`}
                        >
                          <Globe className="w-4 h-4" />
                          Zagranica
                        </button>
                      </div>

                      <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Wyszukaj adres</label>
                        <input
                          value={locationQuery}
                          onChange={(e) => setLocationQuery(e.target.value)}
                          className="input w-full"
                          placeholder="np. ul. Długa 5, Kraków"
                        />
                        {isSearchingLocation && (
                          <div className="absolute right-3 top-10 text-sm text-gray-400">Szukam...</div>
                        )}
                        {locationResults.length > 0 && (
                          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-auto">
                            <div className="flex justify-end p-1">
                              <button
                                type="button"
                                aria-label="Zamknij podpowiedzi adresu"
                                className="text-gray-400 hover:text-gray-700 text-xs px-2 py-1"
                                onClick={() => setLocationResults([])}
                              >
                                Zamknij
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
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Adres</label>
                          <input
                            {...register('location_address')}
                            className="input w-full"
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
                            <p className="text-sm text-blue-600 mt-1">Weryfikacja adresu...</p>
                          )}
                          {addressValidationMessage && (
                            <p
                              className={`text-sm mt-1 ${
                                addressValidationMessage.type === 'success'
                                  ? 'text-green-600'
                                  : addressValidationMessage.type === 'error'
                                  ? 'text-red-600'
                                  : 'text-yellow-600'
                              }`}
                            >
                              {addressValidationMessage.message}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Miasto</label>
                          <input
                            {...register('location_city', {
                              required: !watchOnlineEvent ? 'Miasto jest wymagane' : false,
                            })}
                            className="input w-full"
                            placeholder="np. Kraków"
                            onBlur={(e) => {
                              const city = e.target.value.trim();
                              const address = watchAll.location_address?.trim();
                              if (locationType === 'poland' && address && city) {
                                validateAddress(address, city);
                              }
                            }}
                          />
                          {errors.location_city?.message && (
                            <p className="text-sm text-red-600 mt-1">{String(errors.location_city.message)}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Kod pocztowy {locationType === 'poland' && '(XX-XXX)'}
                          </label>
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
                              },
                            })}
                            className="input w-full"
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
                            <p className="text-sm text-blue-600 mt-1">Weryfikacja kodu pocztowego...</p>
                          )}
                          {postalCodeValidationMessage && (
                            <p
                              className={`text-sm mt-1 ${
                                postalCodeValidationMessage.type === 'success'
                                  ? 'text-green-600'
                                  : postalCodeValidationMessage.type === 'error'
                                  ? 'text-red-600'
                                  : 'text-yellow-600'
                              }`}
                            >
                              {postalCodeValidationMessage.message}
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Region</label>
                          <input
                            {...register('location_region')}
                            className="input w-full"
                            placeholder="np. Małopolskie"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {!watchFullyBooked && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Limit uczestników</label>
                        <input type="number" {...register('participant_limit')} className="input w-full" />
                      </div>
                    )}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h3 className="font-medium text-gray-900">Brak miejsc</h3>
                        <p className="text-sm text-gray-500">Zaznacz ręcznie, gdy wydarzenie jest pełne</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" {...register('is_fully_booked')} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500" />
                      </label>
                    </div>
                  </div>

                  {watchEventType === 'paid' && (
                    <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Cena biletu (PLN)</label>
                          <input
                            type="number"
                            step="0.01"
                            {...register('ticket_price', {
                            })}
                            className="input w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Link do biletów zewnętrznych</label>
                          <div className="flex items-center gap-2">
                            <input
                              {...register('ticket_url', {
                              })}
                              className="input w-full"
                            />
                            <div className="px-3 py-3 bg-gray-100 rounded-lg border border-gray-200">
                              <ExternalLink className="w-4 h-4 text-gray-500" />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Bilety dostępne od</label>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="date"
                              {...register('available_from_date', {
                              })}
                              className="input w-full"
                            />
                            <input
                              type="time"
                              {...register('available_from_time', {
                              })}
                              className="input w-full"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Bilety dostępne do</label>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="date"
                              {...register('available_to_date', {
                              })}
                              className="input w-full"
                            />
                            <input
                              type="time"
                              {...register('available_to_time', {
                              })}
                              className="input w-full"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button 
                      type="submit" 
                      className="btn btn-primary" 
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? (
                        <>
                          <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                          Zapisywanie...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Zapisz zmiany
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {activeTab === 'tickets' && (
                <div className="p-6 space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Bilety i sprzedaż</h2>
                      <p className="text-sm text-gray-600">Zarządzaj typami biletów i zamówieniami</p>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/bilety/organizator/zarzadzaj/${eventId}`} className="btn-secondary">
                        <Ticket className="w-4 h-4" />
                        Zarządzaj biletami
                      </Link>
                      <Link href={`/bilety/organizator/zarzadzaj/${eventId}/zamowienia`} className="btn-secondary">
                        Zamówienia
                      </Link>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="card p-4">
                      <div className="text-sm text-gray-500">Typy biletów</div>
                      <div className="text-2xl font-bold text-gray-900">{ticketTypes?.length || 0}</div>
                    </div>
                    <div className="card p-4">
                      <div className="text-sm text-gray-500">Łączna pula</div>
                      <div className="text-2xl font-bold text-gray-900">
                        {ticketTypes?.reduce((sum: number, t: any) => sum + (t.quantity || 0), 0) || 0}
                      </div>
                    </div>
                    <div className="card p-4">
                      <div className="text-sm text-gray-500">Sprzedane</div>
                      <div className="text-2xl font-bold text-gray-900">
                        {ticketTypes?.reduce((sum: number, t: any) => sum + (t.quantity_sold || 0), 0) || 0}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'stats' && (
                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Statystyki</h2>
                      <p className="text-sm text-gray-600">Podstawowe informacje o sprzedaży i ruchu</p>
                    </div>
                    <Link href="/bilety/organizator/wyplaty" className="btn-secondary">
                      <BarChart3 className="w-4 h-4" />
                      Panel wypłat
                    </Link>
                  </div>
                  <div className="card p-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      Statystyki w przygotowaniu (trwa migracja)
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
