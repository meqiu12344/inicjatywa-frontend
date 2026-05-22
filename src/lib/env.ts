const DEFAULT_BACKEND_URL = 'https://api-test.inicjatywakatolicka.pl';

function stripWrappingQuotes(value: string): string {
  return value.replace(/^['"]|['"]$/g, '');
}

export function getBackendUrl(): string {
  const rawValue = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;
  if (!rawValue) {
    return DEFAULT_BACKEND_URL;
  }

  const normalized = stripWrappingQuotes(rawValue.trim()).replace(/\/+$/, '');
  return normalized || DEFAULT_BACKEND_URL;
}

export function getPublicApiBaseUrl(): string {
  const rawValue = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL;
  if (!rawValue) {
    return DEFAULT_BACKEND_URL;
  }

  const normalized = stripWrappingQuotes(rawValue.trim()).replace(/\/+$/, '');
  return normalized || DEFAULT_BACKEND_URL;
}