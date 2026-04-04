'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send, Save, FileText, Eye } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient, getErrorMessage } from '@/lib/api/client';
import toast from 'react-hot-toast';

const CKEditorWrapper = dynamic(() => import('@/components/CKEditorWrapper'), { ssr: false });

interface NewsletterFormData {
  title: string;
  content: string;
}

export default function NewNewsletterPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState<NewsletterFormData>({
    title: '',
    content: '',
  });
  const [showPreview, setShowPreview] = useState(false);

  // Sprawdź czy użytkownik jest adminem
  if (!isAuthenticated || !user?.is_staff) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Brak dostępu</h1>
          <p className="text-gray-600 mb-4">Ta strona jest dostępna tylko dla administratorów.</p>
          <Link href="/" className="text-primary-600 hover:underline">
            Wróć do strony głównej
          </Link>
        </div>
      </div>
    );
  }

  const saveDraftMutation = useMutation({
    mutationFn: async (data: NewsletterFormData) => {
      const response = await apiClient.post('/newsletter/admin/drafts/', {
        ...data,
        is_published: false,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Zapisano szkic');
      queryClient.invalidateQueries({ queryKey: ['newsletters'] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Błąd podczas zapisywania szkicu'));
    },
  });

  const sendNewsletterMutation = useMutation({
    mutationFn: async (data: NewsletterFormData) => {
      const response = await apiClient.post('/newsletter/admin/send/', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Newsletter został wysłany!');
      queryClient.invalidateQueries({ queryKey: ['newsletters'] });
      router.push('/admin/newsletter');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Błąd podczas wysyłania newslettera'));
    },
  });

  const handleSaveDraft = () => {
    if (!formData.title || !formData.content) {
      toast.error('Wypełnij tytuł i treść');
      return;
    }
    saveDraftMutation.mutate(formData);
  };

  const handleSend = () => {
    if (!formData.title || !formData.content) {
      toast.error('Wypełnij tytuł i treść');
      return;
    }
    if (confirm('Czy na pewno chcesz wysłać ten newsletter do wszystkich subskrybentów?')) {
      sendNewsletterMutation.mutate(formData);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/newsletter"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Powrót do listy
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary-600" />
            Nowy Newsletter
          </h1>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setShowPreview(false)}
                className={`px-6 py-4 text-sm font-medium ${
                  !showPreview
                    ? 'border-b-2 border-primary-600 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Edycja
              </button>
              <button
                onClick={() => setShowPreview(true)}
                className={`px-6 py-4 text-sm font-medium flex items-center gap-2 ${
                  showPreview
                    ? 'border-b-2 border-primary-600 text-primary-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Eye className="w-4 h-4" />
                Podgląd
              </button>
            </nav>
          </div>

          <div className="p-6">
            {!showPreview ? (
              <div className="space-y-6">
                {/* Tytuł */}
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                    Tytuł newslettera
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Wpisz tytuł..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                {/* Treść */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Treść newslettera
                  </label>
                  <div className="ck-editor-large">
                    <CKEditorWrapper
                      value={formData.content}
                      onChange={(data) => setFormData({ ...formData, content: data })}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="prose max-w-none">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  {formData.title || 'Brak tytułu'}
                </h2>
                <div
                  className="text-gray-700"
                  dangerouslySetInnerHTML={{
                    __html: formData.content || '<p class="text-gray-400">Brak treści</p>',
                  }}
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
            <button
              onClick={handleSaveDraft}
              disabled={saveDraftMutation.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saveDraftMutation.isPending ? 'Zapisywanie...' : 'Zapisz szkic'}
            </button>
            <button
              onClick={handleSend}
              disabled={sendNewsletterMutation.isPending}
              className="inline-flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {sendNewsletterMutation.isPending ? 'Wysyłanie...' : 'Wyślij newsletter'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
