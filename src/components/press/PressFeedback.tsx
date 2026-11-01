'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PressPage } from '@/lib/api/press';

export function Feedback({ error, message }: { error?: string; message?: string }) {
  return (
    <>
      {error && (
        <p className="press-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="press-success" role="status">
          {message}
        </p>
      )}
    </>
  );
}

export function Pages({
  data,
  page,
  setPage,
}: {
  data?: PressPage<unknown>;
  page: number;
  setPage: (page: number) => void;
}) {
  if (!data || (!data.next && !data.previous)) return null;
  return (
    <nav className="press-pagination" aria-label="Strony wyników">
      <button
        title="Poprzednia strona"
        aria-label="Poprzednia strona"
        disabled={!data.previous}
        onClick={() => setPage(page - 1)}
      >
        <ChevronLeft size={18} />
      </button>
      <span>
        Strona {page} · {data.count} wyników
      </span>
      <button
        title="Następna strona"
        aria-label="Następna strona"
        disabled={!data.next}
        onClick={() => setPage(page + 1)}
      >
        <ChevronRight size={18} />
      </button>
    </nav>
  );
}
