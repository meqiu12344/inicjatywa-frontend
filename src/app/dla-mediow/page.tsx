import PressHub from '@/components/press/PressHub';
import { Suspense } from 'react';

export const metadata = { title: 'IK Media Hub | Dla mediów', robots: { index: false, follow: false } };

export default function PressPage() {
  return <Suspense fallback={<p role="status">Ładowanie strefy prasowej...</p>}><PressHub /></Suspense>;
}