import type { MetadataRoute } from 'next';
import { IS_TEST_ENV } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  if (IS_TEST_ENV) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/api/',
        '/profil/',
        '/moje-wydarzenia/',
        '/moje-bilety/',
        '/bilety/organizator/',
        '/bilety/skaner/',
        '/logowanie',
        '/rejestracja',
        '/reset-hasla',
        '/resetuj-haslo',
      ],
    },
  };
}