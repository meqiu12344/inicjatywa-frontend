'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Mail, Check, Bell, Calendar, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { useClassification } from '@/hooks/useEvents';
import { ClassificationPicker } from '@/components/events/ClassificationPicker';
import { emptyChoice } from '@/lib/classification';
import type { ClassificationChoice, ClassificationField } from '@/types';
import { newsletterApi, NewsletterApiError, NEWSLETTER_ARCHIVE_PATH } from '@/lib/api/newsletter';
import { NewsletterArchiveList } from '@/components/newsletter/NewsletterArchiveList';
import toast from 'react-hot-toast';

// „Dla kogo?” na początku; bez żadnego wyboru subskrybent dostaje wszystkie wydarzenia.
const NEWSLETTER_FIELDS: ClassificationField[] = ['audiences', 'event_types', 'topics'];

export default function NewsletterPage() {
  const [email, setEmail] = useState('');
  const [choice, setChoice] = useState<ClassificationChoice>(emptyChoice);
  const [step, setStep] = useState<'form' | 'success'>('form');

  const classificationQuery = useClassification();

  const { data: archiveData, isPending: isArchivePending, isError: isArchiveError } = useQuery({
    queryKey: ['newsletter-archive'],
    queryFn: () => newsletterApi.archive(),
  });

  const subscribeMutation = useMutation({
    mutationFn: (data: { email: string } & Partial<ClassificationChoice>) =>  
      newsletterApi.subscribe(data),
    onSuccess: () => {
      setStep('success');
      toast.success('Sprawdź swoją skrzynkę email!');
    },
    onError: (error: unknown) => {
      toast.error(error instanceof NewsletterApiError ? error.message : 'Nie udało się zapisać do newslettera');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Podaj adres email');
      return;
    }
    subscribeMutation.mutate({
      email, event_types: choice.event_types, audiences: choice.audiences, topics: choice.topics,
    });
  };


  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white py-16">
        <div className="max-w-lg mx-auto px-4 text-center">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Prawie gotowe!
            </h1>
            <p className="text-gray-600 mb-6">
              Wysłaliśmy email na adres <strong>{email}</strong>. 
              Kliknij w link potwierdzający, aby aktywować subskrypcję.
            </p>
            <p className="text-sm text-gray-500">
              Nie widzisz emaila? Sprawdź folder spam.
            </p>
            <Link href={NEWSLETTER_ARCHIVE_PATH} className="mt-6 inline-block font-medium text-primary-700 hover:underline">Czytaj archiwum newsletterów</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      {/* Hero Section */}
      <div className="bg-primary-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Mail className="h-16 w-16 mx-auto mb-6 opacity-80" />
          <h1 className="text-4xl font-bold mb-4">
            Newsletter Wydarzenia Katolickie
          </h1>
          <p className="text-xl text-primary-100 max-w-2xl mx-auto">
            Bądź na bieżąco z wydarzeniami w Twojej okolicy. 
            Otrzymuj cotygodniowe podsumowania i polecane wydarzenia.
          </p>
          <Link href={NEWSLETTER_ARCHIVE_PATH} className="mt-6 inline-block rounded-lg border border-white/50 px-5 py-3 font-medium text-white hover:bg-white/10">Czytaj poprzednie wydania</Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Subscription Form */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Zapisz się do newslettera
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adres email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="twoj@email.pl"
                />
              </div>

              <div>
                <p className="block text-sm font-medium text-gray-700 mb-1">Co Cię interesuje?</p>
                <p className="text-sm text-gray-500 mb-4">
                  Nieobowiązkowo. Bez wyboru wyślemy wszystkie wydarzenia; z wyborem — te, które mają którąkolwiek z zaznaczonych wartości.
                </p>
                <ClassificationPicker
                  dimensions={classificationQuery.data}
                  loading={classificationQuery.isFetching}
                  error={classificationQuery.isError}
                  onRetry={() => void classificationQuery.refetch()}
                  value={choice}
                  onChange={setChoice}
                  fields={NEWSLETTER_FIELDS}
                  mode="preferences"
                  className="space-y-5"
                />
              </div>

              <button
                type="submit"
                disabled={subscribeMutation.isPending}
                className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {subscribeMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Zapisywanie...
                  </>
                ) : (
                  <>
                    <Mail className="h-5 w-5" />
                    Zapisz się
                  </>
                )}
              </button>

              <p className="text-xs text-gray-500 text-center">
                Zapisując się, wyrażasz zgodę na otrzymywanie newslettera. 
                Możesz się wypisać w każdej chwili.
              </p>
            </form>
          </div>

          {/* Benefits */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Co otrzymasz?</h3>
              <ul className="space-y-4">
                <li className="flex gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Cotygodniowe podsumowanie</h4>
                    <p className="text-sm text-gray-600">Przegląd najciekawszych wydarzeń w nadchodzącym tygodniu</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Bell className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Powiadomienia o nowych wydarzeniach</h4>
                    <p className="text-sm text-gray-600">Informacje o wydarzeniach w Twoich ulubionych kategoriach</p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <BookOpen className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Polecane treści</h4>
                    <p className="text-sm text-gray-600">Specjalne rekomendacje dopasowane do Twoich zainteresowań</p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Archive */}
            <section aria-label="Archiwum newsletterów" className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="font-semibold text-gray-900 mb-2">Archiwum newsletterów</h2>
              <p className="mb-3 text-sm text-gray-600">Dostępne dla wszystkich, bez logowania i subskrypcji.</p>
              {isArchivePending ? <p className="text-sm text-gray-500">Ładowanie wydań…</p>
                : isArchiveError ? <p className="text-sm text-gray-600">Nie udało się pobrać listy wydań. Spróbuj otworzyć archiwum ponownie.</p>
                  : archiveData?.newsletters.length ? <NewsletterArchiveList newsletters={archiveData.newsletters.slice(0, 5)} />
                    : <p className="text-sm text-gray-500">Pierwsze wydanie pojawi się po wysyłce newslettera.</p>}
              <Link href={NEWSLETTER_ARCHIVE_PATH} className="mt-4 inline-block font-medium text-primary-700 hover:underline">Zobacz całe archiwum</Link>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
