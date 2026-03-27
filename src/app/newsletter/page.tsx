'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Mail, Check, Bell, Calendar, ChevronRight, BookOpen } from 'lucide-react';
import { get, post } from '@/lib/api/client';
import toast from 'react-hot-toast';

interface Category {
  id: number;
  name: string;
}

interface NewsletterArchive {
  id: number;
  title: string;
  sent_at: string;
  newsletter_type: string;
}

export default function NewsletterPage() {
  const [email, setEmail] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [step, setStep] = useState<'form' | 'success'>('form');

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => get<Category[]>('/categories/'),
  });

  const { data: archiveData } = useQuery({
    queryKey: ['newsletter-archive'],
    queryFn: () => get<{ newsletters: NewsletterArchive[] }>('/newsletter/archive/'),
  });

  const subscribeMutation = useMutation({
    mutationFn: (data: { email: string; categories: number[] }) => 
      post<{ message: string }>('/newsletter/subscribe/', data),
    onSuccess: (data) => {
      setStep('success');
      toast.success('Sprawdź swoją skrzynkę email!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Nie udało się zapisać do newslettera');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Podaj adres email');
      return;
    }
    subscribeMutation.mutate({ email, categories: selectedCategories });
  };

  const toggleCategory = (categoryId: number) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const selectAllCategories = () => {
    if (categoriesData) {
      setSelectedCategories(categoriesData.map(c => c.id));
    }
  };

  const categories = categoriesData || [];

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
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Interesujące kategorie
                  </label>
                  <button
                    type="button"
                    onClick={selectAllCategories}
                    className="text-sm text-primary-600 hover:text-primary-800"
                  >
                    Zaznacz wszystkie
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map((category) => (
                    <label
                      key={category.id}
                      className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedCategories.includes(category.id)
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category.id)}
                        onChange={() => toggleCategory(category.id)}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                        selectedCategories.includes(category.id)
                          ? 'bg-primary-600 border-primary-600'
                          : 'border-gray-300'
                      }`}>
                        {selectedCategories.includes(category.id) && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <span className="text-sm text-gray-700">{category.name}</span>
                    </label>
                  ))}
                </div>
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
            {archiveData?.newsletters && archiveData.newsletters.length > 0 && (
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Archiwum newsletterów</h3>
                <ul className="space-y-3">
                  {archiveData.newsletters.slice(0, 5).map((newsletter) => (
                    <li 
                      key={newsletter.id}
                      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                    >
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{newsletter.title}</h4>
                        <p className="text-xs text-gray-500">
                          {new Date(newsletter.sent_at).toLocaleDateString('pl-PL', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
