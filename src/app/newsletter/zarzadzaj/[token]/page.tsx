'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Check, Loader2, Mail, Save, XCircle } from 'lucide-react';
import { get, put, post } from '@/lib/api/client';
import toast from 'react-hot-toast';

interface Category {
  id: number;
  name: string;
}

interface ManageResponse {
  email: string;
  is_active: boolean;
  categories: number[];
  all_categories: Category[];
}

export default function ManageNewsletterPage() {
  const params = useParams();
  const token = params.token as string;

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const [email, setEmail] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await get<ManageResponse>(`/newsletter/manage/${token}/`);
        setEmail(response.email);
        setIsActive(response.is_active);
        setCategories(response.all_categories || []);
        setSelectedCategories(response.categories || []);
        setStatus('ready');
      } catch (error: any) {
        setStatus('error');
        setErrorMessage(error.response?.data?.error || 'Nie udalo sie pobrac preferencji subskrypcji');
      }
    };

    if (token) {
      fetchData();
    }
  }, [token]);

  const hasCategories = useMemo(() => categories.length > 0, [categories]);

  const toggleCategory = (categoryId: number) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await put<{ message: string }>(`/newsletter/manage/${token}/`, {
        is_active: isActive,
        categories: selectedCategories,
      });
      toast.success('Preferencje zostaly zapisane');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Nie udalo sie zapisac preferencji');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsUnsubscribing(true);
    try {
      const response = await post<{ message: string }>(`/newsletter/unsubscribe/${token}/`, {});
      setIsActive(false);
      toast.success(response.message || 'Wypisano z newslettera');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Nie udalo sie wypisac z newslettera');
    } finally {
      setIsUnsubscribing(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Ladowanie preferencji...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto px-4 text-center">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="h-10 w-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Nie mozna otworzyc ustawien</h1>
            <p className="text-gray-600 mb-6">{errorMessage}</p>
            <Link
              href="/newsletter"
              className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Wroc do newslettera
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white py-12">
      <div className="max-w-3xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
              <Mail className="h-5 w-5 text-primary-700" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Zarzadzaj subskrypcja</h1>
              <p className="text-sm text-gray-600">{email}</p>
            </div>
          </div>

          <div className="mb-6 rounded-lg border border-gray-200 p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="mt-1"
              />
              <div>
                <p className="font-medium text-gray-900">Aktywna subskrypcja</p>
                <p className="text-sm text-gray-600">
                  Wylaczenie opcji zatrzymuje wysylke newslettera, ale zachowuje preferencje kategorii.
                </p>
              </div>
            </label>
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">Kategorie</h2>
              {hasCategories && (
                <button
                  type="button"
                  onClick={() => setSelectedCategories(categories.map((c) => c.id))}
                  className="text-sm text-primary-700 hover:text-primary-900"
                >
                  Zaznacz wszystkie
                </button>
              )}
            </div>

            {!hasCategories ? (
              <p className="text-sm text-gray-600">Brak dostepnych kategorii.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2">
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
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center ${
                        selectedCategories.includes(category.id)
                          ? 'bg-primary-600 border-primary-600'
                          : 'border-gray-300'
                      }`}
                    >
                      {selectedCategories.includes(category.id) && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                    <span className="text-sm text-gray-700">{category.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 bg-primary-600 text-white px-5 py-3 rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Zapisz preferencje
            </button>

            <button
              type="button"
              onClick={handleUnsubscribe}
              disabled={isUnsubscribing}
              className="inline-flex items-center justify-center gap-2 bg-red-600 text-white px-5 py-3 rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {isUnsubscribing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Wypisz mnie z newslettera
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
