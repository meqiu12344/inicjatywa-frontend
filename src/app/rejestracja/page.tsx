'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  UserPlus,
  Check,
  Loader2,
  Phone,
  Building2,
  Globe,
  FileText,
  Upload,
  X,
  AlertCircle,
} from 'lucide-react';
import ReCAPTCHA from 'react-google-recaptcha';
import { useAuth } from '@/hooks/useAuth';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

/** Map fields between backend (snake_case from DRF) and our form */
const FIELD_MAP: Record<string, keyof RegisterFormData | 'root'> = {
  email: 'email',
  username: 'username',
  password: 'password',
  password_confirm: 'password_confirm',
  first_name: 'first_name',
  last_name: 'last_name',
  phone_number: 'phone_number',
  organization_name: 'organization_name',
  organization_id: 'organization_nip',
  official_website: 'organization_website',
  description: 'organization_description',
  motivation: 'organizer_motivation',
};

function joinErr(val: any): string {
  if (Array.isArray(val)) return val.map(String).join(' ');
  if (typeof val === 'string') return val;
  return '';
}

interface RegisterFormData {
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  phone_number: string;
  password: string;
  password_confirm: string;
  want_organizer_role: boolean;
  organization_name: string;
  organization_nip: string;
  organization_website: string;
  organization_description: string;
  organizer_motivation: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, isRegistering, isAuthenticated, isLoading } = useAuth();
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  const isRecaptchaEnabled = Boolean(recaptchaSiteKey);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [recaptchaError, setRecaptchaError] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recaptchaRef = useRef<ReCAPTCHA | null>(null);

  const resetRecaptcha = () => {
    try {
      recaptchaRef.current?.reset();
    } catch {
      /* ignore */
    }
    setRecaptchaToken(null);
  };

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
    setError,
  } = useForm<RegisterFormData>({
    defaultValues: {
      first_name: '',
      last_name: '',
      username: '',
      email: '',
      phone_number: '',
      password: '',
      password_confirm: '',
      want_organizer_role: false,
      organization_name: '',
      organization_nip: '',
      organization_website: '',
      organization_description: '',
      organizer_motivation: '',
    },
  });

  const wantOrganizerRole = watch('want_organizer_role');
  const password = watch('password');

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  const onRecaptchaChange = useCallback((token: string | null) => {
    setRecaptchaToken(token);
    if (token) {
      setRecaptchaError(null);
    }
  }, []);

  const onRecaptchaExpired = useCallback(() => {
    setRecaptchaToken(null);
  }, []);

  const validatePassword = (password: string) => {
    return {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
    };
  };

  const passwordChecks = validatePassword(password || '');

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setLogoError(null);

    if (!file) {
      setLogoFile(null);
      setLogoPreview(null);
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setLogoError('Dozwolone są tylko pliki graficzne (JPG, PNG, GIF)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setLogoError('Maksymalny rozmiar pliku to 5MB');
      return;
    }

    setLogoFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setLogoError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onSubmit = (data: RegisterFormData) => {
    // Validate reCAPTCHA
    if (isRecaptchaEnabled && !recaptchaToken) {
      setRecaptchaError('Proszę potwierdzić, że nie jesteś robotem');
      return;
    }

    // Validate password requirements
    if (!Object.values(passwordChecks).every(Boolean)) {
      setError('password', { message: 'Hasło nie spełnia wymagań bezpieczeństwa' });
      return;
    }

    // Validate organizer fields if checkbox is checked
    if (data.want_organizer_role) {
      if (!data.organization_name) {
        setError('organization_name', { message: 'Nazwa organizacji jest wymagana' });
        return;
      }
      if (!data.organization_description) {
        setError('organization_description', { message: 'Opis działalności jest wymagany' });
        return;
      }
      if (!data.organizer_motivation) {
        setError('organizer_motivation', { message: 'Uzasadnienie jest wymagane' });
        return;
      }
    }

    // Prepare registration data (map frontend keys to backend keys)
    const baseData: Record<string, any> = {
      email: data.email,
      username: data.username,
      password: data.password,
      password_confirm: data.password_confirm,
      first_name: data.first_name,
      last_name: data.last_name,
      phone_number: data.phone_number,
      want_organizer_role: data.want_organizer_role,
    };

    if (isRecaptchaEnabled && recaptchaToken) {
      baseData.recaptcha_token = recaptchaToken;
    }

    // Map organizer fields to backend-expected keys
    if (data.want_organizer_role) {
      baseData.organization_name = data.organization_name;
      // backend expects `organization_id` rather than `organization_nip`
      baseData.organization_id = data.organization_nip;
      // backend expects `official_website`
      baseData.official_website = data.organization_website;
      // backend expects `description` and `motivation`
      baseData.description = data.organization_description;
      baseData.motivation = data.organizer_motivation;
    }

    // If there's a logo file, use FormData for multipart upload
    let payload: any = baseData;
    let config: any = undefined;
    if (logoFile) {
      const form = new FormData();
      Object.entries(baseData).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        // Booleans should be sent as strings for multipart/form-data
        if (typeof value === 'boolean') {
          form.append(key, value ? 'true' : 'false');
        } else {
          form.append(key, String(value));
        }
      });
      form.append('organization_logo', logoFile);
      payload = form;
      // Let the browser set the multipart boundary header automatically
      config = undefined;
    }

    registerUser(payload, {
      onSuccess: () => {
        toast.success('Konto utworzone! Sprawdź skrzynkę email aby aktywować konto.', { duration: 6000 });
        router.push('/logowanie?registered=true');
      },
      onError: (error: any) => {
        if (isRecaptchaEnabled) resetRecaptcha();
        const data = error?.response?.data;
        let mappedAny = false;

        if (data && typeof data === 'object' && !Array.isArray(data)) {
          for (const [backendField, val] of Object.entries(data)) {
            // skip wrapper keys
            if (['message', 'detail', 'error', 'non_field_errors', 'errors'].includes(backendField)) continue;
            const formField = FIELD_MAP[backendField];
            const msg = joinErr(val);
            if (!msg) continue;
            if (formField && formField !== 'root') {
              setError(formField as any, { message: msg });
              mappedAny = true;
            }
          }
          // Handle non_field_errors as global
          if (data.non_field_errors) {
            const msg = joinErr(data.non_field_errors);
            if (msg) {
              setError('root', { message: msg });
              mappedAny = true;
            }
          }
        }

        if (!mappedAny) {
          const fallback =
            data?.message ||
            data?.detail ||
            data?.error ||
            error?.message ||
            'Wystąpił błąd podczas rejestracji.';
          setError('root', { message: String(fallback) });
          toast.error(String(fallback));
        } else {
          toast.error('Sprawdź formularz i popraw oznaczone pola.');
        }
      },
    }, config);
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  // Don't render form if authenticated (will redirect)
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row-reverse bg-slate-900">
      {/* Form Container */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 py-12 lg:px-16 xl:px-24 overflow-y-auto bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 z-20 lg:shadow-2xl">
        <div className="w-full max-w-lg mx-auto">
          {/* Logo */}
          <div className="mb-10 flex justify-center items-center">
            <Link href="/" className="inline-block transition-transform duration-200 hover:opacity-90 active:scale-95">
              <Image
                src="/images/inicjatywa-logo-granatowe.svg"
                alt="Logo Inicjatywa"
                width={250}
                height={150}
                className="w-auto h-20 sm:h-40 object-contain brightness-0 invert"
                priority
              />
            </Link>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold text-white mb-2">
              Stwórz konto
            </h1>
            <p className="text-slate-400">
              Dołącz do nas i odkrywaj wydarzenia katolickie.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Global Error */}
            {errors.root && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-400">{errors.root.message}</p>
              </div>
            )}

            {/* Name row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-slate-300 mb-2">
                  Imię
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    id="first_name"
                    placeholder="Jan"
                    {...register('first_name')}
                    className={clsx(
                      'w-full pl-12 pr-4 py-3.5 bg-slate-800/50 border rounded-xl text-white placeholder-slate-500',
                      'focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500',
                      'transition-all duration-200',
                      'border-slate-700 hover:border-slate-600'
                    )}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-slate-300 mb-2">
                  Nazwisko
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    id="last_name"
                    placeholder="Kowalski"
                    {...register('last_name')}
                    className={clsx(
                      'w-full pl-12 pr-4 py-3.5 bg-slate-800/50 border rounded-xl text-white placeholder-slate-500',
                      'focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500',
                      'transition-all duration-200',
                      'border-slate-700 hover:border-slate-600'
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-300 mb-2">
                Nazwa użytkownika *
              </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  id="username"
                  placeholder="jan_kowalski"
                  {...register('username', {
                    required: 'Nazwa użytkownika jest wymagana',
                    minLength: {
                      value: 3,
                      message: 'Nazwa użytkownika musi mieć co najmniej 3 znaki',
                    },
                  })}
                  className={clsx(
                    'w-full pl-12 pr-4 py-3.5 bg-slate-800/50 border rounded-xl text-white placeholder-slate-500',
                    'focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500',
                    'transition-all duration-200',
                    errors.username
                      ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500'
                      : 'border-slate-700 hover:border-slate-600'
                  )}
                />
              </div>
              {errors.username && (
                <p className="mt-2 text-sm text-red-400">{errors.username.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                Adres email *
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="email"
                  id="email"
                  autoComplete="email"
                  placeholder="twoj@email.pl"
                  {...register('email', {
                    required: 'Email jest wymagany',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Niepoprawny format adresu email',
                    },
                  })}
                  className={clsx(
                    'w-full pl-12 pr-4 py-3.5 bg-slate-800/50 border rounded-xl text-white placeholder-slate-500',
                    'focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500',
                    'transition-all duration-200',
                    errors.email
                      ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500'
                      : 'border-slate-700 hover:border-slate-600'
                  )}
                />
              </div>
              {errors.email && (
                <p className="mt-2 text-sm text-red-400">{errors.email.message}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone_number" className="block text-sm font-medium text-slate-300 mb-2">
                Telefon kontaktowy
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="tel"
                  id="phone_number"
                  autoComplete="tel"
                  placeholder="+48 123 456 789"
                  {...register('phone_number')}
                  className={clsx(
                    'w-full pl-12 pr-4 py-3.5 bg-slate-800/50 border rounded-xl text-white placeholder-slate-500',
                    'focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500',
                    'transition-all duration-200',
                    'border-slate-700 hover:border-slate-600'
                  )}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                Hasło *
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  {...register('password', {
                    required: 'Hasło jest wymagane',
                  })}
                  className={clsx(
                    'w-full pl-12 pr-12 py-3.5 bg-slate-800/50 border rounded-xl text-white placeholder-slate-500',
                    'focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500',
                    'transition-all duration-200',
                    errors.password
                      ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500'
                      : 'border-slate-700 hover:border-slate-600'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-2 text-sm text-red-400">{errors.password.message}</p>
              )}

              {/* Password requirements */}
              {password && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <PasswordCheck passed={passwordChecks.length} label="Minimum 8 znaków" />
                  <PasswordCheck passed={passwordChecks.lowercase} label="Mała litera" />
                  <PasswordCheck passed={passwordChecks.uppercase} label="Wielka litera" />
                  <PasswordCheck passed={passwordChecks.number} label="Cyfra" />
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="password_confirm" className="block text-sm font-medium text-slate-300 mb-2">
                Powtórz hasło *
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="password_confirm"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  {...register('password_confirm', {
                    required: 'Potwierdzenie hasła jest wymagane',
                    validate: (value) => value === password || 'Hasła nie są identyczne',
                  })}
                  className={clsx(
                    'w-full pl-12 pr-12 py-3.5 bg-slate-800/50 border rounded-xl text-white placeholder-slate-500',
                    'focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500',
                    'transition-all duration-200',
                    errors.password_confirm
                      ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500'
                      : 'border-slate-700 hover:border-slate-600'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  aria-label={showConfirmPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password_confirm && (
                <p className="mt-2 text-sm text-red-400">{errors.password_confirm.message}</p>
              )}
            </div>

            {/* Organizer Checkbox */}
            <div className="pt-2">
              <Controller
                name="want_organizer_role"
                control={control}
                render={({ field }) => (
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative mt-0.5">
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="sr-only"
                      />
                      <div className={clsx(
                        'w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center',
                        field.value
                          ? 'bg-amber-500 border-amber-500'
                          : 'border-slate-600 group-hover:border-slate-500'
                      )}>
                        {field.value && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                    </div>
                    <span className="text-sm text-slate-300 group-hover:text-slate-200 transition-colors">
                      Chcę zostać organizatorem i dodawać wydarzenia
                    </span>
                  </label>
                )}
              />
            </div>

            {/* Organizer Fields - Conditionally Rendered */}
            {wantOrganizerRole && (
              <div className="space-y-5 pt-4 border-t border-slate-700/50">
                <h3 className="text-lg font-semibold text-amber-500">
                  Dodatkowe informacje o organizatorze
                </h3>

                {/* Organization Name */}
                <div>
                  <label htmlFor="organization_name" className="block text-sm font-medium text-slate-300 mb-2">
                    Nazwa organizacji *
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type="text"
                      id="organization_name"
                      placeholder="Parafia św. Jana"
                      {...register('organization_name')}
                      className={clsx(
                        'w-full pl-12 pr-4 py-3.5 bg-slate-800/50 border rounded-xl text-white placeholder-slate-500',
                        'focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500',
                        'transition-all duration-200',
                        errors.organization_name
                          ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500'
                          : 'border-slate-700 hover:border-slate-600'
                      )}
                    />
                  </div>
                  {errors.organization_name && (
                    <p className="mt-2 text-sm text-red-400">{errors.organization_name.message}</p>
                  )}
                </div>

                {/* Logo Upload */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Logo organizacji
                  </label>
                  <div className="flex items-start gap-4">
                    {/* Preview */}
                    {logoPreview ? (
                      <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-800 flex-shrink-0">
                        <Image
                          src={logoPreview}
                          alt="Logo preview"
                          fill
                          className="object-cover"
                        />
                        <button
                          type="button"
                          onClick={removeLogo}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                        >
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-slate-800/50 border border-slate-700 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-8 h-8 text-slate-600" />
                      </div>
                    )}

                    {/* Upload Button */}
                    <div className="flex-1">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="hidden"
                        id="logo-upload"
                      />
                      <label
                        htmlFor="logo-upload"
                        className={clsx(
                          'flex items-center justify-center gap-2 px-4 py-3 rounded-xl cursor-pointer',
                          'bg-slate-800/50 border border-slate-700 hover:border-amber-500/50',
                          'text-slate-300 hover:text-amber-500 transition-all duration-200'
                        )}
                      >
                        <Upload className="w-5 h-5" />
                        <span>Wybierz plik</span>
                      </label>
                      <p className="mt-2 text-xs text-slate-500">
                        JPG, PNG lub GIF. Maks. 5MB.
                      </p>
                      {logoError && (
                        <p className="mt-2 text-sm text-red-400">{logoError}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* NIP/KRS */}
                <div>
                  <label htmlFor="organization_nip" className="block text-sm font-medium text-slate-300 mb-2">
                    Numer identyfikacyjny (NIP/KRS)
                    <span className="text-slate-500 font-normal ml-2">opcjonalne</span>
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type="text"
                      id="organization_nip"
                      placeholder="1234567890"
                      {...register('organization_nip')}
                      className={clsx(
                        'w-full pl-12 pr-4 py-3.5 bg-slate-800/50 border rounded-xl text-white placeholder-slate-500',
                        'focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500',
                        'transition-all duration-200',
                        'border-slate-700 hover:border-slate-600'
                      )}
                    />
                  </div>
                </div>

                {/* Website */}
                <div>
                  <label htmlFor="organization_website" className="block text-sm font-medium text-slate-300 mb-2">
                    Strona internetowa
                    <span className="text-slate-500 font-normal ml-2">opcjonalne</span>
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      type="url"
                      id="organization_website"
                      placeholder="https://www.example.pl"
                      {...register('organization_website')}
                      className={clsx(
                        'w-full pl-12 pr-4 py-3.5 bg-slate-800/50 border rounded-xl text-white placeholder-slate-500',
                        'focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500',
                        'transition-all duration-200',
                        'border-slate-700 hover:border-slate-600'
                      )}
                    />
                  </div>
                </div>

                {/* Organization Description */}
                <div>
                  <label htmlFor="organization_description" className="block text-sm font-medium text-slate-300 mb-2">
                    Opis działalności organizacji *
                  </label>
                  <textarea
                    id="organization_description"
                    rows={3}
                    placeholder="Opisz swoją organizację i jej działalność..."
                    {...register('organization_description')}
                    className={clsx(
                      'w-full px-4 py-3.5 bg-slate-800/50 border rounded-xl text-white placeholder-slate-500',
                      'focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500',
                      'transition-all duration-200 resize-none',
                      errors.organization_description
                        ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500'
                        : 'border-slate-700 hover:border-slate-600'
                    )}
                  />
                  {errors.organization_description && (
                    <p className="mt-2 text-sm text-red-400">{errors.organization_description.message}</p>
                  )}
                </div>

                {/* Motivation */}
                <div>
                  <label htmlFor="organizer_motivation" className="block text-sm font-medium text-slate-300 mb-2">
                    Dlaczego chcesz zostać organizatorem? *
                  </label>
                  <textarea
                    id="organizer_motivation"
                    rows={3}
                    placeholder="Opisz, dlaczego chcesz zostać organizatorem wydarzeń..."
                    {...register('organizer_motivation')}
                    className={clsx(
                      'w-full px-4 py-3.5 bg-slate-800/50 border rounded-xl text-white placeholder-slate-500',
                      'focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500',
                      'transition-all duration-200 resize-none',
                      errors.organizer_motivation
                        ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500'
                        : 'border-slate-700 hover:border-slate-600'
                    )}
                  />
                  {errors.organizer_motivation && (
                    <p className="mt-2 text-sm text-red-400">{errors.organizer_motivation.message}</p>
                  )}
                </div>
              </div>
            )}

            {/* reCAPTCHA */}
            {isRecaptchaEnabled && (
              <div className="flex flex-col items-center pt-2">
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={recaptchaSiteKey as string}
                  onChange={onRecaptchaChange}
                  onExpired={onRecaptchaExpired}
                  theme="dark"
                />
                {recaptchaError && (
                  <p className="mt-2 text-sm text-red-400">{recaptchaError}</p>
                )}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isRegistering}
              className={clsx(
                'w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-semibold text-white',
                'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700',
                'shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40',
                'focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-2 focus:ring-offset-slate-900',
                'transition-all duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-amber-500/25'
              )}
            >
              {isRegistering ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Tworzenie konta...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  <span>Stwórz</span>
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-8 text-center">
            <p className="text-slate-400">
              Masz już konto?{' '}
              <Link
                href="/logowanie"
                className="text-amber-500 hover:text-amber-400 font-medium transition-colors"
              >
                Zaloguj się
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right Column - Image */}
      <div className="w-full h-64 lg:h-auto lg:w-1/2 relative order-first lg:order-last">
        <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-l from-slate-900 via-slate-900/40 to-transparent z-10 pointer-events-none" />
        <Image
          src="/images/login-bg.jpg"
          alt="Wnętrze Kościoła"
          fill
          className="object-cover object-center"
          priority
          sizes="(max-w: 1024px) 100vw, 50vw"
        />
        {/* Overlay Content */}
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-8 lg:p-12 text-center drop-shadow-xl">
          <div className="max-w-md bg-slate-900/40 backdrop-blur-md p-6 lg:p-8 rounded-2xl border border-white/10 hidden sm:block">
            <h2 className="font-display text-2xl lg:text-3xl font-bold text-white mb-3">
              Dołącz do wspólnoty
            </h2>
            <p className="text-slate-200 text-sm lg:text-lg">
              Odkrywaj wydarzenia w swojej parafii, zapisuj się na rekolekcje
              i bądź częścią aktywnej społeczności katolickiej.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PasswordCheck({ passed, label }: { passed: boolean; label: string }) {
  return (
    <div className={clsx(
      'flex items-center gap-2 text-xs transition-colors',
      passed ? 'text-green-400' : 'text-slate-500'
    )}>
      <Check className={clsx('w-3.5 h-3.5', passed ? 'opacity-100' : 'opacity-50')} />
      {label}
    </div>
  );
}
