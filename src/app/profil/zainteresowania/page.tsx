'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Save, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { useClassification } from '@/hooks/useEvents';
import { authApi } from '@/lib/api/auth';
import { getErrorMessage } from '@/lib/api/client';
import { useQueryClient } from '@tanstack/react-query';
import { ClassificationPicker } from '@/components/events/ClassificationPicker';
import { choiceFromIds, emptyChoice } from '@/lib/classification';
import type { ClassificationChoice, ClassificationField } from '@/types';

// „Dla kogo?” na początku — tak użytkownik najłatwiej opisuje siebie (np. Single, Rodziny, Seniorzy).
const INTEREST_FIELDS: ClassificationField[] = ['audiences', 'event_types', 'topics'];

export default function InterestsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const classificationQuery = useClassification();

  const [choice, setChoice] = useState<ClassificationChoice>(emptyChoice);
  const [savedIds, setSavedIds] = useState<Partial<Record<ClassificationField, number[]>> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/logowanie?redirect=/profil/zainteresowania');
      return;
    }

    if (isAuthenticated) {
      authApi.getInterests()
        .then(data => setSavedIds(data))
        .catch(error => toast.error(getErrorMessage(error, 'Nie udało się załadować zainteresowań')))
        .finally(() => setIsLoading(false));
    }
  }, [isAuthenticated, authLoading, router]);

  // Preferencje przychodzą jako ID — zamieniamy je na slugi, gdy słowniki są już pobrane.
  useEffect(() => {
    if (savedIds && classificationQuery.data) setChoice(choiceFromIds(savedIds, classificationQuery.data));
  }, [savedIds, classificationQuery.data]);

  const selectedCount = INTEREST_FIELDS.reduce((sum, field) => sum + choice[field].length, 0);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await authApi.updateInterests({
        event_types: choice.event_types, audiences: choice.audiences, topics: choice.topics,
      });
      toast.success('Zainteresowania zostały zapisane!');
      queryClient.invalidateQueries({ queryKey: ['events', 'recommended'] });
      router.push('/');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Nie udało się zapisać zainteresowań'));
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <Link
            href="/profil"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Powrót do profilu
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center">
              <Heart className="w-6 h-6 text-rose-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Twoje zainteresowania</h1>
              <p className="text-slate-600">
                Powiedz nam, dla kogo szukasz wydarzeń i co Cię interesuje
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-100 rounded-xl p-4 mb-6">
          <p className="text-rose-800 text-sm">
            Na tej podstawie pokażemy Ci polecane wydarzenia na stronie głównej. Wydarzenie pasuje, jeśli ma
            którąkolwiek z wybranych wartości.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <ClassificationPicker
            dimensions={classificationQuery.data}
            loading={classificationQuery.isFetching}
            error={classificationQuery.isError}
            onRetry={() => void classificationQuery.refetch()}
            value={choice}
            onChange={setChoice}
            fields={INTEREST_FIELDS}
            mode="preferences"
            hints={{
              audiences: 'Na przykład: Single, Rodziny, Małżeństwa, Seniorzy.',
              event_types: 'Jakie wydarzenia lubisz — rekolekcje, koncerty, warsztaty…',
              topics: 'Tematy, które są Ci bliskie.',
            }}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div>
            <span className="text-slate-600">Wybrane wartości: </span>
            <span className="font-semibold text-slate-900">{selectedCount}</span>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-rose-600 text-white font-medium rounded-lg hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Zapisywanie...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Zapisz zainteresowania
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
