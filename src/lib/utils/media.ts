/**
 * Cache-busting helpers for user-uploaded media (logo, avatar).
 *
 * Some backends serve media with long/immutable cache headers, or reuse the
 * same filename after an upload. A stale image would then keep showing even
 * after a successful edit. Appending a version token that changes whenever the
 * underlying record is refetched forces the browser to load the fresh image,
 * while still allowing normal caching between refetches.
 */
export function bustCache(url: string | null | undefined, version?: number | string | null): string | null {
  if (!url) return null;
  if (version === undefined || version === null || version === '') return url;
  // Data URLs / blobs are already unique — never touch them.
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${version}`;
}
