'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MyTicketsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/moje-bilety');
  }, [router]);

  return null;
}
