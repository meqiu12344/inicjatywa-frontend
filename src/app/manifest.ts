import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Inicjatywa Katolicka — Skaner biletów',
    short_name: 'Skaner biletów',
    description: 'Skaner biletów na bramki — działa również offline.',
    start_url: '/bilety/moje',
    display: 'standalone',
    background_color: '#111827',
    theme_color: '#111827',
    orientation: 'portrait',
    icons: [
      {
        src: '/images/inicjatywa-logo-granatowe.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/images/favicon.ico',
        sizes: '48x48',
        type: 'image/x-icon',
      },
    ],
  };
}
