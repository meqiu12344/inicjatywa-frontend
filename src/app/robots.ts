import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
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