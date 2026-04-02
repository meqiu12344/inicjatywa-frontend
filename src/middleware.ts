/**
 * Permission-based route protection middleware + API proxy
 */
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://test.inicjatywakatolicka.pl';

export const config = {
  matcher: [
    '/dodaj/:path*',
    '/admin/:path*',
    '/profil/:path*',
    '/moje-wydarzenia/:path*',
    '/api/:path*',
    '/media/:path*',
  ],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Proxy /api/ and /media/ requests to Django, preserving the full path including trailing slash
  if (pathname.startsWith('/api/') || pathname.startsWith('/media/')) {
    const url = new URL(pathname + request.nextUrl.search, BACKEND_URL);
    return NextResponse.rewrite(url);
  }

  // For protected routes, just pass through - client-side guards handle permissions
  return NextResponse.next();
}
