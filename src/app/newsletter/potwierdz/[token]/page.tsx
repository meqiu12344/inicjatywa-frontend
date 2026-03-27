'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { post } from '@/lib/api/client';

export default function ConfirmNewsletterPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const confirmSubscription = async () => {
      try {
        const response = await post<{ message: string; email?: string; already_confirmed?: boolean }>(
          `/newsletter/confirm/${token}/`,
          {}
        );
        setStatus('success');
        setMessage(response.message);
        if (response.email) {
          setEmail(response.email);
        }
      } catch (error: any) {
        setStatus('error');
        setMessage(error.response?.data?.error || 'Wystąpił błąd podczas potwierdzania subskrypcji');
      }
    };

    if (token) {
      confirmSubscription();
    }
  }, [token]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Potwierdzanie subskrypcji...</p>
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
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Potwierdzenie nie powiodło się
            </h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <Link
              href="/newsletter"
              className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Zapisz się ponownie
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto px-4 text-center">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Subskrypcja potwierdzona!
          </h1>
          <p className="text-gray-600 mb-6">
            {message}
            {email && (
              <>
                <br />
                <span className="font-medium">Email: {email}</span>
              </>
            )}
          </p>
          <div className="space-y-3">
            <Link
              href="/szukaj"
              className="block bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Przeglądaj wydarzenia
            </Link>
            <Link
              href="/"
              className="block text-gray-600 hover:text-gray-900"
            >
              Wróć do strony głównej
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
