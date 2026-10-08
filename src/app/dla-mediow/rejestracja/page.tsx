import { Suspense } from 'react';
import { PressRegister } from '@/components/press/PressAuth';

export const metadata = { title: 'Rejestracja | IK Media Hub', robots: { index: false, follow: false } };

export default function PressRegisterPage() {
  return <Suspense fallback={<p role="status">Ładowanie…</p>}><PressRegister /></Suspense>;
}
