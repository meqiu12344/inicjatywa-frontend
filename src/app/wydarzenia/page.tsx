'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * Strona /wydarzenia - przekierowuje do /szukaj z zachowaniem parametrów
 */
function WydarzeniaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Przekieruj do /szukaj z zachowaniem wszystkich parametrów
    const params = searchParams.toString();
    router.replace(params ? `/szukaj?${params}` : '/szukaj');
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
        <p className="text-gray-600">Przekierowuję do wyszukiwarki wydarzeń...</p>
      </div>
    </div>
  );
}

export default function WydarzeniaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50" />}>
      <WydarzeniaContent />
    </Suspense>
  );
}
