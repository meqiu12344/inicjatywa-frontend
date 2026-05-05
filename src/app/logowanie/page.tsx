'use client';

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Mail, Lock, LogIn, Loader2, AlertCircle, CheckCircle2, MailWarning } from 'lucide-react';
import ReCAPTCHA from 'react-google-recaptcha';
import { useAuth } from '@/hooks/useAuth';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

interface LoginFormData {
  email: string;
  password: string;
}

/** Pull a human-friendly message out of any DRF/axios error shape */
function extractErrorMessage(error: any): string {
  const data = error?.response?.data;
  if (data) {
    if (typeof data === 'string' && data.length < 300) return data;
    if (typeof data.message === 'string') return data.message;
    if (typeof data.detail === 'string') return data.detail;
    if (typeof data.error === 'string') return data.error;
    if (Array.isArray(data.non_field_errors)) return data.non_field_errors.join(' ');
    if (typeof data === 'object') {
      const parts: string[] = [];
      for (const v of Object.values(data)) {
        if (Array.isArray(v)) parts.push(...v.map(String));
        else if (typeof v === 'string') parts.push(v);
      }
      if (parts.length) return parts.join(' ');
    }
  }
  return error?.message || 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.';
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoggingIn, isAuthenticated, isLoading } = useAuth();
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  const isRecaptchaEnabled = Boolean(recaptchaSiteKey);

  const [showPassword, setShowPassword] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [recaptchaError, setRecaptchaError] = useState<string | null>(null);
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const recaptchaRef = useRef<ReCAPTCHA | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    clearErrors,
  } = useForm<LoginFormData>({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Get redirect URL from query params — validate it's a relative path to prevent open redirect
  const rawRedirect = searchParams.get('redirect') || searchParams.get('next') || '/';
  const redirectUrl = rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/';
  const verified = searchParams.get('verified');
  const registered = searchParams.get('registered');
  const reason = searchParams.get('reason'); // e.g. 'session-expired'

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push(redirectUrl);
    }
  }, [isAuthenticated, isLoading, router, redirectUrl]);

  // Show toast for email verification & registration status (only once per arrival)
  useEffect(() => {
    if (verified === 'success') {
      toast.success('Twój adres e-mail został zweryfikowany! Możesz się teraz zalogować.');
    } else if (verified === 'expired') {
      toast('Link weryfikacyjny wygasł. Zarejestruj się ponownie.', { icon: '⚠️' });
    } else if (verified === 'failed') {
      toast.error('Link weryfikacyjny jest nieprawidłowy lub został już użyty.');
    }
    if (registered === 'true') {
      toast.success('Konto utworzone! Sprawdź swoją skrzynkę e-mail, aby je aktywować.', { duration: 6000 });
    }
    if (reason === 'session-expired') {
      toast('Sesja wygasła. Zaloguj się ponownie.', { icon: '🔒' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetRecaptcha = () => {
    try {
      recaptchaRef.current?.reset();
    } catch {
      /* ignore */
    }
    setRecaptchaToken(null);
  };

  const onRecaptchaChange = useCallback((token: string | null) => {
    setRecaptchaToken(token);
    if (token) setRecaptchaError(null);
  }, []);

  const onRecaptchaExpired = useCallback(() => {
    setRecaptchaToken(null);
  }, []);

  const onSubmit = (data: LoginFormData) => {
    // Clear previous errors
    clearErrors();
    setEmailNotVerified(false);

    // Validate reCAPTCHA
    if (isRecaptchaEnabled && !recaptchaToken) {
      setRecaptchaError('Proszę potwierdzić, że nie jesteś robotem');
      return;
    }

    login(
      { ...data },
      {
        onSuccess: () => {
          router.push(redirectUrl);
        },
        onError: (error: any) => {
          const status = error?.response?.status;
          const message = extractErrorMessage(error);

          // Reset reCAPTCHA after any failed attempt
          if (isRecaptchaEnabled) resetRecaptcha();

          // 403 - email not verified
          if (status === 403) {
            setEmailNotVerified(true);
            setError('root', { message });
            toast.error('Konto nie zostało jeszcze zweryfikowane.');
            return;
          }

          // 401 - bad credentials
          if (status === 401) {
            setError('root', { message: message || 'Nieprawidłowy email lub hasło.' });
            toast.error('Nieprawidłowy email lub hasło.');
            return;
          }

          // Generic / 500
          setError('root', { message });
          toast.error(message);
        },
      }
    );
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
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-900">
      {/* Left Column - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 py-12 lg:px-16 xl:px-24 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 z-20 lg:shadow-2xl">
        <div className="w-full max-w-md mx-auto">
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
              Zaloguj się
            </h1>
            <p className="text-slate-400">
              Witaj ponownie! Zaloguj się do swojego konta.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {/* Verification Status banners */}
            {verified === 'success' && (
              <div role="status" className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-emerald-300">
                  Twój adres e-mail został zweryfikowany! Możesz się teraz zalogować.
                </p>
              </div>
            )}
            {verified === 'expired' && (
              <div role="status" className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-300">
                  Link weryfikacyjny wygasł.{' '}
                  <Link href="/rejestracja" className="underline hover:text-amber-200">
                    Zarejestruj się ponownie
                  </Link>
                  .
                </p>
              </div>
            )}
            {verified === 'failed' && (
              <div role="alert" className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-300">
                  Link weryfikacyjny jest nieprawidłowy lub został już użyty.
                </p>
              </div>
            )}
            {registered === 'true' && (
              <div role="status" className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-start gap-3">
                <MailWarning className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-200">
                  <p className="font-semibold mb-1">Konto utworzone pomyślnie!</p>
                  <p>
                    Wysłaliśmy link aktywacyjny na Twój adres e-mail. Sprawdź skrzynkę (oraz folder
                    Spam), aby aktywować konto.
                  </p>
                </div>
              </div>
            )}

            {/* Email-not-verified specific banner (after attempted login) */}
            {emailNotVerified && (
              <div role="alert" aria-live="polite" className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3">
                <MailWarning className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-200">
                  <p className="font-semibold mb-1">Adres e-mail nie został potwierdzony</p>
                  <p>
                    Sprawdź swoją skrzynkę pocztową (i folder Spam) i kliknij link aktywacyjny,
                    który wysłaliśmy podczas rejestracji.
                  </p>
                </div>
              </div>
            )}

            {/* Global Error (only shown when not the email-verification case) */}
            {errors.root && !emailNotVerified && (
              <div role="alert" aria-live="polite" className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-300">{errors.root.message}</p>
              </div>
            )}

            {/* Email/Username Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  id="email"
                  autoComplete="username"
                  placeholder="twoj@email.pl"
                  aria-invalid={!!errors.email}
                  {...register('email', {
                    required: 'Podaj swój adres email',
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
                <p role="alert" className="mt-2 text-sm text-red-400">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                Hasło
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  aria-invalid={!!errors.password}
                  {...register('password', {
                    required: 'Podaj hasło',
                    minLength: {
                      value: 6,
                      message: 'Hasło musi mieć co najmniej 6 znaków',
                    },
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
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p role="alert" className="mt-2 text-sm text-red-400">{errors.password.message}</p>
              )}
            </div>

            {/* Forgot Password Link */}
            <div className="flex justify-end">
              <Link
                href="/reset-hasla"
                className="text-sm text-amber-500 hover:text-amber-400 transition-colors"
              >
                Zapomniałeś hasła?
              </Link>
            </div>

            {/* reCAPTCHA */}
            {isRecaptchaEnabled && (
              <div className="flex flex-col items-center">
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={recaptchaSiteKey as string}
                  onChange={onRecaptchaChange}
                  onExpired={onRecaptchaExpired}
                  theme="dark"
                />
                {recaptchaError && (
                  <p role="alert" className="mt-2 text-sm text-red-400">{recaptchaError}</p>
                )}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoggingIn}
              className={clsx(
                'w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-semibold text-white',
                'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700',
                'shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40',
                'focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-2 focus:ring-offset-slate-900',
                'transition-all duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-amber-500/25'
              )}
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Logowanie...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Zaloguj się</span>
                </>
              )}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-8">
            <p className="text-center text-slate-400 mb-4">
              Nie masz konta?
            </p>
            <Link
              href="/rejestracja"
              className={clsx(
                'w-full flex items-center justify-center py-3.5 px-6 rounded-xl font-semibold',
                'bg-transparent border-2 border-amber-500 text-amber-500',
                'hover:bg-amber-500 hover:text-white',
                'focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-2 focus:ring-offset-slate-900',
                'transition-all duration-200'
              )}
            >
              Stwórz je teraz
            </Link>
          </div>
        </div>
      </div>

      {/* Right Column - Image */}
      <div className="w-full h-64 lg:h-auto lg:w-1/2 relative order-first lg:order-last">
        <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-slate-900 via-slate-900/40 to-transparent z-10 pointer-events-none" />
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
              Odkryj wydarzenia w Twojej parafii
            </h2>
            <p className="text-slate-200 text-sm lg:text-lg">
              Dołącz do tysięcy katolików, którzy korzystają z naszej platformy,
              aby być na bieżąco z wydarzeniami religijnymi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-900" />}>
      <LoginContent />
    </Suspense>
  );
}
