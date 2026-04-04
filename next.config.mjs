/** @type {import('next').NextConfig} */
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
    ],
  },
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-test.inicjatywakatolicka.pl';
    return [
      {
        source: '/ckeditor5/:path*',
        destination: `${backendUrl}/ckeditor5/:path*`,
      },
    ];
  },
};

export default nextConfig;
