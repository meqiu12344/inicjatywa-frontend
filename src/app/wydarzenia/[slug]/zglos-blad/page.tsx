'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, Send, CheckCircle } from 'lucide-react';
import { useEvent } from '@/hooks/useEvents';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

interface ReportErrorPageProps {
  params: Promise<{ slug: string }>;
}

const ERROR_TYPES = [
  { value: 'wrong_date', label: 'Błędna data lub godzina' },
  { value: 'wrong_location', label: 'Błędna lokalizacja' },
  { value: 'wrong_info', label: 'Błędne informacje o wydarzeniu' },
  { value: 'outdated', label: 'Wydarzenie nieaktualne' },
  { value: 'spam', label: 'Spam lub nieodpowiednia treść' },
  { value: 'duplicate', label: 'Duplikat innego wydarzenia' },
  { value: 'other', label: 'Inny problem' },
];

export default function ReportErrorPage({ params }: ReportErrorPageProps) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  const { data: event, isLoading } = useEvent(slug);
  
  const [errorType, setErrorType] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!errorType) {
      toast.error('Wybierz rodzaj błędu');
      return;
    }
    
    if (!description.trim()) {
      toast.error('Opisz problem');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await apiClient.post(`/events/${event?.id}/report-error/`, {
        error_type: errorType,
        description: description.trim(),
        reporter_email: email || undefined,
      });
      
      setIsSuccess(true);
      toast.success('Zgłoszenie zostało wysłane');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Nie udało się wysłać zgłoszenia');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Wydarzenie nie znalezione</h1>
          <Link href="/" className="text-amber-400 hover:text-amber-300">
            Wróć do strony głównej
          </Link>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 py-12">
        <div className="container mx-auto px-4 max-w-xl">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-8 text-center">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">Dziękujemy za zgłoszenie!</h1>
            <p className="text-gray-400 mb-8">
              Twoje zgłoszenie zostało przyjęte. Nasz zespół przeanalizuje problem i podejmie odpowiednie działania.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href={`/wydarzenia/${slug}`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Wróć do wydarzenia
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-black rounded-xl transition-colors"
              >
                Strona główna
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/wydarzenia/${slug}`}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-amber-400 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Powrót do wydarzenia
          </Link>
          
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Zgłoś błąd</h1>
              <p className="text-gray-400">{event.title}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Type */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Rodzaj problemu *
              </label>
              <div className="space-y-2">
                {ERROR_TYPES.map((type) => (
                  <label
                    key={type.value}
                    className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                      errorType === type.value
                        ? 'bg-amber-500/10 border-amber-500/50 text-amber-400'
                        : 'bg-gray-900/50 border-gray-700 text-gray-300 hover:border-gray-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="errorType"
                      value={type.value}
                      checked={errorType === type.value}
                      onChange={(e) => setErrorType(e.target.value)}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      errorType === type.value
                        ? 'border-amber-500 bg-amber-500'
                        : 'border-gray-600'
                    }`}>
                      {errorType === type.value && (
                        <div className="w-2 h-2 bg-white rounded-full" />
                      )}
                    </div>
                    <span>{type.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
                Opis problemu *
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                placeholder="Opisz szczegółowo co jest nie tak z tym wydarzeniem..."
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all resize-none"
                required
              />
            </div>

            {/* Email (optional) */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Twój email (opcjonalnie)
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
              />
              <p className="mt-2 text-xs text-gray-500">
                Podaj email, jeśli chcesz otrzymać informację o statusie zgłoszenia
              </p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || !errorType || !description.trim()}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-black font-semibold rounded-xl shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 disabled:shadow-none transition-all"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  Wysyłanie...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Wyślij zgłoszenie
                </>
              )}
            </button>
          </form>
        </div>

        {/* Info */}
        <p className="mt-6 text-center text-sm text-gray-500">
          Wszystkie zgłoszenia są weryfikowane przez nasz zespół. 
          Dziękujemy za pomoc w utrzymaniu jakości wydarzeń!
        </p>
      </div>
    </div>
  );
}
