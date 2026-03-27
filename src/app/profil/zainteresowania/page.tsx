'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Save, ArrowLeft, Check, Loader2 } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { authApi } from '@/lib/api/auth';
import { useQueryClient } from '@tanstack/react-query';

interface Category {
  id: number;
  name: string;
  value: string;
}

export default function InterestsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/logowanie?redirect=/profil/zainteresowania');
      return;
    }

    if (isAuthenticated) {
      loadInterests();
    }
  }, [isAuthenticated, authLoading, router]);

  const loadInterests = async () => {
    try {
      const data = await authApi.getInterests();
      setCategories(data.all_categories);
      setSelectedCategories(data.favorite_categories);
    } catch (error) {
      console.error('Failed to load interests:', error);
      toast.error('Nie udało się załadować zainteresowań');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCategory = (categoryId: number) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await authApi.updateInterests(selectedCategories);
      toast.success('Zainteresowania zostały zapisane!');
      // Invalidate recommended events query
      queryClient.invalidateQueries({ queryKey: ['events', 'recommended'] });
      router.push('/');
    } catch (error) {
      console.error('Failed to save interests:', error);
      toast.error('Nie udało się zapisać zainteresowań');
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
        {/* Header */}
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
                Wybierz kategorie wydarzeń, które Cię interesują
              </p>
            </div>
          </div>
        </div>

        {/* Info box */}
        <div className="bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-100 rounded-xl p-4 mb-6">
          <p className="text-rose-800 text-sm">
            <strong>💡 Tip:</strong> Na podstawie Twoich zainteresowań pokażemy Ci spersonalizowane
            rekomendacje wydarzeń na stronie głównej i w cotygodniowym newsletterze.
          </p>
        </div>

        {/* Categories grid */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="font-semibold text-slate-900 mb-4">Wybierz kategorie</h2>
          
          {categories.length === 0 ? (
            <p className="text-slate-500">Brak dostępnych kategorii</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {categories.map((category) => {
                const isSelected = selectedCategories.includes(category.id);
                return (
                  <button
                    key={category.id}
                    onClick={() => toggleCategory(category.id)}
                    className={`
                      relative flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all
                      ${isSelected
                        ? 'border-rose-500 bg-rose-50 text-rose-700'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }
                    `}
                  >
                    {isSelected && (
                      <Check className="w-4 h-4 text-rose-500 absolute top-1 right-1" />
                    )}
                    <span className="text-sm font-medium text-center">{category.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected count */}
        <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div>
            <span className="text-slate-600">Wybrano: </span>
            <span className="font-semibold text-slate-900">
              {selectedCategories.length} {selectedCategories.length === 1 ? 'kategoria' : 
                selectedCategories.length < 5 ? 'kategorie' : 'kategorii'}
            </span>
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
