'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  KeyRound,
  Mail,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { clsx } from 'clsx';
import { authApi } from '@/lib/api/auth';

interface FormData {
  email: string;
}

export default function ResetPasswordRequestPage() {
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<FormData>({ defaultValues: { email: '' } });

  const mutation = useMutation({
    mutationFn: (email: string) => authApi.requestPasswordReset(email),
    onSuccess: (_data, email) => {
      setSubmittedEmail(email);
      toast.success('Sprawdź skrzynkę email');
    },
    onError: (error: any) => {
      const data = error?.response?.data;
      const fieldErr = Array.isArray(data?.email) ? data.email.join(' ') : data?.email;
      if (fieldErr) {
        setError('email', { message: String(fieldErr) });
        toast.error(String(fieldErr));
        return;
      }
      const msg =
        data?.message ||
        data?.detail ||
        data?.error ||
        error?.message ||
        'Nie udało się wysłać linku. Spróbuj ponownie.';
      toast.error(String(msg));
      setError('root', { message: String(msg) });
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data.email.trim());
  };

  // Success screen
  if (submittedEmail) {
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
            <h1 className="text-2xl font-bold text-white mb-3">Sprawdź swoją skrzynkę</h1>
            <p className="text-slate-300 mb-2">
              Jeśli konto powiązane z adresem
            </p>
            <p className="font-semibold text-amber-400 mb-4 break-all">{submittedEmail}</p>
            <p className="text-slate-400 text-sm mb-6">
              istnieje w naszej bazie, wysłaliśmy na nie link do zresetowania hasła.
              Link wygaśnie po 24 godzinach.
            </p>
            <p className="text-slate-500 text-xs mb-8">
              Nie widzisz wiadomości? Sprawdź folder SPAM lub poczekaj kilka minut.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/logowanie"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-xl transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Wróć do logowania
              </Link>
              <button
                onClick={() => setSubmittedEmail(null)}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-slate-700/60 hover:bg-slate-700 text-slate-200 font-medium rounded-xl transition-colors"
              >
                Spróbuj z innym adresem
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4 flex items-center justify-center">
      <div className="max-w-lg w-full mx-auto">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8">
          <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <KeyRound className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2 text-center">
            Reset hasła
          </h1>
          <p className="text-slate-400 text-center mb-8">
            Podaj adres email powiązany z Twoim kontem. Wyślemy na niego link, dzięki któremu ustawisz nowe hasło.
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

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                Adres email
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
                    'w-full pl-12 pr-4 py-3.5 bg-slate-900/60 border rounded-xl text-white placeholder-slate-500',
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
                  <span>Wysyłanie...</span>
                </>
              ) : (
                <>
                  <Mail className="w-5 h-5" />
                  <span>Wyślij link resetujący</span>
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
