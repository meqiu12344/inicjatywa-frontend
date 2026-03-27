'use client';

import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  Send,
  Paperclip,
  CheckCircle,
  X,
  FileText,
  User,
  Mail,
  MessageSquare,
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

interface FormData {
  name: string;
  email: string;
  description: string;
  attachment: File | null;
}

interface FormErrors {
  name?: string;
  email?: string;
  description?: string;
}

export default function ReportErrorPage() {
  const { user, isAuthenticated } = useAuthStore();
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    description: '',
    attachment: null,
  });
  
  const [errors, setErrors] = useState<FormErrors>({});

  // Pre-fill user data when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      setFormData(prev => ({
        ...prev,
        name: user.first_name && user.last_name 
          ? `${user.first_name} ${user.last_name}` 
          : prev.name,
        email: user.email || prev.email,
      }));
    }
  }, [isAuthenticated, user]);

  const submitMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const formDataObj = new FormData();
      formDataObj.append('name', data.name);
      formDataObj.append('email', data.email);
      formDataObj.append('description', data.description);
      if (data.attachment) {
        formDataObj.append('attachment', data.attachment);
      }
      
      const response = await apiClient.post('/support/report-error/', formDataObj, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    onSuccess: () => {
      setIsSuccess(true);
    },
    onError: (error: unknown) => {
      const axiosError = error as { response?: { data?: { error?: string } } };
      toast.error(axiosError.response?.data?.error || 'Nie udało się wysłać zgłoszenia');
    },
  });

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Imię i nazwisko jest wymagane';
    } else if (/\d/.test(formData.name)) {
      newErrors.name = 'Imię i nazwisko nie może zawierać cyfr';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email jest wymagany';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Podaj prawidłowy adres email';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Opis błędu jest wymagany';
    } else if (formData.description.trim().length < 20) {
      newErrors.description = 'Opis powinien zawierać co najmniej 20 znaków';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      submitMutation.mutate(formData);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, attachment: file }));
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-8 text-center">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">
            Dziękujemy za zgłoszenie!
          </h1>
          <p className="text-gray-400 mb-6">
            Twój formularz zgłoszeniowy został wysłany. Skontaktujemy się z Tobą w razie potrzeby.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold rounded-xl transition-all"
          >
            Powrót na stronę główną
          </Link>
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
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-amber-400 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Powrót
          </Link>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-red-500/20 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                Zgłoś błąd
              </h1>
              <p className="text-gray-400 mt-1">
                Pomóż nam ulepszyć platformę
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 space-y-6">
            {/* Name */}
            <div>
              <label htmlFor="name" className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                <User className="w-4 h-4 text-gray-500" />
                Imię i nazwisko
                <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className={`w-full px-4 py-3 bg-gray-900/50 border ${
                  errors.name ? 'border-red-500' : 'border-gray-700'
                } rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all`}
                placeholder="Jan Kowalski"
              />
              {errors.name && (
                <p className="mt-2 text-sm text-red-400">{errors.name}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                <Mail className="w-4 h-4 text-gray-500" />
                Adres e-mail
                <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className={`w-full px-4 py-3 bg-gray-900/50 border ${
                  errors.email ? 'border-red-500' : 'border-gray-700'
                } rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all`}
                placeholder="jan@example.com"
              />
              {errors.email && (
                <p className="mt-2 text-sm text-red-400">{errors.email}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                <MessageSquare className="w-4 h-4 text-gray-500" />
                Opis błędu
                <span className="text-red-400">*</span>
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={6}
                className={`w-full px-4 py-3 bg-gray-900/50 border ${
                  errors.description ? 'border-red-500' : 'border-gray-700'
                } rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all resize-none`}
                placeholder="Opisz dokładnie napotkany problem, podaj kroki do jego odtworzenia..."
              />
              {errors.description && (
                <p className="mt-2 text-sm text-red-400">{errors.description}</p>
              )}
              <p className="mt-2 text-sm text-gray-500">
                {formData.description.length}/20 znaków minimum
              </p>
            </div>

            {/* Attachment */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                <Paperclip className="w-4 h-4 text-gray-500" />
                Załącznik (opcjonalnie)
              </label>
              
              {formData.attachment ? (
                <div className="flex items-center gap-3 p-4 bg-gray-900/50 border border-gray-700 rounded-xl">
                  <FileText className="w-8 h-8 text-amber-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">
                      {formData.attachment.name}
                    </p>
                    <p className="text-gray-500 text-sm">
                      {(formData.attachment.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, attachment: null }))}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <label className="block cursor-pointer">
                  <div className="flex items-center justify-center gap-3 p-6 bg-gray-900/30 border-2 border-dashed border-gray-700 rounded-xl hover:border-gray-600 transition-colors">
                    <Paperclip className="w-6 h-6 text-gray-500" />
                    <span className="text-gray-400">
                      Kliknij, aby dodać plik (zrzut ekranu, log itp.)
                    </span>
                  </div>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*,.pdf,.txt,.log"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={submitMutation.isPending}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all duration-300"
          >
            <Send className="w-5 h-5" />
            {submitMutation.isPending ? 'Wysyłanie...' : 'Wyślij zgłoszenie'}
          </button>
        </form>

        {/* Info */}
        <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
          <p className="text-blue-400 text-sm">
            <strong>Wskazówka:</strong> Im dokładniejszy opis błędu podasz, tym szybciej będziemy mogli go naprawić. 
            Pomocne są: zrzuty ekranu, dokładne kroki do odtworzenia problemu, informacje o przeglądarce.
          </p>
        </div>
      </div>
    </div>
  );
}
