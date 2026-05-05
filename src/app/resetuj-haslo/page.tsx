'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  KeyRound,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Check,
} from 'lucide-react';
import { clsx } from 'clsx';
import { authApi } from '@/lib/api/auth';

interface FormData {
  new_password: string;
  new_password_confirm: string;
}

function ResetPasswordConfirmInner() {
  const router = useRouter();
  const params = useSearchParams();
  const uid = params.get('uid') || '';
  const token = params.get('token') || '';

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setError,
  } = useForm<FormData>({
    defaultValues: { new_password: '', new_password_confirm: '' },
  });

  const password = watch('new_password');

  const validatePassword = (p: string) => ({
    length: (p || '').length >= 8,
    lowercase: /[a-z]/.test(p || ''),
    uppercase: /[A-Z]/.test(p || ''),
    number: /\d/.test(p || ''),
  });
  const passwordChecks = validatePassword(password);

  const mutation = useMutation({
    mutationFn: (data: { new_password: string }) =>
      authApi.confirmPasswordReset({ uid, token, new_password: data.new_password }),
    onSuccess: () => {
      setSuccess(true);
      toast.success('Hasło zostało zmienione!');
      // Redirect after 3s
      setTimeout(() => {
        router.push('/logowanie?reset=success');
      }, 3000);
    },
    onError: (error: any) => {
      const data = error?.response?.data;

      // map backend per-field errors
      let mapped = false;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        if (data.new_password) {
          const msg = Array.isArray(data.new_password) ? data.new_password.join(' ') : String(data.new_password);
          setError('new_password', { message: msg });
          mapped = true;
        }
        if (data.token || data.uid) {
          const msg = 'Link resetujący jest nieprawidłowy lub wygasł. Poproś o nowy link.';
          setError('root', { message: msg });
          toast.error(msg);
          mapped = true;
        }
      }

      if (!mapped) {
        const msg =
          data?.message ||
          data?.detail ||
          data?.error ||
          error?.message ||
          'Nie udało się zmienić hasła. Spróbuj ponownie.';
        setError('root', { message: String(msg) });
        toast.error(String(msg));
      }
    },
  });

  // No uid/token => invalid link
  if (!uid || !token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4 flex items-center justify-center">
        <div className="max-w-lg w-full mx-auto">
          <div
            role="alert"
            className="bg-slate-800/50 backdrop-blur-sm border border-red-500/30 rounded-2xl p-8 text-center"
          >
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">Nieprawidłowy link</h1>
            <p className="text-slate-300 mb-8">
              Link do resetowania hasła jest nieprawidłowy lub niekompletny. Poproś o nowy link.
            </p>
            <Link
              href="/reset-hasla"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-xl transition-colors"
            >
              <KeyRound className="w-4 h-4" />
              Poproś o nowy link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success screen
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4 flex items-center justify-center">
        <div className="max-w-lg w-full mx-auto">
          <div
            role="status"
            aria-live="polite"
            className="bg-slate-800/50 backdrop-blur-sm border border-emerald-500/30 rounded-2xl p-8 text-center"
          >
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">Hasło zmienione!</h1>
            <p className="text-slate-300 mb-8">
              Twoje hasło zostało pomyślnie zmienione. Za chwilę zostaniesz przekierowany do strony logowania.
            </p>
            <Link
              href="/logowanie"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-xl transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Przejdź do logowania
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const onSubmit = (data: FormData) => {
    if (data.new_password !== data.new_password_confirm) {
      setError('new_password_confirm', { message: 'Hasła nie są identyczne' });
      return;
    }
    if (!Object.values(passwordChecks).every(Boolean)) {
      setError('new_password', { message: 'Hasło nie spełnia wymagań bezpieczeństwa' });
      return;
    }
    mutation.mutate({ new_password: data.new_password });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4 flex items-center justify-center">
      <div className="max-w-lg w-full mx-auto">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8">
          <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <KeyRound className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2 text-center">
            Ustaw nowe hasło
          </h1>
          <p className="text-slate-400 text-center mb-8">
            Wpisz nowe hasło, którym będziesz logować się do konta.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {errors.root && (
              <div
                role="alert"
                className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg"
              >
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{errors.root.message}</p>
              </div>
            )}

            {/* Password */}
            <div>
              <label htmlFor="new_password" className="block text-sm font-medium text-slate-300 mb-2">
                Nowe hasło
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="new_password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  {...register('new_password', { required: 'Hasło jest wymagane' })}
                  className={clsx(
                    'w-full pl-12 pr-12 py-3.5 bg-slate-900/60 border rounded-xl text-white placeholder-slate-500',
                    'focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500',
                    'transition-all duration-200',
                    errors.new_password
                      ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500'
                      : 'border-slate-700 hover:border-slate-600'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.new_password && (
                <p className="mt-2 text-sm text-red-400">{errors.new_password.message}</p>
              )}
              {password && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <PwCheck passed={passwordChecks.length} label="Min. 8 znaków" />
                  <PwCheck passed={passwordChecks.lowercase} label="Mała litera" />
                  <PwCheck passed={passwordChecks.uppercase} label="Wielka litera" />
                  <PwCheck passed={passwordChecks.number} label="Cyfra" />
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="new_password_confirm" className="block text-sm font-medium text-slate-300 mb-2">
                Powtórz nowe hasło
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="new_password_confirm"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  {...register('new_password_confirm', {
                    required: 'Potwierdzenie hasła jest wymagane',
                    validate: (v) => v === password || 'Hasła nie są identyczne',
                  })}
                  className={clsx(
                    'w-full pl-12 pr-12 py-3.5 bg-slate-900/60 border rounded-xl text-white placeholder-slate-500',
                    'focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500',
                    'transition-all duration-200',
                    errors.new_password_confirm
                      ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500'
                      : 'border-slate-700 hover:border-slate-600'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((s) => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  aria-label={showConfirmPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.new_password_confirm && (
                <p className="mt-2 text-sm text-red-400">{errors.new_password_confirm.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={mutation.isPending}
              className={clsx(
                'w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-semibold text-white',
                'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700',
                'shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40',
                'focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-2 focus:ring-offset-slate-900',
                'transition-all duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Zapisywanie...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-5 h-5" />
                  <span>Zmień hasło</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <Link
              href="/logowanie"
              className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Wróć do logowania
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function PwCheck({ passed, label }: { passed: boolean; label: string }) {
  return (
    <div
      className={clsx(
        'flex items-center gap-2 text-xs transition-colors',
        passed ? 'text-green-400' : 'text-slate-500'
      )}
    >
      <Check className={clsx('w-3.5 h-3.5', passed ? 'opacity-100' : 'opacity-50')} />
      {label}
    </div>
  );
}

export default function ResetPasswordConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      }
    >
      <ResetPasswordConfirmInner />
    </Suspense>
  );
}
