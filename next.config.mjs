/** @type {import('next').NextConfig} */
const DEFAULT_BACKEND_URL = 'https://api-test.inicjatywakatolicka.pl';

function normalizeBackendUrl(value) {
  if (!value) {
    return DEFAULT_BACKEND_URL;
  }

  const normalized = String(value).trim().replace(/^['"]|['"]$/g, '').replace(/\/+$/, '');
  return normalized || DEFAULT_BACKEND_URL;
}

const nextConfig = {
  // Prevent Next.js from stripping trailing slashes on API routes (Django requires them)
  skipTrailingSlashRedirect: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/media/**',
      },
      {
        protocol: 'https',
        hostname: 'api-test.inicjatywakatolicka.pl',
        pathname: '/media/**',
      },
      {
        protocol: 'http',
        hostname: 'api-test.inicjatywakatolicka.pl',
        pathname: '/media/**',
      },
    ],
  },
  async rewrites() {
    const backendUrl = normalizeBackendUrl(process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL);
    return [
      {
        source: '/ckeditor5/:path*',
        destination: `${backendUrl}/ckeditor5/:path*`,
      },
    ];
  },
};

export default nextConfig;
