import PressHub from '@/components/press/PressHub';
import { Suspense } from 'react';

export const metadata = { title: 'IK Media Hub | Panel redakcyjny', robots: { index: false, follow: false } };

export default function PressAdminPage() {
  return <Suspense fallback={<p role="status">Ładowanie panelu...</p>}><PressHub admin /></Suspense>;
}