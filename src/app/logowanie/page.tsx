'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Mail, Lock, LogIn, Loader2 } from 'lucide-react';
import ReCAPTCHA from 'react-google-recaptcha';
import { useAuth } from '@/hooks/useAuth';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';

interface LoginFormData {
  email: string;
  password: string;
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

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
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

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push(redirectUrl);
    }
  }, [isAuthenticated, isLoading, router, redirectUrl]);

  // Show toast for email verification status
  useEffect(() => {
    if (verified === 'success') {
      toast.success('Twój adres e-mail został zweryfikowany!');
    } else if (verified === 'expired') {
      toast('Link weryfikacyjny wygasł. Zarejestruj się ponownie.', { icon: '⚠️' });
    } else if (verified === 'failed') {
      toast.error('Link weryfikacyjny jest nieprawidłowy lub został już użyty.');
    }
  }, [verified]);

  const onRecaptchaChange = useCallback((token: string | null) => {
    setRecaptchaToken(token);
    if (token) {
      setRecaptchaError(null);
    }
  }, []);

  const onRecaptchaExpired = useCallback(() => {
    setRecaptchaToken(null);
  }, []);

  const onSubmit = (data: LoginFormData) => {
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
          // Handle specific error messages
          const message = error?.response?.data?.detail || error?.message || 'Błąd logowania';
          if (message.toLowerCase().includes('email') || message.toLowerCase().includes('użytkownik')) {
            setError('email', { message });
          } else if (message.toLowerCase().includes('hasło') || message.toLowerCase().includes('password')) {
            setError('password', { message });
          } else {
            setError('root', { message });
          }
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
    <div className="min-h-screen flex bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Left Column - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 py-12 lg:px-16 xl:px-24">
        <div className="w-full max-w-md mx-auto">
          {/* Logo */}
          <div className="mb-10">
            <Link href="/" className="inline-flex items-center gap-3 group">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/25 group-hover:shadow-amber-500/40 transition-shadow">
                <span className="text-white font-bold text-xl">WK</span>
              </div>
              <span className="font-display font-semibold text-xl text-white">
                Wydarzenia Katolickie
              </span>
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
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Verification Status */}
            {verified === 'success' && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <p className="text-sm text-emerald-400">✅ Twój adres e-mail został zweryfikowany! Możesz się teraz zalogować.</p>
              </div>
            )}
            {verified === 'expired' && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-sm text-amber-400">⚠️ Link weryfikacyjny wygasł. Zarejestruj się ponownie.</p>
              </div>
            )}
            {verified === 'failed' && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-400">❌ Link weryfikacyjny jest nieprawidłowy lub został już użyty.</p>
              </div>
            )}

            {/* Global Error */}
            {errors.root && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-400">{errors.root.message}</p>
              </div>
            )}

            {/* Email/Username Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                Email lub nazwa użytkownika
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  id="email"
                  autoComplete="username"
                  placeholder="twoj@email.pl"
                  {...register('email', {
                    required: 'Email lub nazwa użytkownika jest wymagana',
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
                  {...register('password', {
                    required: 'Hasło jest wymagane',
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
                <p className="mt-2 text-sm text-red-400">{errors.password.message}</p>
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
      <div className="hidden lg:block lg:w-1/2 relative">
        <div className="absolute inset-0 bg-gradient-to-l from-transparent via-slate-900/50 to-slate-900 z-10" />
        <Image
          src="/images/login-bg.jpg"
          alt="Kościół"
          fill
          className="object-cover"
          priority
          sizes="50vw"
        />
        {/* Overlay Content */}
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-12 text-center">
          <div className="max-w-md">
            <h2 className="font-display text-3xl font-bold text-white mb-4">
              Odkryj wydarzenia w Twojej parafii
            </h2>
            <p className="text-slate-300 text-lg">
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
