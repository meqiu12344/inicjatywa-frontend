import { Suspense } from 'react';
import { PressLogin } from '@/components/press/PressAuth';

export const metadata = { title: 'Logowanie | IK Media Hub', robots: { index: false, follow: false } };

export default function PressLoginPage() {
  return <Suspense fallback={<p role="status">Ładowanie…</p>}><PressLogin /></Suspense>;
}
