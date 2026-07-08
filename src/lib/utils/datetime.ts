/**
 * Utilities for handling pasted tag lists and pasted date/time values in event forms.
 */

/**
 * Split a raw string (e.g. a pasted list) into individual tags.
 *
 * Separators: comma, semicolon and newline. Dots are intentionally NOT used as
 * separators so that abbreviations such as "ks. Jan Kowalski" stay intact.
 */
export function splitTags(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[,;\n\r]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

export interface ParsedDateTime {
  /** Date in `yyyy-MM-dd` format (the value expected by <input type="date">) or null. */
  date: string | null;
  /** Time in `HH:mm` format (the value expected by <input type="time">) or null. */
  time: string | null;
}

/**
 * Parse a pasted string into a date and/or time.
 *
 * Supported date formats:
 *  - ISO:        2026-07-06
 *  - Day-first:  06.07.2026 / 06/07/2026 / 06-07-2026
 * An optional time part (HH:mm or HH:mm:ss) separated by a space or `T` is also
 * extracted, so pasting e.g. "06.07.2026 18:30" fills both the date and the time.
 */
export function parsePastedDateTime(raw: string): ParsedDateTime {
  const text = (raw || '').trim();
  if (!text) return { date: null, time: null };

  let date: string | null = null;
  let time: string | null = null;

  // Time part: HH:mm optionally with seconds.
  const timeMatch = text.match(/(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (timeMatch) {
    const h = parseInt(timeMatch[1], 10);
    const m = parseInt(timeMatch[2], 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }

  // ISO date (year first).
  const iso = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const y = iso[1];
    const mo = iso[2].padStart(2, '0');
    const d = iso[3].padStart(2, '0');
    if (isValidYmd(y, mo, d)) {
      date = `${y}-${mo}-${d}`;
    }
  } else {
    // Day-first date: dd.MM.yyyy / dd/MM/yyyy / dd-MM-yyyy
    const dmy = text.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/);
    if (dmy) {
      const d = dmy[1].padStart(2, '0');
      const mo = dmy[2].padStart(2, '0');
      const y = dmy[3];
      if (isValidYmd(y, mo, d)) {
        date = `${y}-${mo}-${d}`;
      }
    }
  }

  return { date, time };
}

function isValidYmd(year: string, month: string, day: string): boolean {
  const mo = parseInt(month, 10);
  const d = parseInt(day, 10);
  return mo >= 1 && mo <= 12 && d >= 1 && d <= 31;
}
