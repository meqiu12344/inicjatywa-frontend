'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  Globe, 
  CheckCircle,
  Clock,
  ArrowLeft,
  Send,
  Upload,
  X,
  Calendar,
  Users,
  Ticket,
  BarChart3,
  Shield,
  Heart,
  Phone,
  FileText,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { get, post } from '@/lib/api/client';
import toast from 'react-hot-toast';

interface OrganizerRequestCheck {
  has_pending: boolean;
  request?: {
    id: number;
    organization_name: string;
    status: string;
    created_at: string;
  };
}

interface OrganizerRequestForm {
  organization_name: string;
  organization_id: string;
  official_website: string;
  description: string;
  motivation: string;
  phone_number: string;
}

interface FormErrors {
  organization_name?: string;
  description?: string;
  motivation?: string;
  phone_number?: string;
  logo?: string;
}

const benefits = [
  {
    icon: Calendar,
    title: 'Publikuj wydarzenia',
    description: 'Twórz i publikuj wydarzenia katolickie, które dotrą do tysięcy wiernych w całej Polsce.'
  },
  {
    icon: Users,
    title: 'Zarządzaj uczestnikami',
    description: 'Pełna kontrola nad listą uczestników, eksport danych i komunikacja z zapisanymi osobami.'
  },
  {
    icon: Ticket,
    title: 'Sprzedawaj bilety',
    description: 'Zintegrowany system sprzedaży biletów z bezpiecznym procesowaniem płatności.'
  },
  {
    icon: BarChart3,
    title: 'Analizuj statystyki',
    description: 'Szczegółowe raporty i analityka pomagające w lepszym planowaniu wydarzeń.'
  },
  {
    icon: Shield,
    title: 'Weryfikowany profil',
    description: 'Oznaczenie zweryfikowanego organizatora buduje zaufanie wśród uczestników.'
  },
  {
    icon: Heart,
    title: 'Wsparcie społeczności',
    description: 'Dołącz do sieci organizatorów katolickich i wymieniaj się doświadczeniami.'
  }
];

const requirements = [
  'Zarejestrowane konto na platformie',
  'Nazwa organizacji lub wspólnoty',
  'Opis działalności związanej z Kościołem katolickim',
  'Uzasadnienie chęci zostania organizatorem'
];

export default function BecomeOrganizerPage() {
  const router = useRouter();
  const { user, profile, isAuthenticated, isLoading: authLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<OrganizerRequestForm>({
    organization_name: '',
    organization_id: '',
    official_website: '',
    description: '',
    motivation: '',
    phone_number: '',
  });
  
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { data: requestCheck, isLoading: checkLoading } = useQuery({
    queryKey: ['organizer-request-check'],
    queryFn: () => get<OrganizerRequestCheck>('/auth/organizer-request/'),
    enabled: isAuthenticated && !authLoading,
  });

  const submitMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return post('/auth/organizer-request/', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast.success('Wniosek został złożony pomyślnie!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Nie udało się złożyć wniosku');
    },
  });

  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrors(prev => ({ ...prev, logo: 'Wybierz plik graficzny (JPG, PNG, GIF)' }));
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, logo: 'Plik jest za duży. Maksymalny rozmiar to 5MB' }));
        return;
      }
      
      setLogoFile(file);
      setErrors(prev => ({ ...prev, logo: undefined }));
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.organization_name.trim()) {
      newErrors.organization_name = 'Nazwa organizacji jest wymagana';
    } else if (formData.organization_name.length < 3) {
      newErrors.organization_name = 'Nazwa organizacji musi mieć co najmniej 3 znaki';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Opis działalności jest wymagany';
    } else if (formData.description.length < 50) {
      newErrors.description = 'Opis powinien zawierać co najmniej 50 znaków';
    }
    
    if (!formData.motivation.trim()) {
      newErrors.motivation = 'Motywacja jest wymagana';
    } else if (formData.motivation.length < 30) {
      newErrors.motivation = 'Motywacja powinna zawierać co najmniej 30 znaków';
    }
    
    if (formData.phone_number && !/^[+]?[\d\s-]{9,15}$/.test(formData.phone_number.replace(/\s/g, ''))) {
      newErrors.phone_number = 'Podaj prawidłowy numer telefonu';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Popraw błędy w formularzu');
      return;
    }
    
    const formDataToSend = new FormData();
    formDataToSend.append('organization_name', formData.organization_name);
    formDataToSend.append('organization_id', formData.organization_id);
    formDataToSend.append('official_website', formData.official_website);
    formDataToSend.append('description', formData.description);
    formDataToSend.append('motivation', formData.motivation);
    formDataToSend.append('phone_number', formData.phone_number);
    
    if (logoFile) {
      formDataToSend.append('organization_logo', logoFile);
    }
    
    submitMutation.mutate(formDataToSend);
  };

  if (authLoading || checkLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Ładowanie...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Building2 className="h-10 w-10 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Zaloguj się, aby kontynuować</h1>
          <p className="text-gray-600 mb-6">
            Aby złożyć wniosek o status organizatora, musisz być zalogowany na swoje konto.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link 
              href="/logowanie" 
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Zaloguj się
            </Link>
            <Link 
              href="/rejestracja" 
              className="bg-white text-indigo-600 border border-indigo-200 px-6 py-3 rounded-lg hover:bg-indigo-50 transition-colors font-medium"
            >
              Utwórz konto
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isOrganizer = profile?.role === 'organizer' || profile?.is_organizer;

  // User already is organizer
  if (isOrganizer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Jesteś już organizatorem!</h1>
          <p className="text-gray-600 mb-6">
            Możesz tworzyć wydarzenia, zarządzać uczestnikami i korzystać z wszystkich funkcji dla organizatorów.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link 
              href="/wydarzenia/dodaj" 
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Calendar className="h-5 w-5" />
              Dodaj wydarzenie
            </Link>
            <Link 
              href="/profil" 
              className="bg-white text-gray-700 border border-gray-200 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Mój profil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // User has pending request
  if (requestCheck?.has_pending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-yellow-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="h-10 w-10 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Wniosek w trakcie rozpatrywania</h1>
          <p className="text-gray-600 mb-2">
            Twój wniosek dla organizacji:
          </p>
          <p className="font-semibold text-gray-900 mb-4">
            &quot;{requestCheck.request?.organization_name}&quot;
          </p>
          <p className="text-gray-600 mb-6">
            jest aktualnie weryfikowany przez nasz zespół. Poinformujemy Cię mailowo o decyzji, zwykle w ciągu 2-3 dni roboczych.
          </p>
          <Link 
            href="/profil" 
            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium"
          >
            <ArrowLeft className="h-5 w-5" />
            Wróć do profilu
          </Link>
        </div>
      </div>
    );
  }

  // Success state after submission
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <Sparkles className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Wniosek został złożony!</h1>
          <p className="text-gray-600 mb-6">
            Dziękujemy za złożenie wniosku o status organizatora. Nasz zespół sprawdzi Twoje zgłoszenie 
            i poinformuje Cię mailowo o decyzji w ciągu 2-3 dni roboczych.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-green-800">
              <strong>Co dalej?</strong> Sprawdzaj swoją skrzynkę mailową, w tym folder spam. 
              Otrzymasz wiadomość z informacją o statusie wniosku.
            </p>
          </div>
          <Link 
            href="/profil" 
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            <ArrowLeft className="h-5 w-5" />
            Wróć do profilu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <Link 
            href="/profil" 
            className="inline-flex items-center gap-2 text-indigo-100 hover:text-white mb-8 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Powrót do profilu
          </Link>
          
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Building2 className="h-6 w-6" />
              </div>
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                Dla organizatorów
              </span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Zostań organizatorem wydarzeń
            </h1>
            <p className="text-xl text-indigo-100 leading-relaxed">
              Dołącz do grona zweryfikowanych organizatorów i docieraj z wydarzeniami katolickimi 
              do tysięcy wiernych w całej Polsce. Publikuj rekolekcje, pielgrzymki, koncerty 
              i inne wydarzenia duchowe.
            </p>
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Co zyskujesz jako organizator?
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Status organizatora daje Ci dostęp do profesjonalnych narzędzi do zarządzania wydarzeniami.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {benefits.map((benefit, index) => (
            <div 
              key={index}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-100 transition-all"
            >
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
                <benefit.icon className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{benefit.title}</h3>
              <p className="text-gray-600 text-sm">{benefit.description}</p>
            </div>
          ))}
        </div>

        {/* Requirements Section */}
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-8 mb-16 border border-amber-100">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="md:w-1/3">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-amber-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Wymagania</h2>
              <p className="text-gray-600 text-sm">
                Upewnij się, że spełniasz podstawowe wymagania przed złożeniem wniosku.
              </p>
            </div>
            <div className="md:w-2/3">
              <ul className="space-y-3">
                {requirements.map((req, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Application Form */}
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-8 py-6">
              <h2 className="text-2xl font-bold text-white">Formularz zgłoszeniowy</h2>
              <p className="text-indigo-100 mt-1">Wypełnij wszystkie wymagane pola</p>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              {/* Organization Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nazwa organizacji <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.organization_name}
                  onChange={(e) => {
                    setFormData({ ...formData, organization_name: e.target.value });
                    if (errors.organization_name) setErrors({ ...errors, organization_name: undefined });
                  }}
                  className={`w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                    errors.organization_name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="np. Parafia św. Jana Pawła II, Fundacja Miłosierdzia"
                />
                {errors.organization_name && (
                  <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.organization_name}
                  </p>
                )}
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Logo organizacji <span className="text-gray-400 font-normal">(opcjonalne)</span>
                </label>
                <div className="flex items-start gap-4">
                  {logoPreview ? (
                    <div className="relative">
                      <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-indigo-200 shadow-sm">
                        <Image
                          src={logoPreview}
                          alt="Logo preview"
                          width={96}
                          height={96}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={removeLogo}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow-md"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                    >
                      <Upload className="h-6 w-6 text-gray-400" />
                      <span className="text-xs text-gray-500 mt-1">Dodaj logo</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      {logoPreview ? 'Zmień logo' : 'Wybierz plik'}
                    </button>
                    <p className="text-xs text-gray-500 mt-1">
                      JPG, PNG lub GIF. Maksymalnie 5MB. Zalecany rozmiar: 200x200px.
                    </p>
                    {errors.logo && (
                      <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" />
                        {errors.logo}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Organization ID */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  NIP / KRS / REGON <span className="text-gray-400 font-normal">(opcjonalne)</span>
                </label>
                <input
                  type="text"
                  value={formData.organization_id}
                  onChange={(e) => setFormData({ ...formData, organization_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder="Numer identyfikacyjny organizacji"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Podanie numeru przyspiesza proces weryfikacji wniosku.
                </p>
              </div>

              {/* Website */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Strona internetowa <span className="text-gray-400 font-normal">(opcjonalne)</span>
                </label>
                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="url"
                    value={formData.official_website}
                    onChange={(e) => setFormData({ ...formData, official_website: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl pl-11 pr-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="https://www.przyklad.pl"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Numer telefonu <span className="text-gray-400 font-normal">(opcjonalne)</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.phone_number}
                    onChange={(e) => {
                      setFormData({ ...formData, phone_number: e.target.value });
                      if (errors.phone_number) setErrors({ ...errors, phone_number: undefined });
                    }}
                    className={`w-full border rounded-xl pl-11 pr-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${
                      errors.phone_number ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="+48 123 456 789"
                  />
                </div>
                {errors.phone_number && (
                  <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {errors.phone_number}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Numer kontaktowy do celów weryfikacji. Nie będzie publikowany.
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Opis działalności organizacji <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value });
                    if (errors.description) setErrors({ ...errors, description: undefined });
                  }}
                  className={`w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none ${
                    errors.description ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  rows={5}
                  placeholder="Opisz czym zajmuje się Twoja organizacja, jakie wydarzenia organizuje, jak długo działa..."
                />
                <div className="flex justify-between mt-1">
                  {errors.description ? (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.description}
                    </p>
                  ) : (
                    <span className="text-xs text-gray-500">Minimum 50 znaków</span>
                  )}
                  <span className={`text-xs ${formData.description.length < 50 ? 'text-gray-400' : 'text-green-600'}`}>
                    {formData.description.length} / 50
                  </span>
                </div>
              </div>

              {/* Motivation */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Dlaczego chcesz zostać organizatorem? <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.motivation}
                  onChange={(e) => {
                    setFormData({ ...formData, motivation: e.target.value });
                    if (errors.motivation) setErrors({ ...errors, motivation: undefined });
                  }}
                  className={`w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none ${
                    errors.motivation ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  rows={4}
                  placeholder="Opisz jakie wydarzenia chcesz organizować, dlaczego wybrałeś naszą platformę, jak chcesz służyć wspólnocie..."
                />
                <div className="flex justify-between mt-1">
                  {errors.motivation ? (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {errors.motivation}
                    </p>
                  ) : (
                    <span className="text-xs text-gray-500">Minimum 30 znaków</span>
                  )}
                  <span className={`text-xs ${formData.motivation.length < 30 ? 'text-gray-400' : 'text-green-600'}`}>
                    {formData.motivation.length} / 30
                  </span>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5">
                <h3 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Informacje o weryfikacji
                </h3>
                <ul className="text-sm text-indigo-800 space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                    Wniosek jest rozpatrywany w ciągu 2-3 dni roboczych
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                    O decyzji poinformujemy Cię drogą mailową
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                    Twoje dane są bezpieczne i nie będą udostępniane
                  </li>
                </ul>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitMutation.isPending}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 px-6 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg shadow-lg hover:shadow-xl"
              >
                {submitMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Wysyłanie wniosku...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    Złóż wniosek
                  </>
                )}
              </button>

              <p className="text-center text-sm text-gray-500">
                Składając wniosek, akceptujesz{' '}
                <Link href="/regulamin" className="text-indigo-600 hover:underline">
                  regulamin platformy
                </Link>
                {' '}oraz{' '}
                <Link href="/polityka-prywatnosci" className="text-indigo-600 hover:underline">
                  politykę prywatności
                </Link>
                .
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
